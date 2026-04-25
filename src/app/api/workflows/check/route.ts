import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth-helpers';
import { createAuditLog } from '@/lib/audit';
import {
  checkOverdueFollowUps,
  checkIdleConversations,
} from '@/lib/workflow-engine';

// ──────────────────────────────────────
// POST /api/workflows/check — Manual workflow trigger
// ──────────────────────────────────────
// Access: ADMIN and SUPER_ADMIN
// Body: { type: 'overdue_followups' | 'idle_conversations' }
//
// Runs scheduled checks manually instead of waiting for a cron job.
// Returns the count of items processed.
// ──────────────────────────────────────

const VALID_TYPES = ['overdue_followups', 'idle_conversations'] as const;

export async function POST(request: NextRequest) {
  try {
    const session = await requireRole('ADMIN');
    const body = await request.json();
    const { type } = body;

    if (!type || !VALID_TYPES.includes(type)) {
      return NextResponse.json(
        { error: `Invalid type. Must be one of: ${VALID_TYPES.join(', ')}` },
        { status: 400 },
      );
    }

    let count = 0;
    let label = '';

    switch (type) {
      case 'overdue_followups': {
        count = await checkOverdueFollowUps();
        label = 'overdue follow-ups processed';
        break;
      }

      case 'idle_conversations': {
        count = await checkIdleConversations();
        label = 'idle conversations processed';
        break;
      }
    }

    // Audit log
    await createAuditLog({
      actorType: session.user.role,
      actorId: session.user.id,
      actorName: session.user.name,
      entityType: 'SETTING',
      action: 'CREATE',
      remarks: `Manually triggered workflow check: ${type} — ${count} ${label}`,
    });

    return NextResponse.json({
      success: true,
      type,
      count,
      message: `${count} ${label}`,
    });
  } catch (error) {
    if (error instanceof Response) return error;
    return NextResponse.json(
      { error: 'Failed to run workflow check' },
      { status: 500 },
    );
  }
}
