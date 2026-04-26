# ARCHITECT — Technical Architect Agent

> **Role:** You are the Technical Architect. You own every technical decision, pattern, bug fix, file structure, and schema choice. When anyone asks "why was X built this way?" or "how does Y work under the hood?" — you answer.
>
> **Last Updated:** 2026-04-27

---

## 1. TECH STACK (Locked Decisions)

| Layer | Technology | Why |
|-------|-----------|-----|
| Framework | Next.js 16.1 (App Router) | Modern, full-stack, App Router is the standard |
| Language | TypeScript 5 | Type safety across 44+ API routes |
| React | React 19 | Latest stable, concurrent features |
| Styling | Tailwind CSS 4 + oklch color system | oklch = perceptually uniform colors, better than hex/hsl |
| UI Library | shadcn/ui (new-york style, 43 components) | Not a dependency — copy-paste components, full ownership |
| Database | SQLite via Prisma ORM 6.11 (file: db/custom.db) | Zero-config for dev, Prisma gives type-safe queries |
| Auth | NextAuth.js v4 (JWT strategy, 24h sessions) | Stateless, scalable, no DB sessions table needed |
| AI | z-ai-web-dev-sdk (glm-4-plus, free tier) | Free LLM, good enough for MVP, switch to paid later |
| Meta API | Meta Graph API v19.0 | Facebook + Instagram integration via webhooks |
| WhatsApp | WhatsApp Cloud API via Meta Business | Free 1000 conversations/month |
| Email | Resend API (REST, no npm package) | Direct fetch() calls, no package bloat |
| Charts | Recharts | React-native charting, composable |
| Drag & Drop | @dnd-kit/core + @dnd-kit/sortable | Pipeline Kanban drag-and-drop |
| Icons | lucide-react | Consistent icon set |
| Forms | react-hook-form + @hookform/resolvers + zod | Validated forms everywhere |
| State | React useState (SPA pattern) | Simple, no Redux needed |
| Package Manager | Bun | Faster than npm |
| Fonts | Geist Sans + Geist Mono (next/font/google) | Clean, modern, optimized loading |
| Date | date-fns | Lightweight date manipulation |

### Theme
- Primary hue: 155 (emerald/teal green) — sports/fitness branding
- Color system: oklch (perceptually uniform, no more "why does this blue look different?")
- Dark mode: class strategy (`dark:` prefix in Tailwind)
- Logo: Trophy icon with emerald background

### Cost Stack
| Service | Cost | Limit |
|---------|------|-------|
| Cloudflare Pages | FREE | Unlimited static |
| Neon PostgreSQL | FREE | 0.5 GB |
| Meta WhatsApp | FREE | 1000 convos/month |
| Resend Email | FREE | 3000/month |
| GLM-4 Plus | FREE | Generous free tier |
| Cloudflare Workers | FREE | 100k requests/day |

---

## 2. CRITICAL ARCHITECTURE: SPA Pattern

**THIS IS THE MOST IMPORTANT THING TO UNDERSTAND.**

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
                                └── ... all 21 pages
```

### Page Registration Protocol (5 Steps — NEVER skip)
1. Create component in `src/components/[name]-page.tsx`
2. Add to `PageId` type in `src/components/sidebar.tsx`
3. Add to menu arrays in `src/components/sidebar.tsx` (by role)
4. Add to switch statement in `src/components/crm-layout.tsx`
5. Add to `pageTitles` in `src/components/sidebar.tsx`

**If you add a page without doing all 5 steps, it won't appear in the app.**

---

## 3. COMPLETE FILE MAP

```
src/
├── app/
│   ├── page.tsx                    # Entry: AuthGate → Login or CRMLayout
│   ├── layout.tsx                  # Root layout: fonts, Toaster
│   ├── globals.css                 # Tailwind + oklch theme variables
│   └── api/                        # 44 API route files
│       ├── leads/
│       │   ├── route.ts            # GET (list), POST (create + workflow trigger)
│       │   └── [id]/
│       │       ├── route.ts        # GET, PUT, DELETE (soft delete, SA only)
│       │       ├── status/route.ts # PUT (status change + auto-temp + workflow)
│       │       └── remarks/route.ts # POST (append timestamped remark)
│       ├── users/
│       │   ├── route.ts            # GET, POST (SA only)
│       │   └── [id]/route.ts       # GET, PUT, DELETE (SA only)
│       ├── followups/
│       │   ├── route.ts            # GET, POST
│       │   └── [id]/route.ts       # PUT (status transition, reschedule)
│       ├── calls/route.ts          # GET
│       ├── notifications/
│       │   ├── route.ts            # GET (list + unread count)
│       │   ├── [id]/read/route.ts  # POST
│       │   └── read-all/route.ts   # POST
│       ├── audit/route.ts          # GET (ADMIN+)
│       ├── pipeline/route.ts       # GET (Kanban data)
│       ├── import/route.ts         # GET, POST (SA only)
│       ├── team-members/route.ts   # GET (ADMIN+)
│       ├── channels/
│       │   ├── route.ts            # GET, POST, DELETE
│       │   └── test/route.ts       # POST (SA only)
│       ├── ai-agents/route.ts      # GET, PUT
│       ├── dashboard/
│       │   ├── stats/route.ts      # GET (KPIs)
│       │   ├── hot-leads/route.ts  # GET
│       │   └── followups/route.ts  # GET
│       ├── ai/
│       │   ├── score-lead/route.ts     # POST
│       │   ├── chat/route.ts           # POST (customer bot)
│       │   ├── insights/route.ts       # GET, PUT
│       │   ├── followup-suggest/route.ts # POST
│       │   ├── report/route.ts         # POST
│       │   ├── data-quality/route.ts   # POST (ADMIN+)
│       │   ├── call-analysis/route.ts  # POST
│       │   ├── learning/
│       │   │   ├── stats/route.ts      # GET (ADMIN+)
│       │   │   ├── patterns/route.ts   # GET (ADMIN+)
│       │   │   ├── feedback/route.ts   # POST
│       │   │   ├── analyze/route.ts    # POST (ADMIN+)
│       │   │   ├── suggest/route.ts    # POST
│       │   │   ├── faqs/route.ts       # GET, PUT (ADMIN+)
│       │   │   └── [id]/route.ts       # GET, PUT (ADMIN+)
│       ├── webhooks/
│       │   ├── meta/route.ts           # GET (verify), POST (receive)
│       │   └── whatsapp/route.ts       # GET (verify), POST (receive)
│       ├── conversations/
│       │   ├── route.ts                # GET
│       │   └── [leadId]/route.ts       # GET
│       ├── messaging/
│       │   ├── send/route.ts           # POST (Rep+)
│       │   └── whatsapp/sessions/route.ts # GET, POST
│       ├── email/
│       │   ├── send/route.ts           # POST (ADMIN+)
│       │   └── templates/route.ts      # GET (SA only)
│       └── workflows/
│           ├── route.ts                # GET, PUT (SA only)
│           └── check/route.ts          # POST (ADMIN+)
├── components/
│   ├── crm-layout.tsx              # SPA layout: sidebar + header + page router
│   ├── sidebar.tsx                 # Role-based navigation (21 pages total)
│   ├── header.tsx                  # Top bar: search, notifications, user menu
│   ├── dashboard.tsx               # KPI cards, hot leads, follow-ups
│   ├── leads-page.tsx              # Paginated table, search/filter
│   ├── lead-detail.tsx             # Inline detail with tabs
│   ├── pipeline-page.tsx           # Kanban board (6 columns)
│   ├── followups-page.tsx          # Follow-up list
│   ├── call-history-page.tsx       # Call table
│   ├── call-recordings-page.tsx    # Recordings with AI analysis
│   ├── team-page.tsx               # Team overview
│   ├── team-management-page.tsx    # User CRUD
│   ├── memberships-page.tsx        # Membership management
│   ├── reports-page.tsx            # AI-generated reports
│   ├── ai-agents-page.tsx          # 6 AI agents config
│   ├── ai-insights-page.tsx        # AI insights review
│   ├── channel-setup-page.tsx      # FB/IG/WhatsApp channels
│   ├── data-import-page.tsx        # CSV/XLSX import
│   ├── data-export-page.tsx        # Data export
│   ├── audit-log-page.tsx          # Audit log viewer
│   ├── settings-page.tsx           # System settings
│   ├── help-page.tsx               # FAQ + onboarding
│   ├── ai-learning-page.tsx        # AI learning dashboard
│   ├── unified-inbox-page.tsx      # 3-column messaging UI
│   ├── login.tsx                   # Login form
│   ├── notification-dropdown.tsx   # Bell icon dropdown
│   ├── onboarding-tour.tsx         # First-time user tour
│   ├── create-lead-dialog.tsx      # Lead creation form
│   ├── create-follow-up-dialog.tsx # Follow-up creation
│   ├── create-user-dialog.tsx      # User creation
│   └── ui/                         # 43 shadcn/ui components
├── lib/
│   ├── db.ts                       # Prisma singleton (globalThis pattern)
│   ├── auth.ts                     # NextAuth config (JWT, credentials)
│   ├── auth-helpers.ts             # RBAC: requireAuth, requireRole
│   ├── audit.ts                    # createAuditLog() writer
│   ├── ai-agent.ts                 # 6 AI agents + FAQ + lead scoring + learning
│   ├── ai-learning.ts              # Self-learning engine (10 functions)
│   ├── meta.ts                     # Meta Graph API client
│   ├── whatsapp.ts                 # WhatsApp Cloud API client
│   ├── email.ts                    # Resend email client (7 templates)
│   ├── workflow-engine.ts          # Workflow automation (8 workflows)
│   ├── webhook-verify.ts           # HMAC-SHA256 webhook verification
│   └── utils.ts                    # cn() utility
├── hooks/
│   ├── use-toast.ts                # Toast notifications
│   └── use-mobile.ts               # Mobile detection
prisma/
├── schema.prisma                   # 11 tables
└── seed.ts                         # 7 users, 5 leads, audit logs
```

---

## 4. DATABASE SCHEMA (11 Tables — Every Field)

### User
```
id           String   @id @default(cuid())
name         String
email        String   @unique
phone        String?
passwordHash String
role         Role     @default(SALES_REP)   // SUPER_ADMIN | ADMIN | SALES_REP
avatarUrl    String?
isActive     Boolean  @default(true)
lastLogin    DateTime?
createdAt    DateTime @default(now())
updatedAt    DateTime @updatedAt
```

### Lead
```
id                    String    @id @default(cuid())
firstName             String
lastName              String
phone                 String
email                 String?
whatsappNumber        String?
source                LeadSource @default(MANUAL_IMPORT)
leadType              LeadType   @default(MEMBERSHIP)
interestedFacilities  Json       @default("[]")
leadScore             Int        @default(0)       // 0-100
temperature           Temperature @default(COLD)   // HOT | WARM | COLD
status                LeadStatus @default(NEW)     // NEW | CONTACTED | INTERESTED | NEGOTIATION | BOOKED | LOST | RECOVERED
assignedRepId         String?
familySize            Int?
budgetRange           BudgetRange?
lostReason            String?
metaAdCampaign        String?
metaAdCreative        String?
remarks               Json       @default("[]")    // Array of {text, timestamp, author}
tags                  Json       @default("[]")
createdAt             DateTime   @default(now())
updatedAt             DateTime   @updatedAt
```

### Call
```
id                     String    @id @default(cuid())
leadId                 String
repId                  String
direction              CallDirection  // INBOUND | OUTBOUND
callTimestamp          DateTime
durationSeconds        Int?
status                 CallStatus     // SCHEDULED | COMPLETED | MISSED | NO_ANSWER | BUSY | FAILED
outcome                String?
recordingUrl           String?
transcriptText         String?
aiSummary              String?
aiExtractedInterest    Json?
aiExtractedBudget      String?
aiExtractedObjections  Json?
aiExtractedTimeline    String?
aiSentiment            String?        // POSITIVE | NEGATIVE | NEUTRAL
aiCoachingFlag         Boolean?
aiCoachingNote         String?
repRemarks             String?
createdAt              DateTime  @default(now())
```

### Conversation (Unified Inbox)
```
id           String       @id @default(cuid())
leadId       String
channel      Channel      // WHATSAPP | INSTAGRAM | FACEBOOK | SMS
direction    Direction    // INBOUND | OUTBOUND
messageText  String
mediaUrl     String?
sentBy       String?      // "AI_AGENT" | rep name
senderId     String?
aiAgentId    String?
isRead       Boolean      @default(false)
timestamp    DateTime     @default(now())
```

### FollowUp
```
id               String       @id @default(cuid())
leadId           String
assignedToId     String
dueDatetime      DateTime
priority         FollowUpPriority  // URGENT | HIGH | NORMAL | LOW
status           FollowUpStatus    // PENDING | COMPLETED | MISSED | ESCALATED
reason           String?
lastCallSummary  String?
reminderSentAt   DateTime?
reminderSentVia  String?
escalatedToId    String?
escalatedAt      DateTime?
completedAt      DateTime?
completionNotes  String?
```

### Membership
```
id                    String        @id @default(cuid())
leadId                String
repId                 String
planType              MembershipPlan  // ANNUAL | BI_ANNUAL | MONTHLY_INSTALLMENT | CORPORATE
planName              String
startDate             DateTime
endDate               DateTime
familyMembersCount    Int?
familyMemberNames     Json?
status                MembershipStatus  // ACTIVE | EXPIRING | EXPIRED | RENEWED | CANCELLED
renewalReminderSent   Boolean      @default(false)
renewalReminderSentAt DateTime?
renewalDate           DateTime?
amountPaid            Float?
paymentMethod         String?
```

### AuditLog (Immutable — NO DELETES)
```
id          String     @id @default(cuid())
actorType   AuditActor // SUPER_ADMIN | ADMIN | SALES_REP | AI_AGENT | SYSTEM
actorId     String
actorName   String
entityType  String     // "Lead", "User", "FollowUp", etc.
entityId    String     // PLAIN STRING — NO FK constraint (intentional)
action      String     // "CREATE", "UPDATE", "DELETE", "STATUS_CHANGE"
fieldChanged String?
oldValue    String?
newValue    String?
remarks     String?
ipAddress   String?
createdAt   DateTime   @default(now())
```

**CRITICAL:** `entityId` is a plain String, NOT a foreign key to any table. This was intentionally changed in Session 6 because FK to Lead.id caused 500 crashes when auditing non-Lead entities (channels, users, etc.).

### Notification
```
id        String       @id @default(cuid())
userId    String
type      NotificationType  // NEW_LEAD | FOLLOW_UP_REMINDER | ESCALATION | CALL_OUTCOME | SYSTEM_ALERT | AI_INSIGHT
title     String
message   String
link      String?
isRead    Boolean      @default(false)
sentVia   String       // "IN_APP" | "WHATSAPP" | "BOTH"
createdAt DateTime     @default(now())
```

### AIInsight
```
id               String          @id @default(cuid())
agentId          String
insightType      AIInsightType   // PATTERN | SUGGESTION | COACHING | IMPROVEMENT
description      String
dataPoints       Json?
confidenceScore  Float?
proposedChange   String?
expectedImpact   String?
status           AIInsightStatus // PENDING_REVIEW | APPROVED | REJECTED | DEPLOYED
reviewedById     String?
reviewedAt       DateTime?
reviewNotes      String?
createdAt        DateTime        @default(now())
updatedAt        DateTime        @updatedAt
```

### ChannelConnection
```
id              String   @id @default(cuid())
channel         Channel  // FACEBOOK | INSTAGRAM | WHATSAPP
status          String   // "CONNECTED" | "DISCONNECTED" | "PENDING"
connectedAt     DateTime?
lastHeartbeatAt DateTime?
accessToken     String?
sessionData     Json?
metadata        Json?
createdAt       DateTime @default(now())
updatedAt       DateTime @updatedAt
```

### AILearning (Self-Improvement)
```
id             String          @id @default(cuid())
type           AILearningType  // FAQ_CANDIDATE | RESPONSE_FEEDBACK | PATTERN_DISCOVERED | CONVERSATION_OUTCOME | KNOWLEDGE_UPDATE
category       String          // question_answer | objection_handling | pricing_response | facility_info | booking_flow | sentiment_pattern | conversion_strategy
input          String
output         String
context        Json?
feedback       String?         // "positive" | "negative" | "neutral"
confidence     Float           @default(0.0)   // 0.0 - 1.0
frequency      Int             @default(1)
sourceAgent    String?
leadId         String?
channel        String?
language       String?
status         AILearningStatus  // PENDING_REVIEW | APPROVED | REJECTED | AUTO_APPROVED | DEPLOYED
reviewedById   String?
reviewedAt     DateTime?
reviewNotes    String?
deployedAt     DateTime?
createdAt      DateTime        @default(now())
updatedAt      DateTime        @updatedAt
```

---

## 5. DECISION LOG (Why things are the way they are)

| Date | Decision | Reason | Made By |
|------|----------|--------|---------|
| S1 | Next.js 14+ App Router | Modern, full-stack capable | AI |
| S1 | SQLite via Prisma (not PostgreSQL) | Simpler setup, no external DB for dev | AI |
| S1 | SPA pattern inside Next.js | Single layout, easier state management | AI |
| S1 | 3 roles (not 4+) | Simpler RBAC, covers all use cases | User + AI |
| S1 | NextAuth JWT strategy | Stateless, scalable | AI |
| S2 | shadcn/ui new-york style | Modern, consistent design | AI |
| S2 | Emerald/teal primary color | Sports/fitness branding | AI |
| S2 | Round-robin lead assignment | Fair distribution among reps | AI |
| S2 | Soft delete for leads | Data preservation, recoverable | AI |
| S3 | Fixed NEXTAUTH_SECRET | Login was failing silently | AI |
| S3 | .env.example in repo | Security template for new devs | AI |
| S4 | GitHub private repo | Code safety, version control | User |
| S4 | Cloudflare (not Vercel) | User's Vercel is 90% full | User |
| S4 | Zero-cost stack | No spending until revenue | User + AI |
| S5 | Switch gpt-4o-mini → glm-4-plus | Free tier, upgrade when revenue | User |
| S5 | AI Self-Learning Engine | System gets smarter from conversations | User + AI |
| S5 | Auto-approve learnings at high confidence | Reduce manual review burden | AI |
| S5 | 3-tier AI response: FAQ → Learned → LLM | Cost optimization + learning injection | AI |
| S6 | AuditLog entityId = plain String (no FK) | FK to Lead.id caused crashes for non-Lead entities | AI |
| S6 | WhatsApp fields: Phone Number ID + Token + Secret | Meta API needs all 3, not just phone | AI |

---

## 6. BUG TRACKER (What broke and why)

| Date | Bug | Root Cause | Fix | Status |
|------|-----|-----------|-----|--------|
| S2 | `await` in non-async function | ai-agents-page.tsx used await in Promise callback | Wrapped in async IIFE + Promise.all | FIXED |
| S2 | RBAC not enforced on some pages | Pages didn't check roles | Added requireRole() checks | FIXED |
| S3 | Login failure — silent | NEXTAUTH_SECRET missing from .env | Added NEXTAUTH_SECRET to .env | FIXED |
| S3 | .env.example gitignored | .gitignore had `.env*` pattern | Changed to explicit exclusions | FIXED |
| S4 | TypeScript errors in ai-agents-page.tsx | Type mismatches | Fixed types, added proper interfaces | FIXED |
| S4 | 5 pages missing RBAC guards | Pages rendered for unauthorized roles | Added Access Denied for unauthorized | FIXED |
| S4 | Call recordings remarks not saving | Missing fetch call after submit | Added API call | FIXED |
| S4 | React Fragment key warnings | Missing keys in mapped fragments | Added proper keys | FIXED |
| S4 | Memberships export wrong API | Using leads API instead of memberships | Fixed to extract from leads with memberships | FIXED |
| S6 | Login password mismatch | Seed had wrong password for admin | Fixed admin to `admin123` | FIXED |
| S6 | Channel connection 500 errors | AuditLog FK constraint on entityId | Removed FK, made entityId plain String | FIXED |
| S6 | WhatsApp connect incomplete | Only had phone field, needed 3 fields | Rebuilt UI with Phone Number ID, Token, Secret | FIXED |

---

## 7. KEY PATTERNS & CONVENTIONS

### API Route Pattern
```typescript
import { requireAuth } from '@/lib/auth-helpers';
import { requireRole } from '@/lib/auth-helpers';
import { createAuditLog } from '@/lib/audit';

export async function GET(req: Request) {
  const session = await requireAuth();
  // Role check if needed
  if (session.user.role !== 'SUPER_ADMIN') {
    return requireRole(session, ['ADMIN', 'SUPER_ADMIN']);
  }
  // ... business logic
  return Response.json(data);
}
```

### Prisma Singleton Pattern (db.ts)
```typescript
const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };
export const prisma = globalForPrisma.prisma || new PrismaClient();
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
```

### AI Agent Pattern
All AI agents use z-ai-web-dev-sdk with glm-4-plus:
```typescript
import ZAI from 'z-ai-web-dev-sdk';
const zai = await ZAI.create();
const completion = await zai.chat.completions.create({
  messages: [...],
  temperature: 0.3,  // varies by agent
});
```

### Webhook Verification
```typescript
import { verifyWebhookSignature } from '@/lib/webhook-verify';
// HMAC-SHA256 verification for Meta webhooks
```

### 3-Tier AI Response (WhatsApp/Customer Bot)
1. **FAQ Match** — Exact/similar match from approved FAQs (instant, free)
2. **Learned Response** — From AILearning table with high confidence (fast, free)
3. **LLM Fallback** — Full GLM-4 Plus call (slower, costs tokens)

---

## 8. WHAT WE'D DO DIFFERENTLY NEXT TIME

| What | Why | Better Approach |
|------|-----|----------------|
| SPA pattern | Hard to deep-link, no URL routing | Consider file-based routing for large apps |
| SQLite in dev | Doesn't support concurrent writes well | Start with PostgreSQL even in dev |
| Single CHAMP.md | Got too big (730 lines) | Agent files from day 1 |
| Manual RBAC guards | Easy to forget on new pages | Middleware-based auth |

---

*Architect maintains this file. Updated after every significant technical decision or bug fix.*
