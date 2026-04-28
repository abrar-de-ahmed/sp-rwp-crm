import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth } from '@/lib/auth-helpers';
import { createAuditLog } from '@/lib/audit';

// ──────────────────────────────────────
// GET /api/leads/[id] — Get single lead with all relations
// ──────────────────────────────────────
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await requireAuth();
    const { id } = await params;

    const lead = await db.lead.findUnique({
      where: { id },
      include: {
        assignedRep: {
          select: { id: true, name: true, email: true },
        },
        calls: {
          orderBy: { callTimestamp: 'desc' },
          include: {
            rep: {
              select: { id: true, name: true },
            },
          },
        },
        conversations: {
          orderBy: { timestamp: 'desc' },
          include: {
            sender: {
              select: { id: true, name: true },
            },
          },
        },
        followUps: {
          orderBy: { dueDatetime: 'desc' },
          include: {
            assignedTo: {
              select: { id: true, name: true },
            },
            escalatedTo: {
              select: { id: true, name: true },
            },
          },
        },
        memberships: {
          orderBy: { createdAt: 'desc' },
          include: {
            rep: {
              select: { id: true, name: true },
            },
          },
        },
      },
    });

    if (!lead) {
      return NextResponse.json(
        { error: 'Lead not found' },
        { status: 404 },
      );
    }

    // Role check: reps can only view their own leads
    if (session.user.role === 'SALES_REP' && lead.assignedRepId !== session.user.id) {
      return NextResponse.json(
        { error: 'You do not have permission to view this lead' },
        { status: 403 },
      );
    }

    return NextResponse.json({ lead });
  } catch (error) {
    if (error instanceof Response) return error;
    return NextResponse.json(
      { error: 'Failed to fetch lead' },
      { status: 500 },
    );
  }
}

// ──────────────────────────────────────
// PUT /api/leads/[id] — Update lead
// ──────────────────────────────────────
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await requireAuth();
    const { id } = await params;
    const body = await request.json();

    // Fetch existing lead
    const existingLead = await db.lead.findUnique({ where: { id } });

    if (!existingLead) {
      return NextResponse.json(
        { error: 'Lead not found' },
        { status: 404 },
      );
    }

    // Role check: reps can only update their own leads
    if (session.user.role === 'SALES_REP' && existingLead.assignedRepId !== session.user.id) {
      return NextResponse.json(
        { error: 'You do not have permission to update this lead' },
        { status: 403 },
      );
    }

    // Define updatable fields
    const updatableFields = [
      'firstName', 'lastName', 'phone', 'email', 'whatsappNumber',
      'source', 'leadType', 'interestedFacilities', 'leadScore',
      'temperature', 'status', 'familySize', 'budgetRange',
      'tags', 'metaAdCampaign',
    ] as const;

    const updateData: Record<string, unknown> = {};
    const changes: Array<{ field: string; oldVal: string; newVal: string }> = [];

    for (const field of updatableFields) {
      if (body[field] !== undefined && body[field] !== existingLead[field as keyof typeof existingLead]) {
        const oldVal = String(existingLead[field as keyof typeof existingLead] ?? '');
        let newVal = body[field];

        // Serialize JSON fields
        if (field === 'interestedFacilities' || field === 'tags') {
          newVal = JSON.stringify(newVal);
        }

        updateData[field] = newVal;
        changes.push({ field, oldVal, newVal: String(newVal) });
      }
    }

    // Handle assignedRepId (only admin/super admin can change)
    if (body.assignedRepId !== undefined && body.assignedRepId !== existingLead.assignedRepId) {
      if (session.user.role === 'SALES_REP') {
        return NextResponse.json(
          { error: 'Sales reps cannot reassign leads' },
          { status: 403 },
        );
      }

      updateData.assignedRepId = body.assignedRepId;
      changes.push({
        field: 'assignedRepId',
        oldVal: existingLead.assignedRepId ?? 'Unassigned',
        newVal: body.assignedRepId,
      });
    }

    // Handle lostReason
    if (body.lostReason !== undefined) {
      updateData.lostReason = body.lostReason;
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: 'No changes to update' },
        { status: 400 },
      );
    }

    // Update the lead
    const updatedLead = await db.lead.update({
      where: { id },
      data: updateData,
    });

    // Create audit log entries for each changed field
    for (const change of changes) {
      await createAuditLog({
        actorType: session.user.role,
        actorId: session.user.id,
        actorName: session.user.name,
        entityType: 'LEAD',
        entityId: id,
        action: 'UPDATE',
        fieldChanged: change.field,
        oldValue: change.oldVal,
        newValue: change.newVal,
        remarks: `Updated ${change.field}: ${change.oldVal} → ${change.newVal}`,
      });
    }

    // If status changed, create a status change audit log
    const statusChange = changes.find(c => c.field === 'status');
    if (statusChange) {
      await createAuditLog({
        actorType: session.user.role,
        actorId: session.user.id,
        actorName: session.user.name,
        entityType: 'LEAD',
        entityId: id,
        action: 'STATUS_CHANGE',
        remarks: `Status changed: ${statusChange.oldVal} → ${statusChange.newVal}`,
      });
    }

    return NextResponse.json({ lead: updatedLead });
  } catch (error) {
    if (error instanceof Response) return error;
    return NextResponse.json(
      { error: 'Failed to update lead' },
      { status: 500 },
    );
  }
}

// ──────────────────────────────────────
// DELETE /api/leads/[id] — Soft delete (Super Admin only)
// ──────────────────────────────────────
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await requireAuth();

    // Only Super Admin can delete leads
    if (session.user.role !== 'SUPER_ADMIN') {
      return NextResponse.json(
        { error: 'Only Super Admin can delete leads' },
        { status: 403 },
      );
    }

    const { id } = await params;

    const lead = await db.lead.findUnique({ where: { id } });

    if (!lead) {
      return NextResponse.json(
        { error: 'Lead not found' },
        { status: 404 },
      );
    }

    // Soft delete: mark as LOST with reason DELETED
    const deletedLead = await db.lead.update({
      where: { id },
      data: {
        status: 'LOST',
        lostReason: 'DELETED',
      },
    });

    await createAuditLog({
      actorType: session.user.role,
      actorId: session.user.id,
      actorName: session.user.name,
      entityType: 'LEAD',
      entityId: id,
      action: 'DELETE',
      oldValue: lead.status,
      newValue: 'LOST',
      remarks: `Lead soft-deleted by ${session.user.name}`,
    });

    return NextResponse.json({ lead: deletedLead });
  } catch (error) {
    if (error instanceof Response) return error;
    return NextResponse.json(
      { error: 'Failed to delete lead' },
      { status: 500 },
    );
  }
}
