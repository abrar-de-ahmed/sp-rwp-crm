import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth-helpers';
import { createAuditLog } from '@/lib/audit';
import { getActiveWorkflows, toggleWorkflow } from '@/lib/workflow-engine';

// ──────────────────────────────────────
// GET /api/workflows — List all workflows
// ──────────────────────────────────────
// Access: SUPER_ADMIN only
// Returns all workflows with their current enabled state.
// ──────────────────────────────────────

export async function GET() {
  try {
    const session = await requireRole('SUPER_ADMIN');

    const workflows = getActiveWorkflows();

    return NextResponse.json({
      workflows,
      total: workflows.length,
      enabledCount: workflows.filter((w) => w.enabled).length,
    });
  } catch (error) {
    if (error instanceof Response) return error;
    return NextResponse.json(
      { error: 'Failed to fetch workflows' },
      { status: 500 },
    );
  }
}

// ──────────────────────────────────────
// PUT /api/workflows — Toggle a workflow
// ──────────────────────────────────────
// Access: SUPER_ADMIN only
// Body: { workflowId: string, enabled: boolean }
// ──────────────────────────────────────

export async function PUT(request: NextRequest) {
  try {
    const session = await requireRole('SUPER_ADMIN');
    const body = await request.json();

    const { workflowId, enabled } = body;

    if (!workflowId || typeof workflowId !== 'string') {
      return NextResponse.json(
        { error: 'workflowId is required' },
        { status: 400 },
      );
    }

    if (typeof enabled !== 'boolean') {
      return NextResponse.json(
        { error: 'enabled must be a boolean' },
        { status: 400 },
      );
    }

    const success = toggleWorkflow(workflowId, enabled);

    if (!success) {
      return NextResponse.json(
        { error: `Workflow "${workflowId}" not found` },
        { status: 404 },
      );
    }

    // Audit log
    await createAuditLog({
      actorType: session.user.role,
      actorId: session.user.id,
      actorName: session.user.name,
      entityType: 'SETTING',
      entityId: workflowId,
      action: 'UPDATE',
      fieldChanged: 'enabled',
      oldValue: String(!enabled),
      newValue: String(enabled),
      remarks: `${enabled ? 'Enabled' : 'Disabled'} workflow: ${workflowId}`,
    });

    return NextResponse.json({
      success: true,
      workflowId,
      enabled,
      message: `Workflow "${workflowId}" ${enabled ? 'enabled' : 'disabled'}`,
    });
  } catch (error) {
    if (error instanceof Response) return error;
    return NextResponse.json(
      { error: 'Failed to update workflow' },
      { status: 500 },
    );
  }
}
