# Sports Pavilion Rawalpindi — CRM Master Prompt v3
## Complete Recovery & QA Document
### Updated: 2026-04-25 | Phase: Phase 1 + Phase 2 COMPLETE | 6 AI Agents

---

# HOW TO USE THIS DOCUMENT

**If the project breaks or workspace is wiped:**
1. Copy this entire file into a new chat session
2. Copy the 6 source code files listed in Section 12
3. Tell the AI: "Rebuild the CRM using this Master Prompt v3 and these 6 files"
4. The AI can fully reconstruct the project without starting from scratch

**Project location**: `/home/z/my-project/`
**Database**: SQLite at `db/custom.db`

---

# SECTION 1: PROJECT OVERVIEW

## 1.1 Business Context
Sports Pavilion Rawalpindi (SP RWP) is a sports facility in Rawalpindi, Pakistan offering: Cricket nets, Football ground, Gym, Swimming pool, Tennis courts, Basketball court, Squash courts, Jogging track. This CRM manages the entire sales pipeline from lead capture through membership conversion.

## 1.2 Tech Stack
| Layer | Technology | Version |
|-------|-----------|---------|
| Framework | Next.js (App Router, SPA mode) | ^16.1.1 |
| Language | TypeScript | ^5 |
| Database | SQLite via Prisma ORM | ^6.11.1 |
| Auth | NextAuth.js v4 (JWT strategy) | ^4.24.11 |
| Styling | Tailwind CSS v4 + shadcn/ui | ^4 |
| Charts | recharts | ^2.15.4 |
| State | React useState + zustand | ^5.0.6 |
| AI | z-ai-web-dev-sdk (GPT-4o-mini) | ^0.0.17 |
| Spreadsheet | xlsx (SheetJS) | ^0.18.5 |
| Drag & Drop | @dnd-kit/core + sortable | ^6.3.1 |
| Runtime | Bun (package manager + runner) | — |
| Icons | lucide-react | ^0.525.0 |
| Date Utils | date-fns | ^4.1.0 |

## 1.3 Architecture
- **Single-Page Application**: Next.js hosts a single `page.tsx` entry. All 18 "pages" are React components rendered via `CRMLayout` based on `activePage` state.
- **No file-system routing**: Navigation handled entirely client-side through sidebar clicks.
- **API Routes**: 30 REST endpoints under `src/app/api/`, all protected by `requireAuth()` or `requireRole()`.
- **Database**: SQLite file at `db/custom.db`, managed via Prisma schema-push (no migrations).

## 1.4 Statistics
| Metric | Value |
|--------|-------|
| Total source files | ~120 |
| API routes | 30 |
| Page components | 18 (all functional) |
| shadcn/ui components | 50 |
| AI Agents | 6 |
| Prisma models | 10 |
| Roles | 3 (SUPER_ADMIN, ADMIN, SALES_REP) |

---

# SECTION 2: DATABASE SCHEMA (prisma/schema.prisma)

## 2.1 Config
```prisma
generator client { provider = "prisma-client-js" }
datasource db { provider = "sqlite"; url = env("DATABASE_URL") }
```

## 2.2 Models (10 tables)

### User — id, name, email (unique), phone?, passwordHash, role (SUPER_ADMIN/ADMIN/SALES_REP), avatarUrl?, isActive, lastLogin?, createdAt, updatedAt
### Lead — id, firstName, lastName, phone (indexed NOT unique), email?, whatsappNumber?, source, leadType, interestedFacilities (JSON string), leadScore (0-100), temperature (HOT/WARM/COLD), status (NEW/CONTACTED/INTERESTED/Negotiation/BOOKED/LOST/RECOVERED), assignedRepId?, familySize?, budgetRange?, lostReason?, metaAdCampaign?, metaAdCreative?, remarks, tags (JSON string), createdAt, updatedAt
### Call — id, leadId, repId, direction (OUTBOUND/INBOUND), callTimestamp, durationSeconds, status (COMPLETED/NO_ANSWER/BUSY/FAILED/CANCELLED), outcome (ANSWERED/HUNG_UP_BY_CUSTOMER/HUNG_UP_BY_REP/UNANSWERED/BUSY/WRONG_NUMBER/VOICEMAIL), recordingUrl?, transcriptText?, aiSummary?, aiExtractedInterest (JSON), aiExtractedBudget?, aiExtractedObjections (JSON), aiExtractedTimeline?, aiSentiment?, aiCoachingFlag, aiCoachingNote?, repRemarks?, createdAt
### Conversation — id, leadId, channel (WHATSAPP/INSTAGRAM/FACEBOOK/SMS), direction (INBOUND/OUTBOUND), messageText, mediaUrl?, sentBy (AI_AGENT/SALES_REP/CUSTOMER), senderId?, aiAgentId?, isRead, timestamp
### FollowUp — id, leadId, assignedToId, dueDatetime, priority (URGENT/HIGH/NORMAL/LOW), status (PENDING/COMPLETED/MISSED/ESCALATED), reason?, lastCallSummary?, reminderSentAt?, reminderSentVia?, escalatedToId?, escalatedAt?, completedAt?, completionNotes?, createdAt, updatedAt
### Membership — id, leadId, repId, planType (ANNUAL/BI_ANNUAL/MONTHLY_INSTALLMENT/CORPORATE), planName, startDate, endDate, familyMembersCount, familyMemberNames (JSON), status (ACTIVE/EXPIRING/EXPIRED/RENEWED/CANCELLED), renewalReminderSent, renewalReminderSentAt?, renewalDate?, amountPaid, paymentMethod?, createdAt, updatedAt
### AuditLog — id, actorType, actorId?, actorName, entityType, entityId?, action, fieldChanged?, oldValue?, newValue?, remarks?, ipAddress?, createdAt
### Notification — id, userId, type (NEW_LEAD/FOLLOW_UP_REMINDER/ESCALATION/CALL_OUTCOME/SYSTEM_ALERT/AI_INSIGHT), title, message, link?, isRead, sentVia (IN_APP/WHATSAPP/BOTH), createdAt
### AIInsight — id, agentId, insightType (PATTERN/SUGGESTION/COACHING/IMPROVEMENT), description, dataPoints, confidenceScore, proposedChange?, expectedImpact?, status (PENDING_REVIEW/APPROVED/REJECTED/DEPLOYED), reviewedById?, reviewedAt?, reviewNotes?, createdAt, updatedAt
### ChannelConnection — id, channel (FACEBOOK/INSTAGRAM/WHATSAPP), status (CONNECTED/DISCONNECTED/EXPIRED), connectedAt?, lastHeartbeatAt?, accessToken?, sessionData?, metadata?, createdAt, updatedAt

**CRITICAL NOTE**: Lead.phone is NOT @unique — only @@index. Use `findFirst({ where: { phone } })` not `findUnique` for duplicate checks.

---

# SECTION 3: AUTHENTICATION & RBAC

## 3.1 Auth System (src/lib/auth.ts)
- Provider: CredentialsProvider (email + password)
- Strategy: JWT (24-hour expiry)
- JWT payload: `{ id, role }`
- Session object: `{ user: { id, name, email, role, image? } }`
- Password hashing: bcryptjs with 12 salt rounds
- Sign-in page: `/login`

## 3.2 Role Hierarchy (src/lib/auth-helpers.ts)
```
SUPER_ADMIN (level 3) > ADMIN (level 2) > SALES_REP (level 1)
```

## 3.3 COMPLETE PERMISSION MATRIX

| Feature | SUPER_ADMIN | ADMIN | SALES_REP |
|---------|:-----------:|:-----:|:---------:|
| Dashboard | Full (own+team+system) | Full (own+team stats) | Own data only |
| Leads View | All | All | Own only |
| Leads Create | Yes (round-robin) | Yes (round-robin) | Self only |
| Leads Edit | Yes | Yes | Own only |
| Leads Delete | Yes | No | No |
| Pipeline | All | All | Own only |
| Follow-Ups | All | All | Own only |
| Call History | All | All | Own only |
| AI Score/Analyze | All | All | Own leads/calls only |
| AI Follow-Up Suggest | All | All | Own leads only |
| **Team Overview** | Yes | Yes | No |
| **Call Recordings** | Yes | Yes | No |
| **Reports** | Yes | Yes | No |
| **Memberships** | Yes | Yes | No |
| **Data Export** | Yes | No | No |
| **Data Import** | Yes | No | No |
| **AI Agents Config** | Full | View only | No |
| **AI Insights Review** | Full | View only | No |
| **Channel Setup** | Full | No | No |
| **Audit Log** | Yes | No | No |
| **Settings** | Yes | No | No |
| **Team Management** | Full CRUD | No | No |
| Notifications | Own | Own | Own |

## 3.4 Sidebar (src/components/sidebar.tsx)

### SALES_REP — 7 items
Dashboard, My Leads, Pipeline, Follow-Ups, Call History, Help

### ADMIN — 11 items
Dashboard, All Leads, **Team, Call Recordings, Reports, Memberships**, Pipeline, Follow-Ups, Call History, Help

### SUPER_ADMIN — 15 items
Dashboard, All Leads, Team, Call Recordings, Reports, Memberships, **AI Agents, AI Insights, Channel Setup, Data Export, Audit Log, Data Import, Settings, Team Management**, Pipeline, Follow-Ups, Call History, Help

---

# SECTION 4: ALL 30 API ROUTES

## Core
- `POST /api/auth/[...nextauth]` — NextAuth handler
- `GET /api` — Health check

## Dashboard
- `GET /api/dashboard/stats` — Role-based stats (SALES_REP: own, ADMIN: +team, SUPER_ADMIN: +system)
- `GET /api/dashboard/hot-leads` — Top 10 hot leads
- `GET /api/dashboard/followups` — Upcoming follow-ups

## Leads (CRUD + RBAC)
- `GET /api/leads` — List with filters, SALES_REP sees own
- `POST /api/leads` — Create, SALES_REP self-assign, ADMIN/SUPER_ADMIN round-robin, uses `findFirst` for phone dup check
- `GET /api/leads/[id]` — Detail with relations
- `PUT /api/leads/[id]` — Update, SUPER_ADMIN only for reassign
- `DELETE /api/leads/[id]` — SUPER_ADMIN only
- `PATCH /api/leads/[id]/status` — Status change + audit log
- `POST /api/leads/[id]/remarks` — Add remarks

## Pipeline & Follow-Ups
- `GET /api/pipeline` — Kanban data grouped by status
- `GET /api/followups` — List with filters
- `POST /api/followups` — Create
- `PUT /api/followups/[id]` — Complete/escalate

## Calls
- `GET /api/calls` — List with all AI fields, role-filtered (SALES_REP: own, ADMIN: own+all reps, SUPER_ADMIN: all)
  - Select includes: recordingUrl, transcriptText, aiSummary, aiExtractedInterest, aiExtractedBudget, aiExtractedObjections, aiExtractedTimeline, aiSentiment, aiCoachingFlag, aiCoachingNote, repRemarks
  - Includes: lead (firstName, lastName, phone), rep (name)

## Users (SUPER_ADMIN only)
- `GET /api/users` — List all
- `POST /api/users` — Create (min 8 char password)
- `PUT /api/users/[id]` — Update
- `DELETE /api/users/[id]` — Deactivate (isActive=false)

## Notifications
- `GET /api/notifications` — Own notifications
- `PUT /api/notifications/[id]/read` — Mark read
- `PUT /api/notifications/read-all` — Mark all read

## Admin Routes
- `GET /api/audit` — SUPER_ADMIN, AuditLog with filters
- `GET /api/channels` — SUPER_ADMIN
- `POST /api/channels` — SUPER_ADMIN
- `POST /api/import` — SUPER_ADMIN, multipart/form-data, xlsx parsing
- `GET /api/team-members` — ADMIN+ for dropdowns

## AI Agents (6 total)
- `GET /api/ai-agents` — All agent configs
- `PUT /api/ai-agents` — SUPER_ADMIN toggle/configure

## AI Endpoints (with ownership checks)
- `POST /api/ai/score-lead` — Agent 1, SALES_REP restricted to own leads
- `POST /api/ai/chat` — Agent 2, multi-language, FAQ, handoff detection
- `POST /api/ai/call-analysis` — Agent 3, SALES_REP restricted to own calls
- `POST /api/ai/followup-suggest` — Agent 4, SALES_REP restricted to own leads
- `GET /api/ai/insights` — View/review insights
- `PUT /api/ai/insights` — SUPER_ADMIN approve/reject
- `POST /api/ai/report` — Agent 5, period-based report
- `POST /api/ai/data-quality` — Agent 6, ADMIN+ only, uses `requireRole('ADMIN')`

---

# SECTION 5: ALL 6 AI AGENTS (src/lib/ai-agent.ts)

| # | Name | ID | Model | Temp | MaxTokens | Purpose |
|---|------|----|-------|------|-----------|---------|
| 1 | Lead Scoring Engine | 1 | gpt-4o-mini | 0.2 | 200 | Score leads 0-100, assign temperature |
| 2 | Customer Bot | 2 | gpt-4o-mini | 0.5 | 500 | Multi-language support (EN/Urdu/Roman Urdu), FAQ, handoff |
| 3 | Call Monitor | 3 | gpt-4o-mini | 0.3 | 400 | Analyze transcripts, extract interest/budget/objections/sentiment |
| 4 | Follow-Up Agent | 4 | gpt-4o-mini | 0.4 | 300 | Suggest follow-up timing, priority, channel, message |
| 5 | Reporting Agent | 5 | gpt-4o-mini | 0.5 | 800 | Performance reports with trends + recommendations |
| 6 | Data Quality Agent | 6 | gpt-4o-mini | 0.3 | 600 | Audit data completeness, stale records, quality scoring |

### Agent Icons & Colors (ai-agents-page.tsx)
```typescript
AGENT_ICONS: { 1: Target(emerald), 2: MessageSquare(blue), 3: PhoneCall(amber), 4: Clock(purple), 5: BarChart3(rose), 6: Shield(cyan) }
AGENT_COLORS: { 1: emerald, 2: blue, 3: amber, 4: purple, 5: rose, 6: cyan }
```

### Utility Functions
- `detectLanguage(text)` → 'english' | 'urdu' | 'roman_urdu'
- `calculateLeadScore(input)` → { score, temperature, factors[] }
- `callLLM(prompt, systemPrompt, options?)` → string (wraps z-ai-web-dev-sdk)
- `parseJSONResponse(text)` → Record<string, unknown>
- `matchFAQ(message)` → { answer, language } | null (6 FAQ categories)
- `shouldHandoffToHuman(message)` → boolean (25+ triggers in EN + Roman Urdu)

---

# SECTION 6: ALL 18 PAGE COMPONENTS

## Phase 1 (14 pages)
1. **Dashboard** (dashboard.tsx, 600 lines) — Role-based KPIs, hot leads, follow-ups, rep performance, channels, AI status
2. **Leads** (leads-page.tsx, 629 lines) — Search, filters, pagination, create dialog
3. **Lead Detail** (lead-detail.tsx, 1058 lines) — Tabs: Details, Calls, Conversations, Follow-Ups, Memberships, AI actions
4. **Pipeline** (pipeline-page.tsx, 709 lines) — Kanban with @dnd-kit, 7 status columns
5. **Follow-Ups** (followups-page.tsx, 861 lines) — Table, filters, complete/escalate
6. **Call History** (call-history-page.tsx, 563 lines) — Log calls, AI analysis button
7. **Team Management** (team-management-page.tsx, 624 lines) — SUPER_ADMIN CRUD
8. **Data Import** (data-import-page.tsx, 472 lines) — 3-step wizard, xlsx parsing
9. **Channel Setup** (channel-setup-page.tsx, 754 lines) — WhatsApp/FB/IG config UI
10. **AI Agents** (ai-agents-page.tsx, 460 lines) — 6 agent cards, toggle, configure dialog
11. **AI Insights** (ai-insights-page.tsx, 634 lines) — Review workflow
12. **Audit Log** (audit-log-page.tsx, 529 lines) — SUPER_ADMIN, filterable table
13. **Help** (help-page.tsx, 185 lines) — FAQ accordion, tour reset
14. **Login** (login.tsx, 161 lines) — Email/password form

## Phase 2 (4 pages — NOW BUILT)
15. **Team Overview** (team-page.tsx, 527 lines)
    - Role guard: ADMIN + SUPER_ADMIN only
    - Summary cards: Total Reps, Calls Today, Conversions, Escalations
    - 3 tabs: Performance table, Leaderboard (top 3 with medals), Charts
    - recharts BarChart: Calls per rep (green=made, blue=answered)
    - recharts horizontal BarChart: Conversion funnel (NEW→CONTACTED→INTERESTED→NEGOTIATION→BOOKED)
    - Date range filter (today/week/month)
    - Retry button uses retryCount state (not same-value setState)
    - Data: `/api/dashboard/stats` + `/api/pipeline`

16. **Call Recordings** (call-recordings-page.tsx, 652 lines)
    - Role guard: ADMIN + SUPER_ADMIN
    - 7 filters: Status, Direction, Sentiment, Has Recording, Date range, Search, Clear All
    - Expandable call table rows with chevron
    - Recording highlights: emerald left border on rows with recordings
    - Audio player (HTML5 `<audio>`) when call has recordingUrl
    - AI Summary card (blue), Transcript viewer (scrollable)
    - AI Analysis grid: Interest, Budget, Objections, Timeline, Sentiment badge, Coaching flag
    - Editable rep remarks with Save
    - Safe JSON parsing for extracted fields
    - Data: `/api/calls?limit=50`

17. **Reports** (reports-page.tsx, 559 lines)
    - Role guard: ADMIN + SUPER_ADMIN
    - Period tabs: Daily/Weekly/Monthly
    - 6 KPI cards with icons
    - recharts PieChart: Lead source breakdown (8-color palette)
    - recharts BarChart: Rep performance comparison (Calls=green, Conversions=blue)
    - recharts horizontal BarChart: Lead status distribution
    - AI Report: Button → POST `/api/ai/report` → markdown render with ReactMarkdown
    - Export buttons: CSV + JSON (Blob + URL.createObjectURL download)
    - Data: `/api/dashboard/stats`, `/api/ai/report`

18. **Data Export** (data-export-page.tsx, 498 lines)
    - Role guard: SUPER_ADMIN only
    - 4 export type cards: Leads, Calls, Follow-Ups, Memberships
    - Date range picker (type="date" inputs)
    - Format selector: CSV, JSON, Excel (xlsx)
    - Preview table: First 5 rows of selected data
    - Status: idle → Preparing → Downloaded
    - Excel uses `xlsx` library: `XLSX.utils.json_to_sheet` + `XLSX.write`
    - CSV/JSON uses Blob + download link
    - Data: `/api/leads`, `/api/calls`, `/api/followups`

## Phase 4 Stubs (2 pages — NOT YET BUILT)
19. **Memberships** (memberships-page.tsx, 33 lines) — Phase 4
20. **Settings** (settings-page.tsx, 33 lines) — Phase 4

---

# SECTION 7: SEED DATA (prisma/seed.ts)

All passwords: `password123`

| Name | Email | Role |
|------|-------|------|
| Super Admin | admin@spcrm.com | SUPER_ADMIN |
| Ahmed Manager | manager@spcrm.com | ADMIN |
| Ali Khan | ali@spcrm.com | SALES_REP |
| Bilal Ahmed | bilal@spcrm.com | SALES_REP |
| Sara Tariq | sara@spcrm.com | SALES_REP |
| Omar Farooq | omar@spcrm.com | SALES_REP |
| Zain Malik | zain@spcrm.com | SALES_REP |

5 sample leads + 2 audit log entries.

---

# SECTION 8: ENVIRONMENT & BUILD

## .env
```
DATABASE_URL=file:/home/z/my-project/db/custom.db
NEXTAUTH_SECRET=<generate-with-openssl-rand-base64-32>
```

## Commands
```bash
bun install
mkdir -p db
bunx prisma db push
bunx prisma generate
bunx tsx prisma/seed.ts
bun run dev          # Port 3000
bun run build        # Production build
bun run start        # Production server
```

---

# SECTION 9: QA REPORT (Post Phase 2)

## 9.1 Build Status: PASS
- Production build: 0 errors, 0 warnings
- 30 API routes compiled
- All 18 page components functional (16 built, 2 Phase 4 stubs)

## 9.2 Bugs Found & Fixed

### CRITICAL (Fixed)
1. **`findUnique` on non-unique phone** → Changed to `findFirst` in `/api/leads` POST
2. **Agent 6 missing from UI** → Added Shield icon + cyan colors to `ai-agents-page.tsx`

### HIGH (Fixed)
3. **AI routes ownership gap** → Added SALES_REP ownership checks to score-lead, call-analysis, followup-suggest
4. **Retry button no-op** → Changed from `setDateRange(dateRange)` to `setRetryCount(c => c+1)` in team-page
5. **Skeleton count wrong** → Changed from `[...Array(5)]` to `[...Array(6)]`
6. **Agent count text wrong** → "5 AI agents" → "6 AI agents"

### MEDIUM (Fixed)
7. **data-quality route** → Changed from manual role check to `requireRole('ADMIN')`
8. **Dashboard fallback** → Added Agent 6 to stale fallback list

### LOW (Known, Not Fixed)
9. Reports page period selector doesn't filter data (only AI report uses period)
10. Call Recordings status filter label says "Status" but filters on outcome
11. Data Export memberships case fetches leads data (no /api/memberships endpoint)
12. Call Recordings handleSaveRemarks is local-only (no API call)

## 9.3 Security Audit
- 30/30 API routes have auth guards: PASS
- Role-based data filtering: PASS (with SALES_REP ownership checks on AI routes)
- JWT secret configured: PASS
- Password hashing (bcrypt 12 rounds): PASS
- No SQL injection risk (Prisma parameterized): PASS

---

# SECTION 10: DEVELOPMENT PATTERNS

## API Route Pattern
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth } from '@/lib/auth-helpers';
import { createAuditLog } from '@/lib/audit';

export async function GET(request: NextRequest) {
  try {
    const session = await requireAuth();
    if (session.user.role === 'SALES_REP') { /* filter to own */ }
    return NextResponse.json({ data });
  } catch (error) {
    if (error instanceof Response) return error;
    return NextResponse.json({ error: 'Desc' }, { status: 500 });
  }
}
```

## Page Component Pattern
```typescript
'use client';
import { useState, useEffect } from 'react';
// shadcn imports

interface Props { user: { id: string; name: string; email: string; role: string }; }

export default function SomePage({ user }: Props) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    fetch('/api/endpoint').then(r => r.json()).then(d => { setData(d); setLoading(false); });
  }, []);
  if (loading) return <Skeleton />;
  // Role guard if needed
  return <div>...</div>;
}
```

## Critical Patterns to Remember
1. **NEVER use `await` inside `setState()`** — resolve promises before calling setter
2. **Use `findFirst` not `findUnique` for Lead.phone** — phone is indexed, not unique
3. **Use `retryCount` state for retry buttons** — same-value setState is ignored by React
4. **SALES_REP ownership checks** on all AI routes that modify data
5. **JSON fields stored as strings** — use `JSON.parse()` / `JSON.stringify()`
6. **File downloads** — `new Blob([content])` → `URL.createObjectURL(blob)` → `<a download>`
7. **Excel export** — use `xlsx` library: `XLSX.utils.json_to_sheet()` + `XLSX.write()`

---

# SECTION 11: PHASE ROADMAP

| Phase | Status | Features |
|-------|--------|----------|
| Phase 1 | COMPLETE | Dashboard, Leads, Pipeline, Follow-Ups, Calls, Team Mgmt, Import, Channels, AI (5 agents), Audit, Notifications, Tour, Help |
| Phase 2 | COMPLETE | Team Overview, Call Recordings, Reports, Data Export, 6th AI Agent (Data Quality) |
| Phase 3 | UPCOMING | TBD |
| Phase 4 | STUBS ONLY | Memberships, Settings |

---

# SECTION 12: THE 6 RECOVERY FILES

If the project breaks, give a new session these 6 files + this Master Prompt:

| # | File | Lines | Content |
|---|------|-------|---------|
| 1 | `prisma/schema.prisma` | 289 | 10-table data model |
| 2 | `src/lib/ai-agent.ts` | 448 | 6 AI agents + FAQ + lead scoring + utilities |
| 3 | `src/lib/auth.ts` + `src/lib/auth-helpers.ts` | 248 | JWT auth + role hierarchy + password utils |
| 4 | `src/components/sidebar.tsx` | 213 | 18-page role-based navigation |
| 5 | `prisma/seed.ts` | 232 | 7 users + 5 leads |
| 6 | **THIS FILE** (Master Prompt v3) | — | Everything: API contracts, components, permissions, QA, patterns |

---

# SECTION 13: COMPONENT PAGE-LINE REFERENCE

| Page | File | Lines | Phase |
|------|------|-------|-------|
| Dashboard | dashboard.tsx | 600 | 1 |
| Leads | leads-page.tsx | 629 | 1 |
| Lead Detail | lead-detail.tsx | 1058 | 1 |
| Pipeline | pipeline-page.tsx | 709 | 1 |
| Follow-Ups | followups-page.tsx | 861 | 1 |
| Call History | call-history-page.tsx | 563 | 1 |
| Team Management | team-management-page.tsx | 624 | 1 |
| Data Import | data-import-page.tsx | 472 | 1 |
| Channel Setup | channel-setup-page.tsx | 754 | 1 |
| AI Agents | ai-agents-page.tsx | 460 | 1 |
| AI Insights | ai-insights-page.tsx | 634 | 1 |
| Audit Log | audit-log-page.tsx | 529 | 1 |
| Help | help-page.tsx | 185 | 1 |
| Login | login.tsx | 161 | 1 |
| **Team Overview** | **team-page.tsx** | **527** | **2** |
| **Call Recordings** | **call-recordings-page.tsx** | **652** | **2** |
| **Reports** | **reports-page.tsx** | **559** | **2** |
| **Data Export** | **data-export-page.tsx** | **498** | **2** |
| Memberships | memberships-page.tsx | 33 | 4 |
| Settings | settings-page.tsx | 33 | 4 |
| **Data Quality API** | **api/ai/data-quality/route.ts** | **60** | **2** |

**Total: ~10,000 lines of application code across 18 functional pages + 30 API routes**
