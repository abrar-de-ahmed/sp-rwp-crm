import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth } from '@/lib/auth-helpers';
import { createAuditLog } from '@/lib/audit';

// ──────────────────────────────────────
// PUT /api/followups/[id] — Update follow-up status
// ──────────────────────────────────────

const VALID_STATUSES = ['PENDING', 'COMPLETED', 'MISSED', 'ESCALATED'];
const VALID_TRANSITIONS: Record<string, string[]> = {
  PENDING: ['COMPLETED', 'MISSED', 'ESCALATED'],
  MISSED: ['COMPLETED', 'ESCALATED'],
  ESCALATED: ['COMPLETED'],
  COMPLETED: [],
};

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await requireAuth();
    const { id } = await params;
    const body = await request.json();

    const { status, completionNotes, escalatedToId, dueDatetime } = body;

    // Fetch existing follow-up
    const followUp = await db.followUp.findUnique({
      where: { id },
      include: {
        lead: { select: { id: true, firstName: true, lastName: true } },
        assignedTo: { select: { id: true, name: true } },
      },
    });

    if (!followUp) {
      return NextResponse.json(
        { error: 'Follow-up not found' },
        { status: 404 },
      );
    }

    // Role check: reps can only update their own follow-ups
    if (session.user.role === 'SALES_REP' && followUp.assignedToId !== session.user.id) {
      return NextResponse.json(
        { error: 'You do not have permission to update this follow-up' },
        { status: 403 },
      );
    }

    const oldStatus = followUp.status;

    // Build update data
    const updateData: Record<string, unknown> = {};

    // Handle status change
    if (status && status !== oldStatus) {
      if (!VALID_STATUSES.includes(status)) {
        return NextResponse.json(
          { error: `Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}` },
          { status: 400 },
        );
      }

      const allowedTransitions = VALID_TRANSITIONS[oldStatus] ?? [];
      if (!allowedTransitions.includes(status)) {
        return NextResponse.json(
          { error: `Cannot transition from ${oldStatus} to ${status}. Allowed: ${allowedTransitions.join(', ') || 'none'}` },
          { status: 400 },
        );
      }

      updateData.status = status;

      if (status === 'COMPLETED') {
        updateData.completedAt = new Date();
        updateData.completionNotes = completionNotes?.trim() || null;
      }

      if (status === 'ESCALATED') {
        if (escalatedToId) {
          const targetUser = await db.user.findUnique({
            where: { id: escalatedToId },
          });
          if (!targetUser) {
            return NextResponse.json(
              { error: 'Escalation target user not found' },
              { status: 404 },
            );
          }
          updateData.escalatedToId = escalatedToId;
        }
        updateData.escalatedAt = new Date();
      }
    }

    // Handle snooze (reschedule due date)
    if (dueDatetime && !status) {
      updateData.dueDatetime = new Date(dueDatetime);
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: 'No valid update fields provided' },
        { status: 400 },
      );
    }

    // Update the follow-up
    const updatedFollowUp = await db.followUp.update({
      where: { id },
      data: updateData,
    });

    // Create audit log
    if (status && status !== oldStatus) {
      await createAuditLog({
        actorType: session.user.role,
        actorId: session.user.id,
        actorName: session.user.name,
        entityType: 'FOLLOW_UP',
        entityId: id,
        action: 'STATUS_CHANGE',
        fieldChanged: 'status',
        oldValue: oldStatus,
        newValue: status,
        remarks: status === 'COMPLETED'
          ? `Follow-up completed for ${followUp.lead.firstName} ${followUp.lead.lastName}. Notes: ${completionNotes || 'none'}`
          : status === 'MISSED'
            ? `Follow-up missed for ${followUp.lead.firstName} ${followUp.lead.lastName}`
            : `Follow-up escalated for ${followUp.lead.firstName} ${followUp.lead.lastName}`,
      });
    }

    if (dueDatetime && !status) {
      await createAuditLog({
        actorType: session.user.role,
        actorId: session.user.id,
        actorName: session.user.name,
        entityType: 'FOLLOW_UP',
        entityId: id,
        action: 'UPDATE',
        fieldChanged: 'dueDatetime',
        oldValue: followUp.dueDatetime.toISOString(),
        newValue: new Date(dueDatetime).toISOString(),
        remarks: `Follow-up rescheduled for ${followUp.lead.firstName} ${followUp.lead.lastName}`,
      });
    }

    // If escalated, create notification
    if (status === 'ESCALATED' && escalatedToId) {
      await db.notification.create({
        data: {
          userId: escalatedToId,
          type: 'ESCALATION',
          title: 'Follow-Up Escalated',
          message: `Follow-up for ${followUp.lead.firstName} ${followUp.lead.lastName} has been escalated by ${session.user.name}`,
          sentVia: 'IN_APP',
        },
      });
    }

    return NextResponse.json({ followUp: updatedFollowUp });
  } catch (error) {
    if (error instanceof Response) return error;
    return NextResponse.json(
      { error: 'Failed to update follow-up' },
      { status: 500 },
    );
  }
}
