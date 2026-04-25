import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth-helpers';

// ──────────────────────────────────────
// GET /api/email/templates — List available email templates
// ──────────────────────────────────────
// Access: SUPER_ADMIN only
//
// Returns a static list of available email templates with their
// names, descriptions, and required parameters.
// ──────────────────────────────────────

interface EmailTemplate {
  id: string;
  name: string;
  description: string;
  requiredParams: { name: string; type: string; description: string; required: boolean }[];
  category: string;
}

const EMAIL_TEMPLATES: EmailTemplate[] = [
  {
    id: 'welcome',
    name: 'Welcome Email',
    description: 'Sent to new leads when they are first added to the CRM. Introduces Sports Pavilion facilities and sets expectations.',
    requiredParams: [
      { name: 'leadId', type: 'string', description: 'The ID of the lead to send the welcome email to', required: true },
    ],
    category: 'Lead Lifecycle',
  },
  {
    id: 'followup_reminder',
    name: 'Follow-Up Reminder',
    description: 'Sent to sales reps to remind them of an upcoming or due follow-up. Includes lead details, priority, and due time.',
    requiredParams: [
      { name: 'followUpId', type: 'string', description: 'The ID of the follow-up to send a reminder for', required: true },
    ],
    category: 'Follow-Ups',
  },
  {
    id: 'escalation',
    name: 'Escalation Alert',
    description: 'Sent to admins when a follow-up is overdue and has been escalated. Alerts the team to take immediate action.',
    requiredParams: [
      { name: 'leadId', type: 'string', description: 'The ID of the lead associated with the escalation', required: true },
      { name: 'reason', type: 'string', description: 'Reason for the escalation (defaults to "Follow-up overdue")', required: false },
    ],
    category: 'Escalations',
  },
  {
    id: 'daily_digest',
    name: 'Daily Digest',
    description: 'Sent to all admin users daily with a summary of key CRM metrics: new leads, conversions, active follow-ups, and overdue items.',
    requiredParams: [
      { name: 'stats', type: 'object', description: 'Object with { newLeads, conversions, activeFollowUps, overdueFollowUps }', required: true },
    ],
    category: 'Reports',
  },
  {
    id: 'lead_assignment',
    name: 'Lead Assignment Notification',
    description: 'Sent to a sales rep when a new lead is assigned to them. Includes lead contact info and source.',
    requiredParams: [
      { name: 'leadId', type: 'string', description: 'The ID of the lead that was assigned', required: true },
    ],
    category: 'Lead Lifecycle',
  },
  {
    id: 'system_alert',
    name: 'System Alert',
    description: 'A generic system alert email that can be sent to any recipient with a custom title and message.',
    requiredParams: [
      { name: 'to', type: 'string', description: 'Recipient email address', required: true },
      { name: 'title', type: 'string', description: 'Alert title', required: true },
      { name: 'message', type: 'string', description: 'Alert message body', required: true },
      { name: 'link', type: 'string', description: 'Optional link to include in the email', required: false },
    ],
    category: 'System',
  },
  {
    id: 'custom',
    name: 'Custom Email',
    description: 'Send a fully custom HTML email to any recipient. Subject and HTML body are required.',
    requiredParams: [
      { name: 'to', type: 'string', description: 'Recipient email address', required: true },
      { name: 'subject', type: 'string', description: 'Email subject line', required: true },
      { name: 'html', type: 'string', description: 'HTML content of the email body', required: true },
    ],
    category: 'Custom',
  },
];

export async function GET() {
  try {
    await requireRole('SUPER_ADMIN');

    return NextResponse.json({
      templates: EMAIL_TEMPLATES,
      total: EMAIL_TEMPLATES.length,
      fromEmail: process.env.RESEND_FROM_EMAIL ?? 'noreply@craftedminds.pk',
      configured: !!process.env.RESEND_API_KEY,
    });
  } catch (error) {
    if (error instanceof Response) return error;
    return NextResponse.json(
      { error: 'Failed to fetch email templates' },
      { status: 500 },
    );
  }
}
