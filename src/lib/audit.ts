import { db } from "@/lib/db";

// ──────────────────────────────────────
// Audit Log Creation
// ──────────────────────────────────────

export interface CreateAuditLogParams {
  actorType: string; // SUPER_ADMIN, ADMIN, SALES_REP, AI_AGENT, SYSTEM
  actorId?: string | null;
  actorName: string;
  entityType: string; // LEAD, CALL, CONVERSATION, FOLLOW_UP, MEMBERSHIP, USER, SETTING
  entityId?: string | null;
  action: string; // CREATE, UPDATE, DELETE, ASSIGN, ESCALATE, STATUS_CHANGE
  fieldChanged?: string | null;
  oldValue?: string | null;
  newValue?: string | null;
  remarks?: string | null;
  ipAddress?: string | null;
}

/**
 * Create an immutable audit log entry.
 * Safe to call from API routes and server actions.
 */
export async function createAuditLog(params: CreateAuditLogParams): Promise<void> {
  await db.auditLog.create({
    data: {
      actorType: params.actorType,
      actorId: params.actorId ?? null,
      actorName: params.actorName,
      entityType: params.entityType,
      entityId: params.entityId ?? null,
      action: params.action,
      fieldChanged: params.fieldChanged ?? null,
      oldValue: params.oldValue ?? null,
      newValue: params.newValue ?? null,
      remarks: params.remarks ?? null,
      ipAddress: params.ipAddress ?? null,
    },
  });
}
