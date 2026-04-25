// ═══════════════════════════════════════════════════════════════
// SP RWP CRM — Resend Email Integration
// ═══════════════════════════════════════════════════════════════
// Direct REST integration with Resend API (no npm package needed).
// All email sending is optional — if RESEND_API_KEY is not set,
// every function logs a warning and returns silently.
// ═══════════════════════════════════════════════════════════════

const RESEND_API_URL = 'https://api.resend.com/emails';
const DEFAULT_FROM_EMAIL = 'Sports Pavilion <noreply@craftedminds.pk>';

// ──────────────────────────────────────
// Helpers
// ──────────────────────────────────────

/** Lazy-check whether the Resend API key is configured. */
function getResendApiKey(): string | null {
  return process.env.RESEND_API_KEY ?? null;
}

/** Resolve the FROM address from env or fall back to default. */
function getFromEmail(): string {
  return process.env.RESEND_FROM_EMAIL
    ? `Sports Pavilion <${process.env.RESEND_FROM_EMAIL}>`
    : DEFAULT_FROM_EMAIL;
}

/** Common HTML wrapper with SP RWP CRM branding. */
function wrapHtml(bodyHtml: string, previewText?: string): string {
  const preview = previewText ?? 'SP RWP CRM Notification';
  return /* html */ `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="x-apple-disable-message-reformatting" />
  <meta name="preview" content="${escapeAttr(preview)}" />
  <title>${escapeHtml(preview)}</title>
  <!--[if mso]>
  <noscript>
    <xml>
      <o:OfficeDocumentSettings>
        <o:PixelsPerInch>96</o:PixelsPerInch>
      </o:OfficeDocumentSettings>
    </xml>
  </noscript>
  <![endif]-->
  <style>
    /* Reset */
    body, table, td, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
    table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
    img { -ms-interpolation-mode: bicubic; border: 0; height: auto; line-height: 100%; outline: none; text-decoration: none; }
    body { margin: 0; padding: 0; width: 100% !important; height: 100% !important; background-color: #f0fdf4; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; }

    /* Layout */
    .email-wrapper { max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.08); }
    .header { background: linear-gradient(135deg, #059669, #10b981); padding: 28px 32px; text-align: center; }
    .header h1 { margin: 0; color: #ffffff; font-size: 22px; font-weight: 700; letter-spacing: -0.02em; }
    .header p { margin: 6px 0 0; color: #d1fae5; font-size: 13px; }
    .body { padding: 28px 32px; color: #1f2937; font-size: 15px; line-height: 1.65; }
    .body h2 { margin: 0 0 12px; color: #065f46; font-size: 18px; font-weight: 600; }
    .body p { margin: 0 0 16px; }
    .body .highlight-box { background: #ecfdf5; border-left: 4px solid #10b981; padding: 14px 18px; border-radius: 0 8px 8px 0; margin: 16px 0; }
    .body .highlight-box p { margin: 0; color: #065f46; }
    .body .detail-row { display: flex; padding: 8px 0; border-bottom: 1px solid #f3f4f6; }
    .body .detail-row:last-child { border-bottom: none; }
    .body .detail-label { color: #6b7280; font-weight: 500; min-width: 130px; }
    .body .detail-value { color: #111827; font-weight: 600; }
    .footer { padding: 20px 32px; text-align: center; background: #f9fafb; border-top: 1px solid #e5e7eb; }
    .footer p { margin: 0; color: #9ca3af; font-size: 12px; line-height: 1.5; }
    .footer a { color: #059669; text-decoration: none; }

    /* Badge */
    .badge { display: inline-block; padding: 4px 12px; border-radius: 9999px; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.04em; }
    .badge-hot { background: #fef2f2; color: #dc2626; }
    .badge-warm { background: #fffbeb; color: #d97706; }
    .badge-cold { background: #eff6ff; color: #2563eb; }
    .badge-urgent { background: #fef2f2; color: #dc2626; }
    .badge-high { background: #fffbeb; color: #d97706; }
    .badge-normal { background: #f0fdf4; color: #16a34a; }
    .badge-low { background: #f3f4f6; color: #6b7280; }

    /* Stats grid */
    .stats-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin: 20px 0; }
    .stat-card { background: #f9fafb; border-radius: 8px; padding: 16px; text-align: center; }
    .stat-card .stat-value { font-size: 28px; font-weight: 700; color: #059669; margin: 0; }
    .stat-card .stat-label { font-size: 12px; color: #6b7280; margin: 4px 0 0; text-transform: uppercase; letter-spacing: 0.05em; }

    /* CTA Button */
    .cta-button { display: inline-block; padding: 12px 28px; background: linear-gradient(135deg, #059669, #10b981); color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 14px; margin: 16px 0; }

    /* Responsive */
    @media only screen and (max-width: 600px) {
      .email-wrapper { width: 100% !important; border-radius: 0; }
      .header, .body, .footer { padding-left: 20px !important; padding-right: 20px !important; }
      .stats-grid { grid-template-columns: 1fr; }
    }
  </style>
</head>
<body>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding: 24px 0;">
    <tr>
      <td align="center">
        <div class="email-wrapper">
          <!-- Header -->
          <div class="header">
            <h1>&#127942; Sports Pavilion Rawalpindi</h1>
            <p>CRM — Sales &amp; Customer Relationship Platform</p>
          </div>
          <!-- Body -->
          <div class="body">
            ${bodyHtml}
          </div>
          <!-- Footer -->
          <div class="footer">
            <p>Sports Pavilion Rawalpindi &mdash; Pakistan's Premier Sports Facility<br/>
            This is an automated message from SP RWP CRM. Please do not reply to this email.</p>
          </div>
        </div>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

/** Minimal HTML escaping. */
function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** Escape string for use in HTML attributes. */
function escapeAttr(s: string): string {
  return escapeHtml(s);
}

/** Format a Date for display in emails. */
function formatDateTime(d: Date): string {
  return new Date(d).toLocaleString('en-PK', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Asia/Karachi',
  });
}

// ──────────────────────────────────────
// Core Send Function
// ──────────────────────────────────────

/**
 * Send an email via the Resend REST API.
 *
 * @returns `{ success, messageId?, error? }` — never throws.
 */
export async function sendEmail(
  to: string,
  subject: string,
  htmlContent: string,
  replyTo?: string,
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const apiKey = getResendApiKey();
  if (!apiKey) {
    console.warn('[Email] RESEND_API_KEY not configured — skipping email send.');
    console.warn(`[Email] Would have sent to ${to}: ${subject}`);
    return { success: false, error: 'RESEND_API_KEY not configured' };
  }

  try {
    const body: Record<string, unknown> = {
      from: getFromEmail(),
      to: Array.isArray(to) ? to : [to],
      subject,
      html: htmlContent,
    };
    if (replyTo) {
      body.reply_to = replyTo;
    }

    const response = await fetch(RESEND_API_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errBody = await response.text();
      console.error(`[Email] Resend API error ${response.status}:`, errBody);
      return { success: false, error: `Resend API returned ${response.status}` };
    }

    const data = await response.json();
    console.log(`[Email] Sent to ${to} — ID: ${data.id}`);
    return { success: true, messageId: data.id };
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error(`[Email] Failed to send to ${to}:`, msg);
    return { success: false, error: msg };
  }
}

// ──────────────────────────────────────
// Template: Welcome Email
// ──────────────────────────────────────

/**
 * Send a welcome email to a new lead.
 * Introduces Sports Pavilion and provides key info.
 */
export async function sendWelcomeEmail(lead: {
  firstName: string;
  lastName?: string;
  email: string;
  phone?: string;
  source?: string;
}): Promise<void> {
  const fullName = `${lead.firstName}${lead.lastName ? ` ${lead.lastName}` : ''}`;
  const body = /* html */ `
    <h2>Welcome to Sports Pavilion, ${escapeHtml(lead.firstName)}! &#127942;</h2>
    <p>Thank you for your interest in <strong>Sports Pavilion Rawalpindi</strong> — Pakistan's premier sports and fitness facility.</p>
    <div class="highlight-box">
      <p><strong>What's next?</strong> One of our team members will reach out to you shortly to learn more about your interests and schedule a free tour of our facilities.</p>
    </div>
    <p><strong>Our Facilities:</strong></p>
    <ul style="margin: 0 0 16px 20px; line-height: 1.8;">
      <li>&#127951; Cricket Nets &amp; Football Ground</li>
      <li>&#127947; Gym &amp; Swimming Pool</li>
      <li>&#127934; Tennis, Basketball &amp; Squash Courts</li>
      <li>&#127939; Jogging Track &amp; Much More</li>
    </ul>
    <p>Feel free to visit us anytime during our operating hours or reply to schedule a tour.</p>
    <p style="color: #6b7280; font-size: 13px;">Source: ${escapeHtml(lead.source ?? 'Direct')}</p>
  `;

  await sendEmail(
    lead.email,
    `Welcome to Sports Pavilion, ${lead.firstName}!`,
    wrapHtml(body, `Welcome to Sports Pavilion Rawalpindi, ${fullName}`),
  );
}

// ──────────────────────────────────────
// Template: Follow-Up Reminder
// ──────────────────────────────────────

/**
 * Send a follow-up reminder to a sales rep about an upcoming/due follow-up.
 */
export async function sendFollowUpReminder(
  followUp: { id: string; dueDatetime: Date; reason: string; priority: string },
  lead: { firstName: string; lastName?: string; phone?: string },
  rep: { name: string; email: string },
): Promise<void> {
  const fullName = `${lead.firstName}${lead.lastName ? ` ${lead.lastName}` : ''}`;
  const priorityClass = followUp.priority === 'URGENT' ? 'badge-urgent'
    : followUp.priority === 'HIGH' ? 'badge-high'
    : followUp.priority === 'LOW' ? 'badge-low'
    : 'badge-normal';

  const body = /* html */ `
    <h2>Follow-Up Reminder</h2>
    <p>Hi ${escapeHtml(rep.name)}, you have an upcoming follow-up that needs your attention.</p>
    <div class="highlight-box">
      <div class="detail-row">
        <span class="detail-label">Lead</span>
        <span class="detail-value">${escapeHtml(fullName)}</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">Phone</span>
        <span class="detail-value">${escapeHtml(lead.phone ?? 'N/A')}</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">Due</span>
        <span class="detail-value">${formatDateTime(followUp.dueDatetime)}</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">Priority</span>
        <span class="detail-value"><span class="badge ${priorityClass}">${escapeHtml(followUp.priority)}</span></span>
      </div>
      <div class="detail-row">
        <span class="detail-label">Reason</span>
        <span class="detail-value">${escapeHtml(followUp.reason)}</span>
      </div>
    </div>
    <p>Please ensure you contact the lead before the due time. Timely follow-ups significantly improve conversion rates.</p>
  `;

  await sendEmail(
    rep.email,
    `Follow-Up Reminder: ${fullName}`,
    wrapHtml(body, `Follow-up reminder for ${fullName} due ${formatDateTime(followUp.dueDatetime)}`),
  );
}

// ──────────────────────────────────────
// Template: Escalation Alert
// ──────────────────────────────────────

/**
 * Send an escalation alert to an admin when a follow-up is overdue.
 */
export async function sendEscalationAlert(
  escalation: { reason: string },
  lead: { firstName: string; lastName?: string },
  rep: { name: string; email?: string },
): Promise<void> {
  const fullName = `${lead.firstName}${lead.lastName ? ` ${lead.lastName}` : ''}`;

  const body = /* html */ `
    <h2>&#9888;&#65039; Follow-Up Escalation Alert</h2>
    <p>A follow-up has been escalated and requires your immediate attention.</p>
    <div class="highlight-box" style="background: #fef2f2; border-left-color: #dc2626;">
      <div class="detail-row">
        <span class="detail-label">Lead</span>
        <span class="detail-value">${escapeHtml(fullName)}</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">Assigned To</span>
        <span class="detail-value">${escapeHtml(rep.name)}</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">Reason</span>
        <span class="detail-value">${escapeHtml(escalation.reason)}</span>
      </div>
    </div>
    <p>The assigned sales rep has missed the follow-up deadline. Please review and take appropriate action to ensure the lead is contacted promptly.</p>
  `;

  // Send to the rep if email exists (for awareness), plus the admin will receive separately
  if (rep.email) {
    await sendEmail(
      rep.email,
      `Escalation: Follow-Up Missed for ${fullName}`,
      wrapHtml(body, `Escalation alert: ${rep.name} missed follow-up for ${fullName}`),
    );
  }
}

// ──────────────────────────────────────
// Template: Daily Digest
// ──────────────────────────────────────

/**
 * Send a daily digest summary to admins with key CRM metrics.
 */
export async function sendDailyDigest(
  stats: {
    newLeads: number;
    conversions: number;
    activeFollowUps: number;
    overdueFollowUps: number;
  },
  recipients: string[],
): Promise<void> {
  const today = new Date().toLocaleDateString('en-PK', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'Asia/Karachi',
  });

  const body = /* html */ `
    <h2>&#128202; Daily CRM Digest — ${escapeHtml(today)}</h2>
    <p>Here's a summary of your CRM activity from the past 24 hours.</p>
    <div class="stats-grid">
      <div class="stat-card">
        <p class="stat-value">${stats.newLeads}</p>
        <p class="stat-label">New Leads</p>
      </div>
      <div class="stat-card">
        <p class="stat-value">${stats.conversions}</p>
        <p class="stat-label">Conversions</p>
      </div>
      <div class="stat-card">
        <p class="stat-value">${stats.activeFollowUps}</p>
        <p class="stat-label">Active Follow-Ups</p>
      </div>
      <div class="stat-card">
        <p class="stat-value" style="color: ${stats.overdueFollowUps > 0 ? '#dc2626' : '#059669'}">${stats.overdueFollowUps}</p>
        <p class="stat-label">Overdue</p>
      </div>
    </div>
    ${stats.overdueFollowUps > 0 ? `
      <div class="highlight-box" style="background: #fef2f2; border-left-color: #dc2626;">
        <p><strong>⚠ Action Required:</strong> You have <strong>${stats.overdueFollowUps} overdue follow-up(s)</strong> that need attention. Please check the CRM dashboard.</p>
      </div>
    ` : `
      <div class="highlight-box">
        <p><strong>&#9989; Great job!</strong> All follow-ups are on track. No overdue items.</p>
      </div>
    `}
    <p>Log in to the CRM dashboard for detailed analytics and lead management.</p>
  `;

  // Send to each recipient individually for better tracking
  for (const recipient of recipients) {
    await sendEmail(
      recipient,
      `Daily CRM Digest — ${today}`,
      wrapHtml(body, `Daily digest: ${stats.newLeads} new leads, ${stats.conversions} conversions`),
    );
  }
}

// ──────────────────────────────────────
// Template: Lead Assignment Notification
// ──────────────────────────────────────

/**
 * Send a notification to a sales rep when a new lead is assigned to them.
 */
export async function sendLeadAssignmentNotification(
  lead: { firstName: string; lastName?: string; source?: string; phone?: string },
  rep: { name: string; email: string },
): Promise<void> {
  const fullName = `${lead.firstName}${lead.lastName ? ` ${lead.lastName}` : ''}`;

  const body = /* html */ `
    <h2>New Lead Assigned to You</h2>
    <p>Hi ${escapeHtml(rep.name)}, a new lead has been assigned to you. Please review and reach out promptly.</p>
    <div class="highlight-box">
      <div class="detail-row">
        <span class="detail-label">Lead Name</span>
        <span class="detail-value">${escapeHtml(fullName)}</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">Phone</span>
        <span class="detail-value">${escapeHtml(lead.phone ?? 'N/A')}</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">Source</span>
        <span class="detail-value">${escapeHtml(lead.source ?? 'N/A')}</span>
      </div>
    </div>
    <p>Remember: fast response times lead to higher conversion rates. Try to make contact within 1 hour for the best results.</p>
  `;

  await sendEmail(
    rep.email,
    `New Lead Assigned: ${fullName}`,
    wrapHtml(body, `New lead ${fullName} assigned to ${rep.name}`),
  );
}

// ──────────────────────────────────────
// Template: System Alert (Generic)
// ──────────────────────────────────────

/**
 * Send a generic system alert email.
 */
export async function sendSystemAlert(
  to: string,
  title: string,
  message: string,
  link?: string,
): Promise<void> {
  const body = /* html */ `
    <h2>${escapeHtml(title)}</h2>
    <p>${escapeHtml(message)}</p>
    ${link ? `<p><a href="${escapeHtml(link)}" class="cta-button">View in CRM &rarr;</a></p>` : ''}
  `;

  await sendEmail(
    to,
    `[SP RWP CRM] ${title}`,
    wrapHtml(body, title),
  );
}
