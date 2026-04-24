// ═══════════════════════════════════════════════════════════════
// SP RWP CRM — Workflow Automation Engine
// ═══════════════════════════════════════════════════════════════
// Event-driven workflow system that automatically triggers actions
// based on CRM events (lead creation, status changes, overdue
// follow-ups, etc.).
//
// Each workflow has:
//   - trigger: the event that fires it
//   - condition: optional filter on event data
//   - actions: ordered list of side-effects to execute
//
// All actions are wrapped in individual try/catch — one failure
// never stops other actions or the calling code.
// ═══════════════════════════════════════════════════════════════

import { db } from '@/lib/db';
import { calculateLeadScore } from '@/lib/ai-agent';
import {
  sendWelcomeEmail,
  sendFollowUpReminder,
  sendEscalationAlert,
  sendLeadAssignmentNotification,
} from '@/lib/email';

// ──────────────────────────────────────
// Type Definitions
// ──────────────────────────────────────

/** All possible trigger types that can initiate a workflow. */
export type TriggerType =
  | 'LEAD_CREATED'
  | 'LEAD_STATUS_CHANGED'
  | 'LEAD_SCORE_CHANGED'
  | 'FOLLOW_UP_CREATED'
  | 'FOLLOW_UP_DUE'
  | 'FOLLOW_UP_OVERDUE'
  | 'FOLLOW_UP_ESCALATED'
  | 'NEW_CONVERSATION'
  | 'CONVERSATION_IDLE'
  | 'CALL_COMPLETED'
  | 'AI_INSIGHT_CREATED';

/** Supported action types within a workflow. */
type ActionType =
  | 'SCORE_LEAD'
  | 'SET_TEMPERATURE'
  | 'CREATE_NOTIFICATION'
  | 'CREATE_FOLLOW_UP'
  | 'SEND_EMAIL'
  | 'ESCALATE_FOLLOW_UP';

/** Condition that must be met for a workflow to fire. */
interface WorkflowCondition {
  field: string;
  operator: 'equals' | 'not_equals' | 'less_than' | 'greater_than';
  value: string | number;
}

/** Configuration for an individual action within a workflow. */
interface WorkflowAction {
  type: ActionType;
  description?: string;
  config?: Record<string, unknown>;
}

/** A complete workflow definition. */
export interface Workflow {
  id: string;
  name: string;
  trigger: TriggerType;
  condition?: WorkflowCondition;
  enabled: boolean;
  actions: WorkflowAction[];
}

/** Data payload passed when triggering workflows. */
export interface WorkflowTriggerData {
  lead?: {
    id: string;
    firstName: string;
    lastName: string;
    phone: string;
    email?: string | null;
    source?: string;
    leadScore?: number;
    temperature?: string;
    status?: string;
    assignedRepId?: string | null;
    interestedFacilities?: string;
    budgetRange?: string | null;
    conversationHistory?: string;
  };
  followUp?: {
    id: string;
    leadId: string;
    assignedToId: string;
    dueDatetime: Date;
    priority: string;
    status: string;
    reason?: string | null;
  };
  conversation?: {
    id: string;
    leadId: string;
    channel: string;
    direction: string;
    messageText: string;
    timestamp: Date;
  };
  call?: {
    id: string;
    leadId: string;
    repId: string;
    outcome: string;
    sentiment?: string | null;
  };
  insight?: {
    id: string;
    agentId: number;
    insightType: string;
    description: string;
    confidenceScore: number;
  };
  oldStatus?: string;
  newStatus?: string;
  oldScore?: number;
  newScore?: number;
}

// ──────────────────────────────────────
// Default Workflows
// ──────────────────────────────────────

const DEFAULT_WORKFLOWS: Workflow[] = [
  {
    id: 'auto_score_new_lead',
    name: 'Auto-Score New Leads',
    trigger: 'LEAD_CREATED',
    enabled: true,
    actions: [
      { type: 'SCORE_LEAD', description: 'Calculate lead score using rule-based + AI' },
      { type: 'SET_TEMPERATURE', description: 'Set temperature based on score (80+ HOT, 40+ WARM, else COLD)' },
      { type: 'CREATE_NOTIFICATION', config: { type: 'NEW_LEAD', forRole: 'SUPER_ADMIN' } },
      { type: 'SEND_EMAIL', config: { template: 'lead_assignment', toRole: 'assigned_rep' } },
    ],
  },
  {
    id: 'contacted_followup',
    name: 'Create Follow-Up for CONTACTED Leads',
    trigger: 'LEAD_STATUS_CHANGED',
    condition: { field: 'newStatus', operator: 'equals', value: 'CONTACTED' },
    enabled: true,
    actions: [
      { type: 'CREATE_FOLLOW_UP', config: { hours: 24, priority: 'NORMAL', reason: 'Auto-follow-up after initial contact' } },
      { type: 'SEND_EMAIL', config: { template: 'followup_reminder', toRole: 'assigned_rep' } },
    ],
  },
  {
    id: 'interested_fast_followup',
    name: 'Fast Follow-Up for INTERESTED Leads',
    trigger: 'LEAD_STATUS_CHANGED',
    condition: { field: 'newStatus', operator: 'equals', value: 'INTERESTED' },
    enabled: true,
    actions: [
      { type: 'CREATE_FOLLOW_UP', config: { hours: 4, priority: 'HIGH', reason: 'Hot lead showed interest - fast follow-up needed' } },
      { type: 'SET_TEMPERATURE', config: { temperature: 'HOT' } },
      { type: 'CREATE_NOTIFICATION', config: { type: 'SYSTEM_ALERT', forRole: 'assigned_rep', message: 'Lead showed interest! Follow up within 4 hours.' } },
    ],
  },
  {
    id: 'overdue_escalation',
    name: 'Escalate Overdue Follow-Ups',
    trigger: 'FOLLOW_UP_OVERDUE',
    enabled: true,
    actions: [
      { type: 'ESCALATE_FOLLOW_UP', description: 'Mark follow-up as ESCALATED' },
      { type: 'CREATE_NOTIFICATION', config: { type: 'ESCALATION', forRole: 'SUPER_ADMIN' } },
      { type: 'SEND_EMAIL', config: { template: 'escalation', toRole: 'super_admin' } },
    ],
  },
  {
    id: 'new_conversation_notify',
    name: 'Notify Rep on New Conversation',
    trigger: 'NEW_CONVERSATION',
    enabled: true,
    actions: [
      { type: 'CREATE_NOTIFICATION', config: { type: 'SYSTEM_ALERT', forRole: 'assigned_rep', message: 'New message received from lead.' } },
    ],
  },
  {
    id: 'booked_celebration',
    name: 'Lead BOOKED - Notify Team',
    trigger: 'LEAD_STATUS_CHANGED',
    condition: { field: 'newStatus', operator: 'equals', value: 'BOOKED' },
    enabled: true,
    actions: [
      { type: 'CREATE_NOTIFICATION', config: { type: 'SYSTEM_ALERT', forRole: 'all_admins', message: 'Lead converted to BOOKED!' } },
      { type: 'CREATE_FOLLOW_UP', config: { hours: 168, priority: 'LOW', reason: 'Check-in 1 week after booking (onboarding)' } },
    ],
  },
  {
    id: 'lost_recovery',
    name: 'Lead LOST - Schedule Recovery',
    trigger: 'LEAD_STATUS_CHANGED',
    condition: { field: 'newStatus', operator: 'equals', value: 'LOST' },
    enabled: true,
    actions: [
      { type: 'SET_TEMPERATURE', config: { temperature: 'COLD' } },
      { type: 'CREATE_FOLLOW_UP', config: { hours: 336, priority: 'LOW', reason: 'Recovery attempt - reach out after 2 weeks' } },
      { type: 'CREATE_NOTIFICATION', config: { type: 'SYSTEM_ALERT', forRole: 'assigned_rep', message: 'Lead was marked as lost. Recovery follow-up scheduled.' } },
    ],
  },
  {
    id: 'cold_score_drop',
    name: 'Alert on Score Drop Below 30',
    trigger: 'LEAD_SCORE_CHANGED',
    condition: { field: 'newScore', operator: 'less_than', value: 30 },
    enabled: true,
    actions: [
      { type: 'SET_TEMPERATURE', config: { temperature: 'COLD' } },
      { type: 'CREATE_NOTIFICATION', config: { type: 'AI_INSIGHT', forRole: 'assigned_rep', message: 'Lead engagement score dropped significantly.' } },
    ],
  },
];

// ──────────────────────────────────────
// Runtime State
// ──────────────────────────────────────

/**
 * In-memory overrides for workflow enabled/disabled state.
 * This allows the PUT /api/workflows endpoint to toggle workflows
 * without persisting to a database table. If the server restarts,
 * defaults are restored (which is acceptable for this MVP).
 */
const workflowOverrides: Map<string, boolean> = new Map();

// ──────────────────────────────────────
// Public API
// ──────────────────────────────────────

/**
 * Get all workflows with their current enabled state (defaults + overrides).
 */
export function getActiveWorkflows(): Workflow[] {
  return DEFAULT_WORKFLOWS.map((w) => ({
    ...w,
    enabled: workflowOverrides.has(w.id) ? workflowOverrides.get(w.id)! : w.enabled,
  }));
}

/**
 * Toggle a workflow's enabled state by ID.
 * Returns true if the workflow was found and toggled.
 */
export function toggleWorkflow(workflowId: string, enabled: boolean): boolean {
  const workflow = DEFAULT_WORKFLOWS.find((w) => w.id === workflowId);
  if (!workflow) return false;
  workflowOverrides.set(workflowId, enabled);
  console.log(`[Workflow] ${workflowId} ${enabled ? 'ENABLED' : 'DISABLED'}`);
  return true;
}

/**
 * Execute all workflows matching a given trigger type.
 *
 * This is the main entry point — call from API routes after creating
 * or updating entities.
 *
 * @param triggerType - The event that triggered the workflow
 * @param data - Contextual data about the event
 */
export async function executeWorkflows(
  triggerType: TriggerType,
  data: WorkflowTriggerData,
): Promise<void> {
  const workflows = getActiveWorkflows().filter(
    (w) => w.trigger === triggerType && w.enabled,
  );

  if (workflows.length === 0) {
    console.log(`[Workflow] No active workflows for trigger: ${triggerType}`);
    return;
  }

  console.log(`[Workflow] Executing ${workflows.length} workflow(s) for trigger: ${triggerType}`);

  for (const workflow of workflows) {
    try {
      // Check condition if present
      if (workflow.condition && !evaluateCondition(workflow.condition, data)) {
        console.log(`[Workflow] "${workflow.name}" condition not met — skipping`);
        continue;
      }

      console.log(`[Workflow] Running: "${workflow.name}"`);

      // Execute each action sequentially
      for (let i = 0; i < workflow.actions.length; i++) {
        const action = workflow.actions[i];
        try {
          await executeAction(action, data, workflow.id);
        } catch (actionError) {
          console.error(
            `[Workflow] Action ${i + 1} (${action.type}) failed in "${workflow.name}":`,
            actionError,
          );
          // Continue to next action — one failure doesn't stop others
        }
      }

      console.log(`[Workflow] Completed: "${workflow.name}"`);
    } catch (workflowError) {
      console.error(`[Workflow] Error in "${workflow.name}":`, workflowError);
      // Continue to next workflow
    }
  }
}

// ──────────────────────────────────────
// Condition Evaluation
// ──────────────────────────────────────

/**
 * Evaluate a condition against the trigger data.
 * Returns true if the condition passes (or no condition exists).
 */
function evaluateCondition(
  condition: WorkflowCondition,
  data: WorkflowTriggerData,
): boolean {
  // Map field names to data properties
  const fieldValue = getFieldFromData(condition.field, data);

  if (fieldValue === undefined) {
    return false;
  }

  const expected = condition.value;

  switch (condition.operator) {
    case 'equals':
      return String(fieldValue) === String(expected);
    case 'not_equals':
      return String(fieldValue) !== String(expected);
    case 'less_than':
      return Number(fieldValue) < Number(expected);
    case 'greater_than':
      return Number(fieldValue) > Number(expected);
    default:
      console.warn(`[Workflow] Unknown operator: ${condition.operator}`);
      return false;
  }
}

/**
 * Extract a field value from trigger data by field name.
 */
function getFieldFromData(field: string, data: WorkflowTriggerData): unknown {
  switch (field) {
    case 'newStatus':
      return data.newStatus;
    case 'oldStatus':
      return data.oldStatus;
    case 'newScore':
      return data.newScore;
    case 'oldScore':
      return data.oldScore;
    default:
      // Try nested lead fields
      if (data.lead && field in data.lead) {
        return (data.lead as Record<string, unknown>)[field];
      }
      if (data.followUp && field in data.followUp) {
        return (data.followUp as Record<string, unknown>)[field];
      }
      return undefined;
  }
}

// ──────────────────────────────────────
// Action Execution
// ──────────────────────────────────────

/**
 * Execute a single workflow action.
 */
async function executeAction(
  action: WorkflowAction,
  data: WorkflowTriggerData,
  workflowId: string,
): Promise<void> {
  const lead = data.lead;

  switch (action.type) {
    // ── SCORE_LEAD ────────────────────
    case 'SCORE_LEAD': {
      if (!lead) {
        console.warn('[Workflow] SCORE_LEAD: no lead data provided');
        return;
      }

      console.log(`[Workflow] Scoring lead: ${lead.firstName} ${lead.lastName}`);

      const scoringResult = calculateLeadScore({
        firstName: lead.firstName,
        lastName: lead.lastName,
        source: lead.source,
        budgetRange: lead.budgetRange ?? undefined,
        interestedFacilities: JSON.parse(lead.interestedFacilities ?? '[]'),
        conversationHistory: lead.conversationHistory,
      });

      await db.lead.update({
        where: { id: lead.id },
        data: {
          leadScore: scoringResult.score,
          temperature: scoringResult.temperature,
        },
      });

      console.log(
        `[Workflow] Scored lead ${lead.id}: ${scoringResult.score} (${scoringResult.temperature})`,
      );
      break;
    }

    // ── SET_TEMPERATURE ───────────────
    case 'SET_TEMPERATURE': {
      if (!lead) {
        console.warn('[Workflow] SET_TEMPERATURE: no lead data provided');
        return;
      }

      let temperature: string | undefined;

      // If a specific temperature is in config, use it
      if (action.config?.temperature) {
        temperature = String(action.config.temperature);
      } else if (action.description?.includes('based on score')) {
        // Auto-determine from current score
        const score = lead.leadScore ?? 50;
        temperature = score >= 80 ? 'HOT' : score >= 40 ? 'WARM' : 'COLD';
      }

      if (temperature) {
        await db.lead.update({
          where: { id: lead.id },
          data: { temperature },
        });
        console.log(`[Workflow] Set temperature for lead ${lead.id}: ${temperature}`);
      }
      break;
    }

    // ── CREATE_NOTIFICATION ───────────
    case 'CREATE_NOTIFICATION': {
      const config = action.config ?? {};
      const forRole = String(config.forRole ?? 'SUPER_ADMIN');
      const notifType = String(config.type ?? 'SYSTEM_ALERT');
      const customMessage = String(config.message ?? '');

      const targetUsers = await resolveTargetUsers(forRole, data);

      for (const user of targetUsers) {
        try {
          const leadName = lead
            ? `${lead.firstName} ${lead.lastName}`
            : 'Unknown Lead';

          let title = 'CRM Notification';
          let message = customMessage;

          if (notifType === 'NEW_LEAD') {
            title = `New Lead: ${leadName}`;
            message = customMessage || `A new lead "${leadName}" has been added to the system.`;
          } else if (notifType === 'ESCALATION') {
            title = `Escalation: ${leadName}`;
            message = customMessage || `A follow-up for "${leadName}" has been escalated.`;
          } else if (notifType === 'AI_INSIGHT') {
            title = `AI Insight`;
            message = customMessage || `New AI insight available.`;
          } else if (!customMessage) {
            message = `Workflow "${workflowId}" triggered an alert.`;
          }

          await db.notification.create({
            data: {
              userId: user.id,
              type: notifType,
              title,
              message,
              link: lead ? `leads:${lead.id}` : null,
              sentVia: 'IN_APP',
            },
          });

          console.log(`[Workflow] Notification created for ${user.name} (${notifType})`);
        } catch (notifError) {
          console.error(`[Workflow] Failed to create notification for ${user.id}:`, notifError);
        }
      }
      break;
    }

    // ── CREATE_FOLLOW_UP ─────────────
    case 'CREATE_FOLLOW_UP': {
      if (!lead) {
        console.warn('[Workflow] CREATE_FOLLOW_UP: no lead data provided');
        return;
      }

      const config = action.config ?? {};
      const hours = Number(config.hours) || 24;
      const priority = String(config.priority ?? 'NORMAL');
      const reason = String(config.reason ?? 'Auto-generated by workflow');

      // Determine who to assign the follow-up to
      let assignedToId = lead.assignedRepId;

      if (!assignedToId) {
        // Round-robin: find active sales rep with fewest leads
        assignedToId = await getRoundRobinRep();
      }

      if (!assignedToId) {
        console.warn('[Workflow] CREATE_FOLLOW_UP: no rep available to assign');
        return;
      }

      const dueDatetime = new Date(Date.now() + hours * 60 * 60 * 1000);

      await db.followUp.create({
        data: {
          leadId: lead.id,
          assignedToId,
          dueDatetime,
          priority,
          reason,
        },
      });

      console.log(
        `[Workflow] Follow-up created for lead ${lead.id}: due in ${hours}h, priority ${priority}`,
      );
      break;
    }

    // ── SEND_EMAIL ────────────────────
    case 'SEND_EMAIL': {
      if (!lead) {
        console.warn('[Workflow] SEND_EMAIL: no lead data provided');
        return;
      }

      const config = action.config ?? {};
      const template = String(config.template ?? 'lead_assignment');
      const toRole = String(config.toRole ?? 'assigned_rep');

      try {
        // Resolve recipient based on toRole
        let recipientEmail: string | null = null;
        let recipientName: string | undefined;

        if (toRole === 'assigned_rep' && lead.assignedRepId) {
          const rep = await db.user.findUnique({
            where: { id: lead.assignedRepId },
            select: { name: true, email: true },
          });
          if (rep) {
            recipientEmail = rep.email;
            recipientName = rep.name;
          }
        } else if (toRole === 'super_admin') {
          const admin = await db.user.findFirst({
            where: { role: 'SUPER_ADMIN', isActive: true },
            select: { name: true, email: true },
          });
          if (admin) {
            recipientEmail = admin.email;
            recipientName = admin.name;
          }
        } else if (toRole === 'all_admins') {
          // Send to all admins
          const admins = await db.user.findMany({
            where: { role: { in: ['ADMIN', 'SUPER_ADMIN'] }, isActive: true },
            select: { name: true, email: true },
          });
          for (const admin of admins) {
            if (admin.email) {
              await sendSystemAlertForWorkflow(
                admin.email,
                `[SP RWP CRM] Lead Update: ${lead.firstName} ${lead.lastName}`,
                `Workflow "${workflowId}" triggered an alert.`,
                lead.id,
              );
            }
          }
          return;
        }

        if (!recipientEmail) {
          console.warn(`[Workflow] SEND_EMAIL: no email found for role ${toRole}`);
          return;
        }

        // Dispatch based on template type
        switch (template) {
          case 'lead_assignment':
            await sendLeadAssignmentNotification(
              {
                firstName: lead.firstName,
                lastName: lead.lastName,
                source: lead.source,
                phone: lead.phone,
              },
              { name: recipientName ?? 'Team Member', email: recipientEmail },
            );
            break;

          case 'followup_reminder': {
            if (data.followUp) {
              await sendFollowUpReminder(
                {
                  id: data.followUp.id,
                  dueDatetime: data.followUp.dueDatetime,
                  reason: data.followUp.reason ?? 'Follow-up required',
                  priority: data.followUp.priority,
                },
                { firstName: lead.firstName, lastName: lead.lastName, phone: lead.phone },
                { name: recipientName ?? 'Rep', email: recipientEmail },
              );
            } else {
              console.warn('[Workflow] followup_reminder: no followUp data provided');
            }
            break;
          }

          case 'escalation':
            await sendEscalationAlert(
              { reason: String(action.config?.reason ?? 'Follow-up overdue') },
              { firstName: lead.firstName, lastName: lead.lastName },
              { name: recipientName ?? 'Admin', email: recipientEmail },
            );
            break;

          default:
            console.warn(`[Workflow] SEND_EMAIL: unknown template ${template}`);
        }

        console.log(`[Workflow] Email sent (template: ${template}) to ${recipientEmail}`);
      } catch (emailError) {
        console.error(`[Workflow] SEND_EMAIL failed:`, emailError);
      }
      break;
    }

    // ── ESCALATE_FOLLOW_UP ────────────
    case 'ESCALATE_FOLLOW_UP': {
      if (!data.followUp) {
        console.warn('[Workflow] ESCALATE_FOLLOW_UP: no followUp data provided');
        return;
      }

      // Find a SUPER_ADMIN to escalate to
      const superAdmin = await db.user.findFirst({
        where: { role: 'SUPER_ADMIN', isActive: true },
        select: { id: true },
      });

      await db.followUp.update({
        where: { id: data.followUp.id },
        data: {
          status: 'ESCALATED',
          escalatedAt: new Date(),
          escalatedToId: superAdmin?.id ?? null,
        },
      });

      console.log(`[Workflow] Follow-up ${data.followUp.id} escalated`);
      break;
    }

    default:
      console.warn(`[Workflow] Unknown action type: ${(action as { type: string }).type}`);
  }
}

// ──────────────────────────────────────
// Helper: System Alert Email
// ──────────────────────────────────────

/** Import here to avoid circular dependency at module level. */
async function sendSystemAlertForWorkflow(
  to: string,
  title: string,
  message: string,
  leadId: string,
): Promise<void> {
  // Dynamically import to avoid circular deps
  const { sendEmail } = await import('@/lib/email');

  // Simple branded wrapper
  const html = `
    <div style="padding: 16px 0;">
      <p style="margin: 0 0 12px; color: #1f2937; font-size: 15px; line-height: 1.6;">${message}</p>
      <a href="#" style="display: inline-block; padding: 10px 24px; background: #059669; color: #fff; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 14px;">View in CRM &rarr;</a>
    </div>
  `;

  // We already have sendEmail imported above, just use it with raw HTML
  await sendEmail(to, title, html);
}

// ──────────────────────────────────────
// Helper: Resolve Target Users
// ──────────────────────────────────────

/**
 * Resolve the list of target users for a notification action
 * based on the forRole config value.
 */
async function resolveTargetUsers(
  forRole: string,
  data: WorkflowTriggerData,
): Promise<{ id: string; name: string }[]> {
  switch (forRole) {
    case 'assigned_rep': {
      if (data.lead?.assignedRepId) {
        const user = await db.user.findUnique({
          where: { id: data.lead.assignedRepId },
          select: { id: true, name: true },
        });
        return user ? [user] : [];
      }
      return [];
    }

    case 'SUPER_ADMIN':
    case 'super_admin': {
      const users = await db.user.findMany({
        where: { role: 'SUPER_ADMIN', isActive: true },
        select: { id: true, name: true },
      });
      return users;
    }

    case 'all_admins': {
      const users = await db.user.findMany({
        where: { role: { in: ['ADMIN', 'SUPER_ADMIN'] }, isActive: true },
        select: { id: true, name: true },
      });
      return users;
    }

    default:
      console.warn(`[Workflow] Unknown forRole: ${forRole}`);
      return [];
  }
}

// ──────────────────────────────────────
// Helper: Round-Robin Rep Assignment
// ──────────────────────────────────────

/**
 * Get the next sales rep using round-robin based on lastLogin.
 * Returns the rep with the earliest lastLogin among active reps.
 */
async function getRoundRobinRep(): Promise<string | null> {
  const activeReps = await db.user.findMany({
    where: { role: 'SALES_REP', isActive: true },
    select: { id: true, lastLogin: true },
    orderBy: { lastLogin: 'asc' },
  });

  if (activeReps.length === 0) {
    // Fall back to any active admin
    const admin = await db.user.findFirst({
      where: { role: { in: ['ADMIN', 'SUPER_ADMIN'] }, isActive: true },
      select: { id: true },
    });
    return admin?.id ?? null;
  }

  // Sort by lastLogin ascending — the rep who logged in longest ago gets the next lead
  activeReps.sort((a, b) => {
    if (!a.lastLogin) return -1;
    if (!b.lastLogin) return 1;
    return new Date(a.lastLogin).getTime() - new Date(b.lastLogin).getTime();
  });

  return activeReps[0].id;
}

// ──────────────────────────────────────
// Scheduled Checks
// ──────────────────────────────────────

/**
 * Check for overdue follow-ups and trigger escalation workflows.
 * Call from a cron job or scheduled task.
 *
 * @returns The number of follow-ups that were escalated
 */
export async function checkOverdueFollowUps(): Promise<number> {
  const now = new Date();

  // Find all PENDING follow-ups past their due date
  const overdueFollowUps = await db.followUp.findMany({
    where: {
      status: 'PENDING',
      dueDatetime: { lt: now },
    },
    include: {
      lead: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          phone: true,
          email: true,
          source: true,
          leadScore: true,
          temperature: true,
          status: true,
          assignedRepId: true,
        },
      },
      assignedTo: {
        select: { id: true, name: true, email: true },
      },
    },
  });

  if (overdueFollowUps.length === 0) {
    console.log('[Workflow] No overdue follow-ups found');
    return 0;
  }

  console.log(`[Workflow] Found ${overdueFollowUps.length} overdue follow-up(s)`);

  let escalatedCount = 0;

  for (const fu of overdueFollowUps) {
    try {
      // Mark as MISSED first
      await db.followUp.update({
        where: { id: fu.id },
        data: { status: 'MISSED' },
      });

      // Trigger the FOLLOW_UP_OVERDUE workflow
      await executeWorkflows('FOLLOW_UP_OVERDUE', {
        lead: fu.lead ?? undefined,
        followUp: {
          id: fu.id,
          leadId: fu.leadId,
          assignedToId: fu.assignedToId,
          dueDatetime: fu.dueDatetime,
          priority: fu.priority,
          status: 'MISSED',
          reason: fu.reason,
        },
      });

      escalatedCount++;
    } catch (err) {
      console.error(`[Workflow] Failed to process overdue follow-up ${fu.id}:`, err);
    }
  }

  console.log(`[Workflow] Escalated ${escalatedCount}/${overdueFollowUps.length} overdue follow-up(s)`);
  return escalatedCount;
}

/**
 * Check for leads with no conversation activity in the last 14 days
 * and mark them as COLD.
 *
 * @returns The number of leads updated
 */
export async function checkIdleConversations(): Promise<number> {
  const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);

  // Find leads that are NOT already LOST/COLD and have no recent conversations
  const leadsWithNoRecentActivity = await db.lead.findMany({
    where: {
      status: { notIn: ['LOST'] },
      temperature: { not: 'COLD' },
      // No conversations in the last 14 days (use a subquery-like approach)
      conversations: {
        none: {
          timestamp: { gte: fourteenDaysAgo },
        },
      },
    },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      phone: true,
      email: true,
      source: true,
      leadScore: true,
      temperature: true,
      status: true,
      assignedRepId: true,
    },
  });

  // Also filter leads that have NO conversations at all but were created > 14 days ago
  const leadsWithNoConversations = await db.lead.findMany({
    where: {
      status: { notIn: ['LOST'] },
      temperature: { not: 'COLD' },
      conversations: { none: {} },
      createdAt: { lt: fourteenDaysAgo },
    },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      phone: true,
      email: true,
      source: true,
      leadScore: true,
      temperature: true,
      status: true,
      assignedRepId: true,
    },
  });

  // Merge and deduplicate
  const allIdleLeads = [
    ...leadsWithNoRecentActivity,
    ...leadsWithNoConversations,
  ].filter((lead, index, self) =>
    index === self.findIndex((l) => l.id === lead.id),
  );

  if (allIdleLeads.length === 0) {
    console.log('[Workflow] No idle conversations found');
    return 0;
  }

  console.log(`[Workflow] Found ${allIdleLeads.length} idle lead(s) (no contact in 14+ days)`);

  let updatedCount = 0;

  for (const lead of allIdleLeads) {
    try {
      // Update temperature to COLD
      await db.lead.update({
        where: { id: lead.id },
        data: { temperature: 'COLD' },
      });

      // Create notification for the assigned rep
      if (lead.assignedRepId) {
        await db.notification.create({
          data: {
            userId: lead.assignedRepId,
            type: 'AI_INSIGHT',
            title: 'Lead Going Cold',
            message: `${lead.firstName} ${lead.lastName} has had no activity in 14+ days. Consider reaching out to re-engage.`,
            link: `leads:${lead.id}`,
            sentVia: 'IN_APP',
          },
        });
      }

      updatedCount++;
    } catch (err) {
      console.error(`[Workflow] Failed to process idle lead ${lead.id}:`, err);
    }
  }

  console.log(`[Workflow] Updated ${updatedCount}/${allIdleLeads.length} idle lead(s) to COLD`);
  return updatedCount;
}
