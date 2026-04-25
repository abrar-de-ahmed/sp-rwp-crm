# ARCHITECT — The Architect Agent | SP RWP CRM

> **Role:** Technical Architect — knows every line, every decision, every failure
> **Updated:** 2026-04-26
> **Reports to:** CHAMP (Supervisor)

## PURPOSE
I am the Architect Agent. I hold ALL technical knowledge about this codebase —
every decision made, every bug found and fixed, every pattern established,
every anti-pattern discovered. New chat sessions read me to avoid repeating
mistakes and to build consistently with established patterns.

## ACTIVATION
When CHAMP activates, it reads ALL agent files. I provide the technical brain.

---

## 1. TECH STACK (Locked)

| Layer | Technology | Version | Why |
|-------|-----------|---------|-----|
| Framework | Next.js (App Router) | 16.1 | Full-stack, modern, Turbopack |
| Language | TypeScript | 5 | Type safety |
| React | React | 19 | Latest with Server Components |
| Styling | Tailwind CSS | 4 | oklch color system, utility-first |
| UI Library | shadcn/ui | new-york | 43 components installed |
| Database | SQLite via Prisma | 6.11 | Dev simplicity, migrate to Neon later |
| Auth | NextAuth.js | v4 | JWT strategy, 24h sessions |
| AI | z-ai-web-dev-sdk | 0.0.17 | glm-4-plus, free tier |
| Meta API | Graph API | v19.0 | FB + IG webhooks |
| WhatsApp | Cloud API via Meta | v19.0 | 3-tier AI response |
| Email | Resend | REST API | 7 templates, no npm package |
| Charts | Recharts | latest | Dashboard visualizations |
| DnD | @dnd-kit | latest | Kanban board |
| Icons | lucide-react | latest | Consistent icon set |
| Forms | react-hook-form + zod | latest | Validation |
| State | React useState | built-in | SPA pattern within CRMLayout |

### NEVER Change These Unless:
- User explicitly requests it
- Current library is abandoned/broken
- Migration is planned and documented in CHAMP.md

---

## 2. ARCHITECTURE PATTERNS (Established)

### SPA Pattern (NOT file-based routing)
```
src/app/page.tsx → AuthGate → Login or CRMLayout
CRMLayout uses useState<PageId> to render page components
All pages are in src/components/[name]-page.tsx
```
**Why:** Single layout, no page reloads, smoother UX, easier state management.

### Page Registration (5-step mandatory process)
1. Create component: `src/components/[name]-page.tsx`
2. Add to `PageId` type in `src/components/sidebar.tsx`
3. Add to menu arrays in `src/components/sidebar.tsx` (per role)
4. Add to switch statement in `src/components/crm-layout.tsx`
5. Add to `pageTitles` in `src/components/sidebar.tsx`

**Common mistake:** Forgetting step 5 — page has no title in sidebar.

### API Route Pattern
```typescript
// Every route follows this structure:
import { requireAuth, requireRole } from '@/lib/auth-helpers';

export async function GET/POST/PUT/DELETE(request: NextRequest) {
  try {
    const session = await requireAuth(); // or requireRole('SUPER_ADMIN')
    // ... business logic
    return NextResponse.json({ data });
  } catch (error) {
    if (error instanceof Response) return error;
    console.error('[route-name] Error:', error);
    return NextResponse.json({ error: 'Description' }, { status: 500 });
  }
}
```

### AI Call Pattern (Single entry point)
ALL AI calls go through ONE function: `callLLM()` in `src/lib/ai-agent.ts`
- Model: glm-4-plus
- Parameters: prompt, systemPrompt, options (temperature, maxTokens, learningContext)
- The learning context is automatically injected from approved AILearning records
- NEVER call the AI SDK directly from route handlers — always use callLLM()

### 3-Tier AI Response Pattern (Webhooks)
```
Incoming Message
  → shouldHandoffToHuman()? → YES: Handoff + notify rep
  → matchFAQ()?              → YES: Send FAQ answer
  → callLLM()                → NO: LLM generates contextual response
  → recordAIConversation()    → Non-blocking (.catch(() => {}))
```
**Critical:** AI recording is ALWAYS non-blocking. Never let learning crash the main flow.

---

## 3. DATABASE DESIGN (11 Tables)

### Critical Design Decisions:
- **AuditLog has NO foreign key** on entityId — it's used for all entity types (Lead, User, Setting, Channel, etc.). Originally had FK to Lead.id which caused crashes.
- **Soft delete for leads** — never hard delete, set status to LOST
- **JSON strings for arrays** — interestedFacilities, tags, etc. stored as JSON strings (SQLite limitation), parsed with JSON.parse()
- **CUID for IDs** — all primary keys use cuid() generation

### Table Relationships:
```
User → assignedLeads (Lead[])
User → calls (Call[])
User → followUpsAssigned (FollowUp[])
User → followUpsEscalated (FollowUp[])
Lead → calls (Call[])
Lead → conversations (Conversation[])
Lead → followUps (FollowUp[])
Lead → memberships (Membership[])
ChannelConnection — standalone (no FK)
AILearning — standalone (no FK)
AIInsight — reviewedBy → User
```

### Migration Path (Future):
- SQLite → Neon PostgreSQL
- Change `provider = "sqlite"` to `provider = "postgresql"` in schema.prisma
- JSON string fields can become actual JSON columns
- Update DATABASE_URL in .env

---

## 4. KNOWN BUGS & FIXES (Learned The Hard Way)

### Session 6 Bugs:
| Bug | Root Cause | Fix |
|-----|-----------|-----|
| Login "Invalid password" | Seed script used `password123` for ALL users including admin | Split passwords: admin/manager=`admin123`, reps=`password123`. Also changed upsert to update passwords on re-seed (was `update: {}` before) |
| Channel connection "Failed to connect" (500) | AuditLog.entityId had FK to Lead.id. When logging non-Lead entities (SETTING, CHANNEL), FK violated | Removed FK constraint: `lead Lead? @relation(...)` from AuditLog model and `auditLogs @relation(...)` from Lead model |
| Missing /api/channels/test route | Route was never created, frontend 404'd | Created full test route with Meta token verification (Graph API /me/accounts) and WhatsApp token verification (phone number endpoint) |
| WhatsApp dialog only asked for phone number | UI was too simple — needed Phone Number ID + Access Token + App Secret | Rebuilt dialog with 3 fields, guide, and test connection button |

### Session 4-5 Bugs:
| Bug | Root Cause | Fix |
|-----|-----------|-----|
| `await` in non-async | ai-agents-page.tsx used await in Promise callback | Wrapped in async IIFE + Promise.all |
| RBAC gaps | 5 pages missing role checks | Added requireRole() guards |
| Call recordings not saving | Missing fetch call in component | Added API call |
| React Fragment key warnings | Array rendering without keys | Added unique keys |

### Patterns That Cause Bugs:
1. **Forgetting to register pages** — always follow 5-step process
2. **AuditLog with non-Lead entityId** — entityId has NO FK constraint, any ID is valid
3. **Re-seed not updating existing data** — always use `update: { ... }` in upsert, never `update: {}`
4. **Server restart during DB operations** — kills SQLite, corrupts database
5. **Missing error logging** — always include `console.error('[route-name] Error:', error)` in catch blocks

---

## 5. FILE STRUCTURE MAP

```
src/
├── app/
│   ├── page.tsx                    # Entry: AuthGate → Login or CRMLayout
│   ├── layout.tsx                  # Root layout: fonts, Toaster
│   ├── globals.css                 # Tailwind + oklch theme variables
│   └── api/                        # 45 API routes (see CHAMP.md Section 5)
│       ├── auth/[...nextauth]/     # NextAuth handler
│       ├── leads/                  # CRUD + status + remarks
│       ├── users/                  # CRUD
│       ├── followups/              # CRUD + status transitions
│       ├── calls/                  # List only
│       ├── conversations/          # Unified inbox
│       ├── channels/               # Channel CRUD + test
│       ├── notifications/          # Read + mark read
│       ├── ai/                     # 6 AI endpoints + 7 learning endpoints
│       ├── webhooks/               # meta + whatsapp receivers
│       ├── messaging/              # Send + WhatsApp sessions
│       ├── email/                  # Send + templates
│       ├── workflows/              # Manage + check
│       └── [dashboard,pipeline,import,audit,team]/
├── components/
│   ├── crm-layout.tsx              # SPA layout + page router (switch)
│   ├── sidebar.tsx                 # Role-based nav + PageId type + pageTitles
│   ├── header.tsx                  # Search, notifications, user menu
│   ├── [21 page components].tsx
│   ├── [dialog components].tsx
│   ├── login.tsx
│   └── ui/                         # 43 shadcn/ui components
├── lib/
│   ├── db.ts                       # Prisma singleton
│   ├── auth.ts                     # NextAuth config
│   ├── auth-helpers.ts             # RBAC helpers
│   ├── audit.ts                    # Audit log writer
│   ├── ai-agent.ts                 # 6 agents + callLLM() + FAQ + scoring
│   ├── ai-learning.ts              # 10 learning functions
│   ├── meta.ts                     # Meta API client
│   ├── whatsapp.ts                 # WhatsApp API client
│   ├── email.ts                    # Resend client + 7 templates
│   ├── workflow-engine.ts          # 8 workflow types
│   ├── webhook-verify.ts           # HMAC-SHA256 verification
│   └── utils.ts                    # cn() utility
agents/
├── CHAMP.md                        # Supervisor — entry point
├── ARCHITECTURE.md                 # THIS FILE — technical brain
├── CRM_BRAIN.md                    # Customer intelligence
├── PLAYBOOK.md                     # Operations procedures
├── CLIENT_CONTEXT.md               # Client-specific data
├── RAG_PLAYBOOK.md                 # Client onboarding
└── QA_EXPERT.md                    # Quality assurance
```

---

## 6. ENVIRONMENT & DEPLOYMENT

### Dev Environment:
- Port: 3000
- Database: SQLite at `db/custom.db`
- Runtime: Bun (not npm)
- User timezone: Asia/Karachi

### Required .env variables:
```
DATABASE_URL=file:/home/z/my-project/db/custom.db
NEXTAUTH_SECRET=sp-rwp-crm-secret-key-2024
NEXTAUTH_URL=http://localhost:3000
```

### Channel .env variables (when connecting):
```
META_APP_ID=
META_APP_SECRET=
FB_PAGE_ACCESS_TOKEN=
WA_PHONE_NUMBER_ID=
WA_ACCESS_TOKEN=
WHATSAPP_APP_SECRET=
RESEND_API_KEY=
```

### Production Migration Checklist:
- [ ] SQLite → Neon PostgreSQL (change provider in schema.prisma)
- [ ] Add `output: 'standalone'` to next.config.js for Cloudflare
- [ ] Set NEXTAUTH_URL to production domain
- [ ] Set NEXTAUTH_SECRET to a strong random value
- [ ] Configure CORS for webhook URLs
- [ ] Enable Cloudflare SSL
- [ ] Set up GitHub Actions CI/CD

---

## 7. PERFORMANCE NOTES

- **AILearning context is cached 5 minutes** in-memory — avoids DB hits on every AI call
- **Prisma uses globalThis singleton** — prevents connection pool exhaustion in dev
- **Webhook responses are non-blocking** — AI recording uses `.catch(() => {})`
- **NextAuth uses JWT** — no DB session lookups, stateless
- **SPA pattern** — no full page reloads, only component swaps

---

## 8. CODE STYLE RULES

1. **Imports:** Always use `@/lib/...` alias, never relative paths for lib files
2. **Error handling:** Every API route has try/catch with console.error and meaningful error messages
3. **TypeScript:** No `any` types in production code. Use proper interfaces.
4. **Naming:** kebab-case for files, PascalCase for components, camelCase for functions
5. **Comments:** Section separators with `// ────` dividers in lib files
6. **RBAC:** Always check roles at the TOP of route handlers before any business logic
7. **Audit:** Every write operation (create, update, delete) must create an audit log entry
8. **AI calls:** NEVER call z-ai-web-dev-sdk directly — always use `callLLM()` from ai-agent.ts

---

*ARCHITECT is maintained by the AI assistant. Updated after every technical change.*
*Last full audit: Session 6 (2026-04-26)*
