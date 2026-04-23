import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth } from '@/lib/auth-helpers';
import { createAuditLog } from '@/lib/audit';

// ──────────────────────────────────────
// POST /api/leads/[id]/remarks — Add remark to lead
// ──────────────────────────────────────
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await requireAuth();
    const { id } = await params;
    const body = await request.json();
    const { remark } = body;

    if (!remark?.trim()) {
      return NextResponse.json(
        { error: 'Remark text is required' },
        { status: 400 },
      );
    }

    // Fetch existing lead
    const lead = await db.lead.findUnique({ where: { id } });

    if (!lead) {
      return NextResponse.json(
        { error: 'Lead not found' },
        { status: 404 },
      );
    }

    // Role check: reps can only add remarks to their own leads
    if (session.user.role === 'SALES_REP' && lead.assignedRepId !== session.user.id) {
      return NextResponse.json(
        { error: 'You do not have permission to update this lead' },
        { status: 403 },
      );
    }

    // Build new remark entry with timestamp
    const timestamp = new Date().toISOString();
    const newRemarkEntry = `[${timestamp}] ${session.user.name}: ${remark.trim()}`;

    // Append to existing remarks
    const existingRemarks = lead.remarks ? lead.remarks.trim() : '';
    const updatedRemarks = existingRemarks
      ? `${existingRemarks}\n${newRemarkEntry}`
      : newRemarkEntry;

    // Update lead
    const updatedLead = await db.lead.update({
      where: { id },
      data: { remarks: updatedRemarks },
    });

    // Create audit log
    await createAuditLog({
      actorType: session.user.role,
      actorId: session.user.id,
      actorName: session.user.name,
      entityType: 'LEAD',
      entityId: id,
      action: 'UPDATE',
      fieldChanged: 'remarks',
      remarks: `Added remark: ${remark.trim().slice(0, 100)}`,
    });

    return NextResponse.json({ lead: updatedLead, remark: newRemarkEntry });
  } catch (error) {
    if (error instanceof Response) return error;
    return NextResponse.json(
      { error: 'Failed to add remark' },
      { status: 500 },
    );
  }
}
