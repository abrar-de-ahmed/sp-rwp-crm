import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth } from '@/lib/auth-helpers';
import { createAuditLog } from '@/lib/audit';
import { executeWorkflows } from '@/lib/workflow-engine';

// ──────────────────────────────────────
// PUT /api/leads/[id]/status — Update lead status
// ──────────────────────────────────────

const STATUS_TEMPERATURE_MAP: Record<string, string> = {
  CONTACTED: 'WARM',
  INTERESTED: 'HOT',
  NEGOTIATION: 'HOT',
  BOOKED: 'WARM',
  LOST: 'COLD',
  RECOVERED: 'WARM',
};

const VALID_STATUSES = ['NEW', 'CONTACTED', 'INTERESTED', 'NEGOTIATION', 'BOOKED', 'LOST', 'RECOVERED'];
const LOST_REASONS = ['NOT_INTERESTED', 'WRONG_NUMBER', 'UNREACHABLE', 'WENT_COMPETITOR', 'BUDGET', 'OTHER'];

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await requireAuth();
    const { id } = await params;
    const body = await request.json();
    const { status, lostReason } = body;

    if (!status || !VALID_STATUSES.includes(status)) {
      return NextResponse.json(
        { error: `Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}` },
        { status: 400 },
      );
    }

    // If LOST, require lostReason
    if (status === 'LOST') {
      if (!lostReason || !LOST_REASONS.includes(lostReason)) {
        return NextResponse.json(
          { error: `lostReason is required when marking as LOST. Must be one of: ${LOST_REASONS.join(', ')}` },
          { status: 400 },
        );
      }
    }

    // Fetch existing lead
    const lead = await db.lead.findUnique({
      where: { id },
      include: {
        assignedRep: {
          select: { id: true, name: true },
        },
      },
    });

    if (!lead) {
      return NextResponse.json(
        { error: 'Lead not found' },
        { status: 404 },
      );
    }

    // Role check: reps can only update their own leads
    if (session.user.role === 'SALES_REP' && lead.assignedRepId !== session.user.id) {
      return NextResponse.json(
        { error: 'You do not have permission to update this lead' },
        { status: 403 },
      );
    }

    const oldStatus = lead.status;

    // Build update data
    const updateData: Record<string, unknown> = {
      status,
      lostReason: status === 'LOST' ? lostReason : (status !== 'LOST' ? null : lead.lostReason),
    };

    // Auto-update temperature based on status change
    const newTemperature = STATUS_TEMPERATURE_MAP[status];
    if (newTemperature) {
      updateData.temperature = newTemperature;
    }

    // Update the lead
    const updatedLead = await db.lead.update({
      where: { id },
      data: updateData,
    });

    // Create status change audit log
    await createAuditLog({
      actorType: session.user.role,
      actorId: session.user.id,
      actorName: session.user.name,
      entityType: 'LEAD',
      entityId: id,
      action: 'STATUS_CHANGE',
      fieldChanged: 'status',
      oldValue: oldStatus,
      newValue: status,
      remarks: status === 'LOST'
        ? `Status changed to LOST. Reason: ${lostReason}`
        : `Status changed: ${oldStatus} → ${status}`,
    });

    // If temperature changed, log it
    if (newTemperature && newTemperature !== lead.temperature) {
      await createAuditLog({
        actorType: session.user.role,
        actorId: session.user.id,
        actorName: session.user.name,
        entityType: 'LEAD',
        entityId: id,
        action: 'UPDATE',
        fieldChanged: 'temperature',
        oldValue: lead.temperature,
        newValue: newTemperature,
        remarks: `Temperature auto-updated with status change: ${lead.temperature} → ${newTemperature}`,
      });
    }

    // If BOOKED, create notification for the assigned rep
    if (status === 'BOOKED' && lead.assignedRepId) {
      await db.notification.create({
        data: {
          userId: lead.assignedRepId,
          type: 'SYSTEM_ALERT',
          title: 'Lead Booked!',
          message: `${lead.firstName} ${lead.lastName} has been marked as BOOKED.`,
          link: `leads:${id}`,
          sentVia: 'IN_APP',
        },
      });
    }

    // Trigger workflow: status change actions (follow-ups, notifications, etc.)
    executeWorkflows('LEAD_STATUS_CHANGED', {
      lead: updatedLead,
      oldStatus,
      newStatus: status,
    }).catch((err) => {
      console.error('[Workflow] LEAD_STATUS_CHANGED trigger failed:', err);
    });

    return NextResponse.json({ lead: updatedLead });
  } catch (error) {
    if (error instanceof Response) return error;
    return NextResponse.json(
      { error: 'Failed to update lead status' },
      { status: 500 },
    );
  }
}
