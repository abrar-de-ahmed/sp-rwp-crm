import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireRole } from '@/lib/auth-helpers';
import { createAuditLog } from '@/lib/audit';
import {
  sendEmail,
  sendWelcomeEmail,
  sendFollowUpReminder,
  sendEscalationAlert,
  sendDailyDigest,
  sendLeadAssignmentNotification,
  sendSystemAlert,
} from '@/lib/email';

// ──────────────────────────────────────
// POST /api/email/send — Send an email (template or custom)
// ──────────────────────────────────────
// Access: ADMIN and SUPER_ADMIN only
//
// Body:
//   to         — recipient email address
//   subject    — email subject (for custom type)
//   html       — HTML body (for custom type)
//   type       — template type: 'custom' | 'followup_reminder' | 'escalation'
//                'welcome' | 'digest' | 'lead_assignment' | 'system_alert'
//   leadId     — optional lead ID for notification + audit tracking
//   followUpId — optional follow-up ID (for followup_reminder / escalation)
//   stats      — optional stats object (for digest type)
//   reason     — optional reason string (for escalation type)
// ──────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    const session = await requireRole('ADMIN');
    const body = await request.json();

    const {
      to,
      subject,
      html,
      type = 'custom',
      leadId,
      followUpId,
      stats,
      reason,
      title,
      message,
    } = body;

    // Validate recipient
    if (!to || typeof to !== 'string' || !to.includes('@')) {
      return NextResponse.json(
        { error: 'Valid recipient email (to) is required' },
        { status: 400 },
      );
    }

    let result: { success: boolean; messageId?: string; error?: string };

    switch (type) {
      // ── Custom HTML email ────────────
      case 'custom': {
        if (!subject || !html) {
          return NextResponse.json(
            { error: 'subject and html are required for custom emails' },
            { status: 400 },
          );
        }
        result = await sendEmail(to, subject, html);
        break;
      }

      // ── Welcome email ────────────────
      case 'welcome': {
        if (!leadId) {
          return NextResponse.json(
            { error: 'leadId is required for welcome emails' },
            { status: 400 },
          );
        }
        const lead = await db.lead.findUnique({
          where: { id: leadId },
          select: { firstName: true, lastName: true, email: true, phone: true, source: true },
        });
        if (!lead || !lead.email) {
          return NextResponse.json(
            { error: 'Lead not found or has no email' },
            { status: 404 },
          );
        }
        await sendWelcomeEmail({
          firstName: lead.firstName,
          lastName: lead.lastName,
          email: lead.email,
          phone: lead.phone,
          source: lead.source,
        });
        result = { success: true };
        break;
      }

      // ── Follow-up reminder ───────────
      case 'followup_reminder': {
        if (!followUpId) {
          return NextResponse.json(
            { error: 'followUpId is required for followup_reminder emails' },
            { status: 400 },
          );
        }
        const followUp = await db.followUp.findUnique({
          where: { id: followUpId },
          include: {
            lead: { select: { firstName: true, lastName: true, phone: true } },
            assignedTo: { select: { name: true, email: true } },
          },
        });
        if (!followUp) {
          return NextResponse.json(
            { error: 'Follow-up not found' },
            { status: 404 },
          );
        }
        if (!followUp.assignedTo.email) {
          return NextResponse.json(
            { error: 'Assigned rep has no email address' },
            { status: 400 },
          );
        }
        await sendFollowUpReminder(
          {
            id: followUp.id,
            dueDatetime: followUp.dueDatetime,
            reason: followUp.reason ?? 'No reason specified',
            priority: followUp.priority,
          },
          followUp.lead,
          followUp.assignedTo,
        );
        // Update reminder sent tracking
        await db.followUp.update({
          where: { id: followUpId },
          data: {
            reminderSentAt: new Date(),
            reminderSentVia: 'IN_APP',
          },
        });
        result = { success: true };
        break;
      }

      // ── Escalation alert ─────────────
      case 'escalation': {
        if (!leadId) {
          return NextResponse.json(
            { error: 'leadId is required for escalation emails' },
            { status: 400 },
          );
        }
        const lead = await db.lead.findUnique({
          where: { id: leadId },
          include: {
            assignedRep: { select: { name: true, email: true } },
          },
        });
        if (!lead) {
          return NextResponse.json(
            { error: 'Lead not found' },
            { status: 404 },
          );
        }
        await sendEscalationAlert(
          { reason: reason ?? 'Follow-up overdue' },
          lead,
          lead.assignedRep ? { name: lead.assignedRep.name, email: lead.assignedRep.email ?? undefined } : { name: 'Unassigned' },
        );
        result = { success: true };
        break;
      }

      // ── Daily digest ─────────────────
      case 'digest': {
        if (!stats || typeof stats !== 'object') {
          return NextResponse.json(
            { error: 'stats object is required for digest emails' },
            { status: 400 },
          );
        }
        const adminUsers = await db.user.findMany({
          where: { role: { in: ['ADMIN', 'SUPER_ADMIN'] }, isActive: true },
          select: { email: true },
        });
        const adminEmails = adminUsers.map((u) => u.email).filter(Boolean) as string[];
        if (adminEmails.length === 0) {
          return NextResponse.json(
            { error: 'No active admin users found to send digest to' },
            { status: 400 },
          );
        }
        await sendDailyDigest(
          {
            newLeads: stats.newLeads ?? 0,
            conversions: stats.conversions ?? 0,
            activeFollowUps: stats.activeFollowUps ?? 0,
            overdueFollowUps: stats.overdueFollowUps ?? 0,
          },
          adminEmails,
        );
        result = { success: true };
        break;
      }

      // ── Lead assignment notification ──
      case 'lead_assignment': {
        if (!leadId) {
          return NextResponse.json(
            { error: 'leadId is required for lead_assignment emails' },
            { status: 400 },
          );
        }
        const lead = await db.lead.findUnique({
          where: { id: leadId },
          include: {
            assignedRep: { select: { name: true, email: true } },
          },
        });
        if (!lead) {
          return NextResponse.json(
            { error: 'Lead not found' },
            { status: 404 },
          );
        }
        if (!lead.assignedRep?.email) {
          return NextResponse.json(
            { error: 'Lead has no assigned rep or rep has no email' },
            { status: 400 },
          );
        }
        await sendLeadAssignmentNotification(
          {
            firstName: lead.firstName,
            lastName: lead.lastName,
            source: lead.source,
            phone: lead.phone,
          },
          { name: lead.assignedRep.name, email: lead.assignedRep.email },
        );
        result = { success: true };
        break;
      }

      // ── System alert (generic) ───────
      case 'system_alert': {
        if (!title || !message) {
          return NextResponse.json(
            { error: 'title and message are required for system_alert emails' },
            { status: 400 },
          );
        }
        await sendSystemAlert(to, title, message);
        result = { success: true };
        break;
      }

      default:
        return NextResponse.json(
          { error: `Unknown email type: ${type}` },
          { status: 400 },
        );
    }

    // Create in-app notification if leadId is provided
    if (leadId && result.success) {
      try {
        // Find the user to notify — default to SUPER_ADMIN
        const superAdmin = await db.user.findFirst({
          where: { role: 'SUPER_ADMIN', isActive: true },
          select: { id: true },
        });

        if (superAdmin) {
          await db.notification.create({
            data: {
              userId: superAdmin.id,
              type: 'SYSTEM_ALERT',
              title: `Email Sent: ${type}`,
              message: `A ${type} email was sent for lead. Recipient: ${to}`,
              link: `leads:${leadId}`,
              sentVia: 'IN_APP',
            },
          });
        }
      } catch {
        // Don't fail the whole request if notification creation fails
        console.warn('[Email API] Failed to create notification');
      }
    }

    // Audit log
    await createAuditLog({
      actorType: session.user.role,
      actorId: session.user.id,
      actorName: session.user.name,
      entityType: 'SETTING',
      entityId: leadId ?? followUpId ?? null,
      action: 'CREATE',
      remarks: `Sent ${type} email to ${to}${leadId ? ` (lead: ${leadId})` : ''}`,
    });

    return NextResponse.json({
      success: result.success,
      messageId: result.messageId,
      error: result.error,
    });
  } catch (error) {
    if (error instanceof Response) return error;
    return NextResponse.json(
      { error: 'Failed to send email' },
      { status: 500 },
    );
  }
}
