# CHAMP — Supervisor Agent | SP RWP CRM

> **Last Updated:** 2026-04-25
> **Session:** #5 (Current active session — Phase 3 + AI Learning)
> **Project Owner:** Abrar Ahmed (GitHub: abrar-de-ahmed)

## HOW TO USE CHAMP (Read This First)

When starting a NEW chat session, paste this exact message:

```
Fire in the hole
GitHub: https://github.com/abrar-de-ahmed/sp-rwp-crm
Token: [GITHUB_TOKEN from user]
```

The AI will:
1. Pull CHAMP.md from this repo
2. Understand the entire project
3. Know exactly what to do next
4. Continue seamlessly from where we left off

---

## 1. PROJECT IDENTITY

| Field | Value |
|-------|-------|
| **Project Name** | SP RWP CRM (Sports Pavilion Rawalpindi CRM) |
| **Client** | Abrar Ahmed |
| **Purpose** | AI-Powered Customer Relationship Management for a sports facility |
| **Industry** | Sports / Fitness / Recreation |
| **Location** | Rawalpindi, Pakistan |
| **GitHub Repo** | https://github.com/abrar-de-ahmed/sp-rwp-crm (PRIVATE) |
| **Cloudflare Account** | Craftedminds3@gmail.com (ID: a9183b9558532b0f2e8ef6e577ea8aa5) |
| **Workspace** | /home/z/my-project/ |

---

## 2. TECH STACK

| Layer | Technology |
|-------|-----------|
| **Framework** | Next.js 16.1 (App Router) |
| **Language** | TypeScript 5 |
| **React** | React 19 |
| **Styling** | Tailwind CSS 4 + oklch color system |
| **UI Library** | shadcn/ui (new-york style, 43 components installed) |
| **Database** | SQLite via Prisma ORM 6.11 (file: db/custom.db) |
| **Auth** | NextAuth.js v4 (JWT strategy, 24h sessions) |
| **AI** | z-ai-web-dev-sdk (glm-4-plus, free tier) |
| **AI Learning** | Self-learning engine — grows smarter every day from conversations |
| **Meta API** | Meta Graph API v19.0 (Facebook + Instagram) |
| **WhatsApp** | WhatsApp Cloud API via Meta Business |
| **Email** | Resend API (REST, no npm package) |
| **Charts** | Recharts |
| **Drag & Drop** | @dnd-kit/core + @dnd-kit/sortable |
| **Icons** | lucide-react |
| **Forms** | react-hook-form + @hookform/resolvers + zod |
| **State** | React useState (SPA pattern within CRMLayout) |
| **Package Manager** | Bun |
| **Fonts** | Geist Sans + Geist Mono (next/font/google) |
| **Date** | date-fns |

### Theme
- Primary hue: 155 (emerald/teal green)
- Color system: oklch
- Dark mode: class strategy
- Logo: Trophy icon with emerald background

---

## 3. ARCHITECTURE — HOW THE APP WORKS

### CRITICAL: SPA Pattern (NOT file-based routing)
This is a **Single Page Application** inside Next.js. All CRM pages are components, NOT file-system routes.

```
src/app/page.tsx → Entry point
  ├── If NOT logged in → Shows <Login /> component
  └── If logged in → Shows <CRMLayout /> component
                        ├── Sidebar (navigation)
                        ├── Header (search, notifications, user menu)
                        └── Main Content Area
                            └── Uses useState<PageId> to render components
                                ├── dashboard → <Dashboard />
                                ├── leads → <LeadsPage />
                                ├── pipeline → <PipelinePage />
                                └── ... all other pages
```

### Page Registration
All pages are registered in `src/components/crm-layout.tsx` via a switch statement.
New pages MUST be:
1. Created in `src/components/[name]-page.tsx`
2. Added to `PageId` type in `src/components/sidebar.tsx`
3. Added to menu arrays in `src/components/sidebar.tsx`
4. Added to switch statement in `src/components/crm-layout.tsx`
5. Added to `pageTitles` in `src/components/sidebar.tsx`

### Key Files
```
src/
├── app/
│   ├── page.tsx                    # Entry: AuthGate → Login or CRMLayout
│   ├── layout.tsx                  # Root layout: fonts, Toaster
│   ├── globals.css                 # Tailwind + oklch theme variables
│   └── api/                        # 44 API route files (see Section 5)
├── components/
│   ├── crm-layout.tsx              # SPA layout: sidebar + header + page router
│   ├── sidebar.tsx                 # Role-based navigation (21 pages total)
│   ├── header.tsx                  # Top bar: search, notifications, user menu
│   ├── [21 page components].tsx    # All CRM page components
│   ├── [dialog components].tsx     # Create forms (lead, follow-up, user)
│   ├── login.tsx                   # Login form
│   ├── notification-dropdown.tsx   # Bell icon dropdown
│   ├── onboarding-tour.tsx         # First-time user tour
│   └── ui/                         # 43 shadcn/ui components
├── lib/
│   ├── db.ts                       # Prisma singleton (globalThis pattern)
│   ├── auth.ts                     # NextAuth config (JWT, credentials)
│   ├── auth-helpers.ts             # RBAC: requireAuth, requireRole, etc.
│   ├── audit.ts                    # createAuditLog() writer
│   ├── ai-agent.ts                 # 6 AI agents (glm-4-plus) + FAQ + lead scoring + learning
│   ├── ai-learning.ts              # Self-learning engine (10 functions)
│   ├── meta.ts                     # Meta Graph API client (FB + IG)
│   ├── whatsapp.ts                 # WhatsApp Cloud API client
│   ├── email.ts                    # Resend email client (7 templates)
│   ├── workflow-engine.ts          # Workflow automation (8 workflows)
│   ├── webhook-verify.ts           # HMAC-SHA256 webhook signature verify
│   └── utils.ts                    # cn() utility
├── hooks/
│   ├── use-toast.ts                # Toast notifications
│   └── use-mobile.ts               # Mobile detection
prisma/
├── schema.prisma                   # 11 tables
└── seed.ts                         # 7 users, 5 leads, audit logs
```

---

## 4. DATABASE SCHEMA (11 Tables)

### User
- Fields: id, name, email (unique), phone, passwordHash, role, avatarUrl, isActive, lastLogin, createdAt, updatedAt
- Roles: SUPER_ADMIN, ADMIN, SALES_REP
- Relations: assignedLeads, calls, followUpsAssigned, followUpsEscalated, conversations, notifications, reviewedInsights, memberships

### Lead
- Fields: id, firstName, lastName, phone, email, whatsappNumber, source, leadType, interestedFacilities (JSON), leadScore (0-100), temperature, status, assignedRepId, familySize, budgetRange, lostReason, metaAdCampaign, metaAdCreative, remarks, tags (JSON), createdAt, updatedAt
- Sources: META_AD, WHATSAPP, INSTAGRAM, FACEBOOK, WEBSITE, WALK_IN, REFERRAL, MANUAL_IMPORT
- Lead Types: MEMBERSHIP, DAY_PASS, CORPORATE, EVENT, CORPORATE_EVENT, TOURNAMENT, CAMP, OTHER
- Temperature: HOT, WARM, COLD
- Status: NEW → CONTACTED → INTERESTED → NEGOTIATION → BOOKED / LOST / RECOVERED
- Budget: UNDER_10K, 10K_15K, 15K_25K, 25K_50K, 50K_PLUS, NOT_DISCLOSED

### Call
- Fields: id, leadId, repId, direction, callTimestamp, durationSeconds, status, outcome, recordingUrl, transcriptText, aiSummary, aiExtractedInterest (JSON), aiExtractedBudget, aiExtractedObjections (JSON), aiExtractedTimeline, aiSentiment, aiCoachingFlag, aiCoachingNote, repRemarks, createdAt

### Conversation (Unified Inbox)
- Fields: id, leadId, channel, direction, messageText, mediaUrl, sentBy, senderId, aiAgentId, isRead, timestamp
- Channels: WHATSAPP, INSTAGRAM, FACEBOOK, SMS

### FollowUp
- Fields: id, leadId, assignedToId, dueDatetime, priority, status, reason, lastCallSummary, reminderSentAt, reminderSentVia, escalatedToId, escalatedAt, completedAt, completionNotes
- Priority: URGENT, HIGH, NORMAL, LOW
- Status: PENDING → COMPLETED / MISSED / ESCALATED

### Membership
- Fields: id, leadId, repId, planType, planName, startDate, endDate, familyMembersCount, familyMemberNames (JSON), status, renewalReminderSent, renewalReminderSentAt, renewalDate, amountPaid, paymentMethod
- Plan Types: ANNUAL, BI_ANNUAL, MONTHLY_INSTALLMENT, CORPORATE
- Status: ACTIVE, EXPIRING, EXPIRED, RENEWED, CANCELLED

### AuditLog (Immutable)
- Fields: id, actorType, actorId, actorName, entityType, entityId, action, fieldChanged, oldValue, newValue, remarks, ipAddress
- Actor Types: SUPER_ADMIN, ADMIN, SALES_REP, AI_AGENT, SYSTEM

### Notification
- Fields: id, userId, type, title, message, link, isRead, sentVia
- Types: NEW_LEAD, FOLLOW_UP_REMINDER, ESCALATION, CALL_OUTCOME, SYSTEM_ALERT, AI_INSIGHT
- Via: IN_APP, WHATSAPP, BOTH

### AIInsight
- Fields: id, agentId, insightType, description, dataPoints, confidenceScore, proposedChange, expectedImpact, status, reviewedById, reviewedAt, reviewNotes
- Types: PATTERN, SUGGESTION, COACHING, IMPROVEMENT
- Status: PENDING_REVIEW → APPROVED / REJECTED / DEPLOYED

### ChannelConnection
- Fields: id, channel, status, connectedAt, lastHeartbeatAt, accessToken, sessionData, metadata
- Channels: FACEBOOK, INSTAGRAM, WHATSAPP

### AILearning (Self-Improvement)
- Fields: id, type, category, input, output, context (JSON), feedback (positive/negative/neutral), confidence (0-1), frequency, sourceAgent, leadId, channel, language, status (PENDING_REVIEW/APPROVED/REJECTED/AUTO_APPROVED/DEPLOYED), reviewedById, reviewedAt, reviewNotes, deployedAt
- Types: FAQ_CANDIDATE, RESPONSE_FEEDBACK, PATTERN_DISCOVERED, CONVERSATION_OUTCOME, KNOWLEDGE_UPDATE
- Categories: question_answer, objection_handling, pricing_response, facility_info, booking_flow, sentiment_pattern, conversion_strategy

---

## 5. API ROUTES (44 Routes)

| Route | Methods | Auth | Purpose |
|-------|---------|------|---------|
| `/api` | GET | Any | Health check |
| `/api/auth/[...nextauth]` | GET, POST | Public | NextAuth sign-in/sign-out |
| `/api/leads` | GET, POST | Any auth | List (role-filtered), Create (+ workflow trigger) |
| `/api/leads/[id]` | GET, PUT, DELETE | Owner/Admin | Detail, Update, Soft-delete (SA only) |
| `/api/leads/[id]/status` | PUT | Owner/Admin | Status change + auto-temperature + workflow |
| `/api/leads/[id]/remarks` | POST | Owner/Admin | Append timestamped remark |
| `/api/users` | GET, POST | SA only | List all, Create |
| `/api/users/[id]` | GET, PUT, DELETE | SA only | Get, Update, Delete |
| `/api/followups` | GET, POST | Any (role-filtered) | List, Create |
| `/api/followups/[id]` | PUT | Owner/Admin | Status transition, Reschedule |
| `/api/calls` | GET | Any (role-filtered) | List calls |
| `/api/notifications` | GET | Any | List + unread count |
| `/api/notifications/[id]/read` | POST | Any | Mark one read |
| `/api/notifications/read-all` | POST | Any | Mark all read |
| `/api/audit` | GET | ADMIN+ | List audit logs |
| `/api/pipeline` | GET | Any (role-filtered) | Kanban data |
| `/api/import` | GET, POST | SA only | Import history, Bulk import |
| `/api/team-members` | GET | ADMIN+ | Active team list |
| `/api/channels` | GET, POST, DELETE | Read=Any, Write=SA | Channel CRUD |
| `/api/channels/test` | POST | SA only | Test Meta/IG/WhatsApp connection |
| `/api/ai-agents` | GET, PUT | Read=Any, Write=SA | AI config |
| `/api/dashboard/stats` | GET | Any (role-scoped) | Dashboard aggregates |
| `/api/dashboard/hot-leads` | GET | Any (role-filtered) | Hot leads |
| `/api/dashboard/followups` | GET | Any (role-filtered) | Upcoming follow-ups |
| `/api/ai/score-lead` | POST | Any | AI lead scoring |
| `/api/ai/chat` | POST | Any | Customer bot |
| `/api/ai/insights` | GET, PUT | Read=Any, Review=SA | AI insights |
| `/api/ai/followup-suggest` | POST | Owner/Admin | Follow-up suggestions |
| `/api/ai/report` | POST | Any (role-scoped) | Performance reports |
| `/api/ai/data-quality` | POST | ADMIN+ | Data quality audit |
| `/api/ai/call-analysis` | POST | Owner/Admin | Call analysis |
| `/api/webhooks/meta` | GET, POST | Public | Meta FB/IG webhook receiver |
| `/api/webhooks/whatsapp` | GET, POST | Public | WhatsApp webhook receiver |
| `/api/conversations` | GET | Any | Unified inbox conversation list |
| `/api/conversations/[leadId]` | GET | Any | Messages for a lead |
| `/api/messaging/send` | POST | Rep+ | Send outbound message |
| `/api/messaging/whatsapp/sessions` | GET, POST | Rep+ | WhatsApp session management |
| `/api/email/send` | POST | ADMIN+ | Send email (7 templates) |
| `/api/email/templates` | GET | SA only | Email template catalog |
| `/api/workflows` | GET, PUT | SA only | Workflow management |
| `/api/workflows/check` | POST | ADMIN+ | Manual workflow trigger |
| `/api/ai/learning/stats` | GET | ADMIN+ | Learning statistics |
| `/api/ai/learning/patterns` | GET | ADMIN+ | Learning records (filterable) |
| `/api/ai/learning/feedback` | POST | Any auth | Submit feedback on AI response |
| `/api/ai/learning/analyze` | POST | ADMIN+ | Trigger pattern discovery |
| `/api/ai/learning/suggest` | POST | Any auth | AI-suggested smart reply |
| `/api/ai/learning/faqs` | GET, PUT | ADMIN+ | FAQ candidate management |
| `/api/ai/learning/[id]` | GET, PUT | ADMIN+ | Individual learning record |

---

## 6. ALL PAGES (21 Total — ALL WORKING)

| Page ID | Component | Access | Description |
|---------|-----------|--------|-------------|
| unified-inbox | unified-inbox-page.tsx | All | 3-column messaging UI (FB/IG/WhatsApp/SMS), AI auto-response, read receipts |
| dashboard | dashboard.tsx | All | KPI cards, hot leads, follow-ups, rep performance (ADMIN+), channel status, AI status |
| leads | leads-page.tsx + lead-detail.tsx | All | Paginated table, search/filter, inline detail (tabs: info, calls, conversations, follow-ups, memberships, audit) |
| pipeline | pipeline-page.tsx | All | Kanban board (6 columns), drag-and-drop |
| follow-ups | followups-page.tsx | All | List with status filters, create/complete/escalate/reschedule |
| call-history | call-history-page.tsx | All | Call table with outcome/direction/date filters |
| call-recordings | call-recordings-page.tsx | ADMIN+ | Recordings with AI analysis |
| team | team-page.tsx | ADMIN+ | Team overview/performance |
| team-management | team-management-page.tsx | SA only | Full user CRUD |
| memberships | memberships-page.tsx | ADMIN+ | Membership management |
| reports | reports-page.tsx | ADMIN+ | AI-generated reports (daily/weekly/monthly) |
| ai-agents | ai-agents-page.tsx | Read=All, Write=SA | 6 AI agents config |
| ai-insights | ai-insights-page.tsx | Read=All, Review=SA | AI insights review |
| channel-setup | channel-setup-page.tsx | SA only | FB/IG/WhatsApp channels |
| data-import | data-import-page.tsx | SA only | CSV/XLSX import |
| data-export | data-export-page.tsx | SA only | Data export |
| audit-log | audit-log-page.tsx | ADMIN+ | Audit log viewer |
| settings | settings-page.tsx | SA only | System settings |
| help | help-page.tsx | All | FAQ + onboarding tour reset |
| ai-learning | ai-learning-page.tsx | SA only | AI learning dashboard (stats, patterns, FAQ candidates, settings) |
| login | login.tsx | Public | Login form |

---

## 7. RBAC PERMISSION MATRIX

| Feature | SALES_REP | ADMIN | SUPER_ADMIN |
|---------|-----------|-------|-------------|
| View own leads | Y | Y (all) | Y (all) |
| Create lead | Y (self) | Y (any) | Y (round-robin) |
| Reassign lead | N | Y | Y |
| Delete lead | N | N | Y (soft) |
| View follow-ups | Y (own) | Y (all) | Y (all) |
| Create follow-up | Y (self) | Y (any) | Y (any) |
| View calls | Y (own) | Y (all) | Y (all) |
| Team / Memberships / Reports | N | Y | Y |
| Audit log | N | Y | Y |
| User CRUD | N | N | Y |
| Import / Export | N | N | Y |
| AI agent config | Read | Read | Read+Write |
| Channel setup | N | N | Y |
| AI insights review | Read | Read | Y |
| Data quality audit | N | Y | Y |
| Dashboard rep perf | N | Y | Y |
| Unified Inbox | Y (own leads) | Y (all) | Y (all) |
| Send messages | Y (own) | Y (all) | Y (all) |
| Channel test | N | N | Y |
| Email send | N | Y | Y |
| Workflow manage | N | N | Y |
| Sidebar items | 7 | 11 | 21 |

### Sidebar Items by Role
- **SALES_REP (7):** Unified Inbox, Dashboard, My Leads, Pipeline, Follow-Ups, Call History, Help
- **ADMIN (11):** All SALES_REP + Team, Call Recordings, Reports, Memberships
- **SUPER_ADMIN (21):** All ADMIN + AI Agents, AI Insights, AI Learning, Channel Setup, Data Export, Audit Log, Data Import, Settings, Team Management

---

## 8. AI AGENTS (6 Total — glm-4-plus)

| # | Agent | Model | Temp | Purpose |
|---|-------|-------|------|---------|
| 1 | Lead Scoring Engine | glm-4-plus | 0.2 | Hybrid rule-based + LLM scoring (0-100) |
| 2 | Customer Bot | glm-4-plus | 0.5 | Multi-language FAQ (EN/Urdu/Roman Urdu) + LLM chat + self-learning |
| 3 | Call Monitor | glm-4-plus | 0.3 | Call transcript analysis, sentiment, coaching |
| 4 | Follow-Up Agent | glm-4-plus | 0.4 | Follow-up timing + message suggestions |
| 5 | Reporting Agent | glm-4-plus | 0.5 | Daily/weekly/monthly performance reports |
| 6 | Data Quality Agent | glm-4-plus | 0.3 | CRM data quality auditing |

### AI Self-Learning System
- **Engine:** `src/lib/ai-learning.ts` (10 core functions)
- **Records every AI conversation** — input, output, channel, language, outcome
- **Feedback loop:** BOOKED=positive, LOST=negative, rep overrides=corrections
- **FAQ auto-discovery:** Recurring unanswered questions → suggested FAQ candidates
- **Pattern discovery:** Conversion keywords, objection patterns, channel performance
- **Dynamic knowledge base:** Approved learnings fed back into AI system prompts
- **Auto-approval:** frequency >= 5 AND positive feedback >= 70%
- **5-minute cache:** Learning context cached in-memory for performance
- **Dashboard:** AI Learning page (SUPER_ADMIN) — stats, patterns, FAQ candidates, settings
- **Database:** AILearning table (type, category, input, output, feedback, confidence, frequency, status)

---

## 9. LOGIN CREDENTIALS

| Email | Password | Role |
|-------|----------|------|
| admin@spcrm.com | admin123 | SUPER_ADMIN |
| manager@spcrm.com | manager123 | ADMIN |
| ali@spcrm.com | password123 | SALES_REP |
| bilal@spcrm.com | password123 | SALES_REP |
| sara@spcrm.com | password123 | SALES_REP |
| omar@spcrm.com | password123 | SALES_REP |
| zain@spcrm.com | password123 | SALES_REP |

> NOTE: Seed script uses `password123` for sales reps but actual passwords may differ if manually changed. Check the seed.ts for the source of truth.

---

## 10. ENVIRONMENT VARIABLES

```env
# Required for app to run
DATABASE_URL=file:/home/z/my-project/db/custom.db
NEXTAUTH_SECRET=sp-rwp-crm-secret-key-2024
NEXTAUTH_URL=http://localhost:3000

# Infrastructure (not read by app code)
GITHUB_TOKEN=[user's GitHub PAT]
GITHUB_REPO_OWNER=abrar-de-ahmed
GITHUB_REPO_NAME=sp-rwp-crm

CLOUDFLARE_API_TOKEN=[user's CF token]
CLOUDFLARE_ACCOUNT_ID=a9183b9558532b0f2e8ef6e577ea8aa5
CLOUDFLARE_ZONE_ID=[pending - no domain added yet]
```

---

## 11. DECISION LOG

| Date | Decision | Reason | Made By |
|------|----------|--------|---------|
| Session 1 | Use Next.js 14+ App Router | Modern, full-stack capable | AI |
| Session 1 | SQLite via Prisma (not PostgreSQL) | Simpler setup, no external DB needed for dev | AI |
| Session 1 | SPA pattern inside Next.js | Single layout, easier state management | AI |
| Session 1 | 3 roles (not 4+) | Simpler RBAC, covers all use cases | User + AI |
| Session 1 | NextAuth JWT strategy (not DB sessions) | Stateless, scalable | AI |
| Session 2 | shadcn/ui new-york style | Modern, consistent design | AI |
| Session 2 | Emerald/teal primary color | Sports/fitness branding | AI |
| Session 2 | Round-robin lead assignment | Fair distribution among reps | AI |
| Session 2 | Soft delete for leads (not hard) | Data preservation, recoverable | AI |
| Session 3 | Fixed NEXTAUTH_SECRET missing bug | Login was failing silently | AI |
| Session 3 | Added .env.example to repo | Security template for new developers | AI |
| Session 4 | GitHub private repo for backup | Code safety, version control | User |
| Session 4 | Cloudflare for hosting (not Vercel) | User's Vercel is 90% full | User |
| Session 4 | CHAMP.md supervisor agent | Context continuity across chat sessions | User + AI |
| Session 4 | "Fire in the hole" code word | Quick activation protocol | User |
| Session 4 | Zero-cost stack (Meta WhatsApp, Resend, Neon, Cloudflare Pages) | No spending until revenue | User + AI |
| Session 5 | Switch from gpt-4o-mini to glm-4-plus | Free tier, upgrade to paid when revenue starts | User |
| Session 5 | AI Self-Learning Engine | System gets smarter every day from conversations | User + AI |
| Session 5 | AILearning table (11 tables total) | Persistent memory for AI learning patterns | AI |
| Session 5 | Auto-approve learnings at high confidence | Reduce manual review burden while maintaining quality | AI |
| Session 5 | 3-tier AI response: Handoff → Enhanced FAQ → LLM | Cost optimization + learning injection | AI |

---

## 12. BUG TRACKER

| Date | Bug | Root Cause | Fix | Status |
|------|-----|-----------|-----|--------|
| Session 2 | `await` in non-async function | ai-agents-page.tsx used await in Promise callback | Wrapped in async IIFE + Promise.all | FIXED |
| Session 2 | RBAC not enforced on some pages | Pages didn't check roles | Added requireRole() checks to all routes | FIXED |
| Session 3 | Login failure - NEXTAUTH_SECRET missing | .env only had DATABASE_URL | Added NEXTAUTH_SECRET to .env | FIXED |
| Session 3 | .env.example gitignored | .gitignore had `.env*` pattern | Changed to explicit `.env`, `.env.local`, `.env.production` | FIXED |

---

## 13. PHASE ROADMAP

### Phase 1: Foundation ✅ COMPLETE
- Next.js + TypeScript + Tailwind + shadcn/ui setup
- Prisma schema (10 tables)
- NextAuth with 3 roles
- Login page
- CRM Layout (sidebar + header)
- RBAC permission system
- Audit logging

### Phase 2: Core CRM Features ✅ COMPLETE
- Dashboard with KPIs
- Lead management (CRUD + pipeline + Kanban)
- Follow-up system
- Call history
- Team management (user CRUD)
- Data import (CSV/XLSX)
- AI agents configuration
- AI insights
- Channel setup
- Notifications
- Audit log
- Call recordings
- Reports
- Data export
- Memberships
- Settings
- Help page

### Phase 3: Advanced AI + Integrations 🔜 NEXT
| Feature | Priority | Cost | Status |
|---------|----------|------|--------|
| Real AI integration (z-ai-web-dev-sdk) | HIGH | FREE | Pending |
| WhatsApp via Meta Cloud API | HIGH | FREE (1000 convos) | Pending |
| Email automation (Resend) | HIGH | FREE (3000/mo) | Pending |
| Workflow automation | MEDIUM | FREE | Pending |
| Advanced AI reports | MEDIUM | FREE | Pending |
| Mobile responsive optimization | MEDIUM | FREE | Pending |
| Calendar integration | LOW | FREE | Pending |
| Pipeline automation | LOW | FREE | Pending |

### Phase 4: Production Deployment 🔜 PLANNED
| Feature | Priority | Cost | Status |
|---------|----------|------|--------|
| Deploy to Cloudflare Pages | HIGH | FREE | Pending |
| Neon PostgreSQL migration | HIGH | FREE (0.5GB) | Pending |
| Custom domain (SPR) via Cloudflare DNS | HIGH | FREE | Pending |
| CI/CD pipeline (GitHub Actions) | MEDIUM | FREE | Pending |
| Production hardening | MEDIUM | FREE | Pending |
| Performance optimization | MEDIUM | FREE | Pending |

---

## 14. RECOVERY PLAYBOOK

### If the project needs to be rebuilt from scratch:

1. **Get the code:**
   ```bash
   git clone https://github.com/abrar-de-ahmed/sp-rwp-crm.git
   cd sp-rwp-crm
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Setup .env:**
   ```bash
   cp .env.example .env
   # Add: NEXTAUTH_SECRET, DATABASE_URL
   ```

4. **Setup database:**
   ```bash
   npx prisma db push
   npx prisma db seed
   ```

5. **Start dev server:**
   ```bash
   npm run dev
   ```
   Open http://localhost:3000

6. **Login:** admin@spcrm.com / admin123

### If only the database is lost:
```bash
npx prisma db push --force-reset
npx prisma db seed
```

### If only node_modules are lost:
```bash
rm -rf node_modules .next
npm install
npm run dev
```

---

## 15. DEPLOYMENT INSTRUCTIONS (When Ready)

### Cloudflare Pages Setup
1. Connect GitHub repo to Cloudflare Pages
2. Build command: `npm run build`
3. Output directory: `.next`
4. Note: Will need to switch to `output: 'standalone'` or use Cloudflare Workers adapter

### Domain Setup (SPR)
1. Add domain in Cloudflare dashboard
2. Update CLOUDFLARE_ZONE_ID in .env
3. Configure DNS records
4. Enable SSL (auto via Cloudflare)

### Production Database Migration (SQLite → Neon PostgreSQL)
1. Create Neon free tier account
2. Get connection string
3. Update DATABASE_URL in .env
4. Change `provider = "sqlite"` to `provider = "postgresql"` in schema.prisma
5. Run `npx prisma db push`
6. Run `npx prisma db seed`

---

## 16. GIT CONVENTIONS

- **Branch:** `main` (currently single branch)
- **Commit messages:** Descriptive, with scope prefix
- **Protected:** .env file (never committed)
- **Template:** .env.example for new developers

---

## 17. SESSION HISTORY

### Session 1 — Initial Build
- Built complete Next.js project from scratch
- 10 Prisma tables, auth system, RBAC
- Dashboard, Leads, Pipeline pages
- Git initialized

### Session 2 — Feature Expansion
- Added 9 more pages (Follow-ups, Calls, Team, Import, etc.)
- 6 AI agents with full configuration
- Fixed `await` in non-async bug
- Fixed RBAC enforcement across all routes
- Created SP_RWP_CRM_MASTER_PROMPT_v2.md

### Session 3 — Bug Fix + Login
- Diagnosed and fixed NEXTAUTH_SECRET missing from .env
- Login confirmed working
- User tested the application

### Session 4 — Infrastructure + CHAMP + QA (Current)
- User provided GitHub + Cloudflare API keys
- Created private GitHub repo: abrar-de-ahmed/sp-rwp-crm
- Pushed all code (570+ files)
- Added README.md with setup instructions
- Connected Cloudflare account
- Updated .gitignore (explicit .env exclusion)
- Added .env.example template
- Built CHAMP.md supervisor agent (570 lines, 19 sections)
- Planned zero-cost Phase 3 stack
- **QA COMPLETED** — 3 parallel QA agents ran
- Build: PASS (0 errors, 0 warnings)
- API Routes: 30/30 pass (auth, RBAC, error handling all correct)
- Pages: 19/19 pass after fixes
- **Bugs Fixed:**
  - 2 TypeScript errors in ai-agents-page.tsx
  - 5 pages missing RBAC guards (added Access Denied for unauthorized roles)
  - Call recordings remarks not persisting to API (added fetch call)
  - React Fragment key warnings in lead-detail.tsx and call-history-page.tsx
  - Memberships export using wrong API (now extracts from leads with memberships)
- Build passes clean after all fixes
- All code pushed to GitHub

---

## 18. NEXT ACTIONS

### Completed
1. [x] Complete QA of all 19 pages
2. [x] Test all RBAC permissions for each role
3. [x] Test all API routes
4. [x] Update CHAMP.md with QA results
5. [x] Push final code to GitHub
6. [x] Real AI integration — all 6 agents working with z-ai-web-dev-sdk
7. [x] Meta/Facebook integration — webhook + AI auto-response + outbound
8. [x] Instagram integration — DM + comment webhooks + AI response
9. [x] WhatsApp Cloud API — webhook + AI 3-tier response + templates
10. [x] Email automation — Resend 7 templates
11. [x] Workflow automation engine — 8 workflows, wired into routes
12. [x] Unified Inbox page — 3-column messaging UI
13. [x] Model switch: gpt-4o-mini → glm-4-plus (free tier)
14. [x] AI Self-Learning Engine — conversation memory, FAQ discovery, pattern detection
15. [x] AI Learning Dashboard — stats, patterns, FAQ candidates, settings
16. [x] AILearning database table (11 tables total)

### Phase 3 Testing (Next)
1. [ ] Set up Meta Developer App for craftedmindss
2. [ ] Connect Facebook page + test webhooks
3. [ ] Connect Instagram + test webhooks
4. [ ] Set up WhatsApp Business number + test
5. [ ] Set up Resend account + test emails
6. [ ] Mobile responsive pass

### Phase 4 (Production)
1. [ ] Cloudflare Pages deployment
2. [ ] Neon PostgreSQL migration
3. [ ] SPR domain + DNS setup
4. [ ] CI/CD pipeline

---

## 19. IMPORTANT NOTES FOR NEW SESSIONS

- **ALWAYS read CHAMP.md first** when activated with "Fire in the hole"
- **NEVER commit .env** — always use .env.example as template
- **ALWAYS update CHAMP.md** after any significant work
- **PUSH to GitHub** after every completed task
- **Test login** after any auth changes (known issue: NEXTAUTH_SECRET required)
- **The app uses SPA pattern** — new pages need registration in sidebar.tsx + crm-layout.tsx
- **User prefers zero-cost solutions** — avoid paid services unless explicitly approved
- **User timezone:** Asia/Karachi
- **Dev server:** runs on port 3000
- **Database:** SQLite at db/custom.db
- **Runtime:** Bun (not npm/node)

---

*CHAMP is maintained by the AI assistant. Updated at the end of every significant work session.*
*If you're reading this and CHAMP seems outdated, check the git commit history for context.*
