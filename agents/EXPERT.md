# EXPERT — Senior Technical Expert Agent | SP RWP CRM

> **Role:** Senior Technical Expert — code quality, architecture decisions, performance, best practices
> **Updated:** 2026-04-26
> **Reports to:** CHAMP (Supervisor)

## PURPOSE
I am the Senior Technical Expert. I provide deep technical guidance on code quality,
architecture patterns, performance optimization, security hardening, and engineering
best practices. When the Architect (ARCHITECTURE.md) decides WHAT to build, I advise
on HOW to build it well. I review code for correctness, efficiency, and maintainability.
I am the mentor that ensures every line of code meets professional standards.

Read me before making significant technical changes, refactoring, or architectural decisions.

---

## 1. CODE REVIEW STANDARDS

### Every PR or significant change must pass:

#### Correctness:
- [ ] Code does what it claims to do
- [ ] Edge cases handled (empty arrays, null values, missing fields)
- [ ] TypeScript types are correct — no `any`, no type assertions (`as`) unless absolutely necessary
- [ ] Error handling covers both expected and unexpected failures
- [ ] Async operations properly awaited or handled with `.catch()`

#### Performance:
- [ ] No N+1 database queries — use `include` or `select` in Prisma
- [ ] No unnecessary re-renders in React components
- [ ] Large lists use pagination, virtualization, or lazy loading
- [ ] Expensive computations are memoized (useMemo, useCallback)
- [ ] AI calls are non-blocking where user doesn't need to wait

#### Security:
- [ ] No credentials or secrets in code (use .env)
- [ ] All API routes check authentication
- [ ] Input validation on all user inputs (zod schemas)
- [ ] No `eval()`, `innerHTML`, or `dangerouslySetInnerHTML` with user data
- [ ] RBAC enforced before any data access
- [ ] Rate limiting on public endpoints (webhooks)

#### Maintainability:
- [ ] Functions do ONE thing — if > 30 lines, consider splitting
- [ ] Files do ONE job — if > 500 lines, consider splitting
- [ ] Naming is descriptive — no single-letter variables, no abbreviations
- [ ] Comments explain WHY, not WHAT — code should explain what
- [ ] No dead code — remove unused imports, variables, functions
- [ ] No console.log in production code (only console.error in catch blocks)

---

## 2. TYPESCRIPT BEST PRACTICES

### Strict Type Safety:
```typescript
// BAD — using any
function processData(data: any) { }

// GOOD — proper type
interface LeadData {
  firstName: string;
  lastName: string;
  phone: string;
  email?: string;  // optional fields use ?
}
function processData(data: LeadData) { }
```

### Type Assertions — Avoid When Possible:
```typescript
// BAD — unsafe assertion
const user = response.data as User;

// GOOD — type guard or validation
const user = validateUser(response.data);
```

### Enum Alternatives:
```typescript
// Use union types instead of enums for simpler code
type LeadStatus = "NEW" | "CONTACTED" | "INTERESTED" | "NEGOTIATION" | "BOOKED" | "LOST" | "RECOVERED";
type UserRole = "SUPER_ADMIN" | "ADMIN" | "SALES_REP";
```

---

## 3. REACT BEST PRACTICES

### Component Structure:
```typescript
// BAD — everything in one component
function LeadsPage() {
  const [leads, setLeads] = useState([]);
  const [filter, setFilter] = useState("");
  // ... 200 lines of logic and JSX
}

// GOOD — extract custom hooks and sub-components
function LeadsPage({ user }: { user: UserProps }) {
  const { leads, loading, error } = useLeads(user);
  const [filter, setFilter] = useState("");
  return <LeadsTable leads={leads} filter={filter} onFilter={setFilter} />;
}
```

### State Management Rules:
1. Keep state as close to where it's used as possible
2. Lift state up ONLY when sibling components need it
3. Use `useReducer` for complex state logic (> 3 related state values)
4. Never store derived data in state — compute it
5. Use `key` prop correctly on list items — never use array index as key

### useEffect Rules:
```typescript
// BAD — missing dependency
useEffect(() => {
  fetchLeads(filter);
}, []); // filter is used but not in deps

// GOOD — all dependencies listed
useEffect(() => {
  fetchLeads(filter);
}, [filter]);

// GOOD — stable callback reference
const fetchLeads = useCallback(async (f: string) => {
  const data = await getLeads(f);
  setLeads(data);
}, []);
```

### Error Boundaries:
- Wrap major page components in error boundaries
- Display user-friendly error messages
- Log errors for debugging
- Provide "Try Again" action

---

## 4. API DESIGN PATTERNS

### RESTful Conventions:
```
GET    /api/leads          → List (with pagination, filters)
POST   /api/leads          → Create
GET    /api/leads/[id]     → Detail
PUT    /api/leads/[id]     → Update
DELETE /api/leads/[id]     → Delete
POST   /api/leads/[id]/status  → Action (status change)
POST   /api/leads/[id]/remarks → Action (add remark)
```

### Response Format:
```typescript
// Success
{ data: T }

// List with pagination
{ data: T[], total: number, page: number, pageSize: number }

// Error
{ error: string, details?: string }  // with appropriate HTTP status code

// Created
{ data: T, message: string }  // 201
```

### Error Handling Pattern (Every Route):
```typescript
export async function GET(request: NextRequest) {
  try {
    const session = await requireAuth();
    // Business logic here
    return NextResponse.json({ data: result });
  } catch (error) {
    // 1. If it's already a Response (from auth), return it directly
    if (error instanceof Response) return error;
    // 2. Log for debugging
    console.error('[route-name] Error:', error);
    // 3. Return user-friendly error
    return NextResponse.json(
      { error: 'Failed to fetch data' },
      { status: 500 }
    );
  }
}
```

### Pagination Pattern:
```typescript
const url = new URL(request.url);
const page = parseInt(url.searchParams.get('page') || '1');
const pageSize = parseInt(url.searchParams.get('pageSize') || '20');
const skip = (page - 1) * pageSize;

const [data, total] = await Promise.all([
  db.lead.findMany({ skip, take: pageSize, ... }),
  db.lead.count({ where: ... }),
]);
```

---

## 5. PRISMA BEST PRACTICES

### Query Optimization:
```typescript
// BAD — N+1 queries (separate query for each lead's user)
const leads = await db.lead.findMany();
for (const lead of leads) {
  lead.user = await db.user.findUnique({ where: { id: lead.assignedRepId } });
}

// GOOD — single query with include
const leads = await db.lead.findMany({
  include: { assignedRep: { select: { id: true, name: true, email: true } } },
  take: 20,
});

// BETTER — select only needed fields
const leads = await db.lead.findMany({
  select: {
    id: true, firstName: true, lastName: true, phone: true,
    status: true, leadScore: true,
    assignedRep: { select: { name: true } },
  },
  take: 20,
});
```

### Transaction Pattern:
```typescript
// Use transactions when multiple writes must succeed or fail together
await db.$transaction(async (tx) => {
  const lead = await tx.lead.create({ data: leadData });
  await tx.followUp.create({ data: { leadId: lead.id, ... } });
  await tx.auditLog.create({ data: { entityId: lead.id, ... } });
});
```

### Migration Safety:
- Always backup database before schema changes
- Use `prisma db push` for dev (destructive OK)
- Use `prisma migrate` for production (generates migration files)
- Never change field types without data migration plan

---

## 6. AI SYSTEM BEST PRACTICES

### callLLM() Usage:
```typescript
// ALWAYS use callLLM() — NEVER call z-ai-web-dev-sdk directly
import { callLLM } from '@/lib/ai-agent';

const response = await callLLM({
  prompt: userMessage,
  systemPrompt: 'You are a helpful assistant...',
  options: {
    temperature: 0.5,
    maxTokens: 500,
    learningContext: true,  // inject approved learnings
  },
});
```

### Temperature Guidelines:
| Use Case | Temperature | Why |
|----------|-------------|-----|
| Lead scoring | 0.1-0.2 | Deterministic, consistent |
| Call analysis | 0.2-0.3 | Factual extraction |
| Follow-up suggestions | 0.3-0.4 | Balanced creativity |
| Customer chat | 0.4-0.6 | Natural conversation |
| Report generation | 0.5-0.7 | Varied, comprehensive |

### Learning System Rules:
1. ALWAYS record AI conversations — non-blocking (`.catch(() => {})`)
2. NEVER let learning failures crash the main flow
3. Auto-approval: frequency >= 5 AND positive feedback >= 70%
4. Cache learning context for 5 minutes to avoid DB hits
5. Human review queue for low-confidence learnings

### Prompt Engineering:
- System prompts should be specific, not generic
- Include brand context, language rules, and boundaries
- Never put sensitive data (passwords, tokens) in prompts
- Test prompts with real-world examples, not ideal cases
- Iterate based on actual AI response quality

---

## 7. SECURITY HARDENING

### Authentication:
- JWT tokens expire after 24 hours
- Passwords hashed with bcrypt (10+ salt rounds)
- Session validation on every authenticated request
- No session fixation — regenerate session on login

### Authorization:
- RBAC checked at API route level (not just UI level)
- Principle of least privilege — users get minimum required access
- SUPER_ADMIN has full access, ADMIN has management access, SALES_REP has own data
- Filter data by role — reps only see their own leads

### Input Validation:
- All user inputs validated with zod schemas
- Phone numbers validated for format
- Email validated for format
- IDs validated for existence before operations

### Data Protection:
- Soft delete for leads (never hard delete)
- Audit trail for all write operations
- No sensitive data in URLs or query parameters
- API responses never include passwordHash

### Webhook Security:
- HMAC-SHA256 signature verification on all incoming webhooks
- Verify token must match configured value
- Reject unverified webhook requests immediately
- Rate limit webhook endpoints

---

## 8. PERFORMANCE OPTIMIZATION

### Database:
- Use `select` instead of `include` when possible (fewer columns = faster)
- Add pagination to all list endpoints (max 100 per page)
- Use `where` clauses to filter at database level, not in application code
- Index frequently queried fields (Prisma handles most automatically)

### React:
- Memoize expensive computations with `useMemo`
- Memoize callback functions with `useCallback`
- Use `React.lazy()` for code splitting (future optimization)
- Avoid inline object/array creation in JSX (breaks memoization)

### API:
- Use `Promise.all()` for independent parallel operations
- Cache frequently accessed data (learning context: 5-min cache)
- Stream large responses when possible
- Set appropriate HTTP caching headers

### Build:
- Current build time: ~60-90 seconds (acceptable)
- Bundle size: Monitor with `@next/bundle-analyzer` (future)
- Tree-shaking: Ensure dynamic imports for heavy dependencies

---

## 9. DEBUGGING PLAYBOOK

### Step 1: Reproduce
- Get exact steps to reproduce the issue
- Check if it's browser-specific, user-specific, or data-specific
- Check if it happens in dev, prod, or both

### Step 2: Isolate
- Check browser console for errors
- Check server console for errors
- Check network tab for failed API calls
- Identify if it's frontend (UI), backend (API), or data (DB) issue

### Step 3: Diagnose
- Add console.error logging at suspicious points
- Use browser DevTools to inspect state/props
- Check database directly with Prisma Studio (`npx prisma studio`)
- Verify API response separately (curl/Postman)

### Step 4: Fix
- Fix the root cause, not the symptom
- Add regression test case to QA_EXPERT.md
- Update ARCHITECTURE.md if it reveals a pattern
- Update CHAMP.md if significant

### Common Debugging Commands:
```bash
# Check database
npx prisma studio

# Reset database (dev only — kills all data)
npx prisma db push --force-reset && npx prisma db seed

# Check build errors
npm run build

# Check TypeScript errors
npx tsc --noEmit

# Clean reinstall
rm -rf node_modules .next && npm install
```

---

## 10. TECHNICAL DEBT TRACKER

### Known Debt (Ordered by Priority):
| # | Debt | Impact | Effort | Status |
|---|------|--------|--------|--------|
| 1 | No unit tests | HIGH — bugs could slip through | MEDIUM | Not started |
| 2 | No E2E tests | MEDIUM — regression risk | HIGH | Not started |
| 3 | SQLite in dev (need PostgreSQL for prod) | HIGH — migration needed | LOW | Planned (Phase 4) |
| 4 | No rate limiting on public endpoints | MEDIUM — abuse risk | LOW | Not started |
| 5 | No error monitoring (Sentry/etc) | MEDIUM — blind in production | LOW | Not started |
| 6 | No CI/CD pipeline | MEDIUM — manual deploys | MEDIUM | Planned (Phase 4) |
| 7 | SPA pattern limits SEO | LOW — CRM is auth-gated | HIGH | Accepted |
| 8 | No input sanitization for search | LOW — SQLite injection unlikely | LOW | Not started |

### What We Do NOT Consider Debt:
- SPA pattern — intentional design choice for CRM UX
- No multi-tenancy yet — single-tenant is correct for current phase
- No mobile app — web app is mobile-responsive, sufficient for now
- Free-tier AI — will upgrade to paid when revenue justifies

---

## 11. ARCHITECTURE DECISIONS (Why We Did What We Did)

| Decision | Why This Choice | Alternatives Considered |
|----------|----------------|------------------------|
| Next.js App Router | Full-stack, server components, modern API routes | Remix (less ecosystem), CRA (no SSR) |
| SPA within Next.js | CRM needs instant page switches, no reloads | File-based routing (slower UX for CRM) |
| SQLite (dev) | Zero config, no external DB needed, fast local dev | PostgreSQL (requires external service) |
| Prisma ORM | Type-safe queries, migrations, excellent DX | Drizzle (less mature), raw SQL (no type safety) |
| NextAuth JWT | Stateless, fast, no DB session table | Auth.js DB sessions (adds DB dependency) |
| shadcn/ui | Copy-paste components, full control, no lock-in | MUI (heavy, opinionated), Chakra (less active) |
| GLM-4 Plus | Free tier, good quality, Chinese-friendly | GPT-4o (costs money), Claude (costs money) |
| Resend (REST, no SDK) | No dependency bloat, direct HTTP calls | Nodemailer (SMTP complexity), SendGrid SDK (heavy) |
| Tailwind CSS 4 | Utility-first, oklch color system, fast development | CSS Modules (verbose), styled-components (runtime cost) |

---

*EXPERT is maintained by the AI assistant. Updated after every significant technical change.*
*This file represents professional engineering standards. Every line should be earned, not assumed.*
*Last updated: Session 8 (2026-04-26)*
