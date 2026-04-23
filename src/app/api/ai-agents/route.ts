import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth-helpers';
import { createAuditLog } from '@/lib/audit';
import { AI_AGENT_DEFINITIONS, type AIAgentConfig } from '@/lib/ai-agent';

// In-memory config store (for this session / MVP). In production, use DB.
// We keep a mutable copy of the definitions so SUPER_ADMIN can toggle them.
let agentConfigs: AIAgentConfig[] = AI_AGENT_DEFINITIONS.map((a) => ({ ...a }));

// ──────────────────────────────────────
// GET /api/ai-agents — Return all 5 agent configs
// ──────────────────────────────────────
export async function GET() {
  try {
    await requireRole('SALES_REP');
    return NextResponse.json({
      agents: agentConfigs.map((a) => ({
        id: a.id,
        name: a.name,
        description: a.description,
        capabilities: a.capabilities,
        enabled: a.defaultEnabled,
      })),
    });
  } catch (error) {
    if (error instanceof Response) return error;
    return NextResponse.json(
      { error: 'Failed to fetch agent configs' },
      { status: 500 },
    );
  }
}

// ──────────────────────────────────────
// PUT /api/ai-agents — Update agent config (SUPER_ADMIN only)
// ──────────────────────────────────────
export async function PUT(request: NextRequest) {
  try {
    const session = await requireRole('SUPER_ADMIN');
    const body = await request.json();

    const { agentId, enabled, systemPrompt, temperature, maxTokens } = body;

    if (!agentId || typeof agentId !== 'number') {
      return NextResponse.json(
        { error: 'agentId (number) is required' },
        { status: 400 },
      );
    }

    const idx = agentConfigs.findIndex((a) => a.id === agentId);
    if (idx === -1) {
      return NextResponse.json(
        { error: 'Agent not found' },
        { status: 404 },
      );
    }

    const oldEnabled = agentConfigs[idx].defaultEnabled;

    // Update allowed fields
    if (typeof enabled === 'boolean') {
      agentConfigs[idx].defaultEnabled = enabled;
    }
    if (typeof systemPrompt === 'string' && systemPrompt.trim()) {
      agentConfigs[idx].systemPrompt = systemPrompt.trim();
    }
    if (typeof temperature === 'number') {
      agentConfigs[idx].temperature = Math.max(0, Math.min(2, temperature));
    }
    if (typeof maxTokens === 'number') {
      agentConfigs[idx].maxTokens = Math.max(50, Math.min(4000, maxTokens));
    }

    // Audit log
    await createAuditLog({
      actorType: session.user.role,
      actorId: session.user.id,
      actorName: session.user.name,
      entityType: 'SETTING',
      entityId: `agent_${agentId}`,
      action: 'UPDATE',
      fieldChanged: 'ai_agent_config',
      oldValue: `enabled: ${oldEnabled}`,
      newValue: `enabled: ${agentConfigs[idx].defaultEnabled}`,
      remarks: `Updated config for AI Agent: ${agentConfigs[idx].name}`,
    });

    return NextResponse.json({
      agent: {
        id: agentConfigs[idx].id,
        name: agentConfigs[idx].name,
        enabled: agentConfigs[idx].defaultEnabled,
      },
    });
  } catch (error) {
    if (error instanceof Response) return error;
    return NextResponse.json(
      { error: 'Failed to update agent config' },
      { status: 500 },
    );
  }
}
