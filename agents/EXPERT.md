# EXPERT — Senior Technical Expert Agent

> **Role:** You are the Senior Technical Expert. You own code quality, architecture review, performance optimization, security best practices, and technical decisions. When anyone asks "is this code good?" or "how can we make this faster/secure/better?" — you answer.
>
> **Last Updated:** 2026-04-27

---

## 1. CODE QUALITY STANDARDS

### TypeScript Rules
- **No `any` types** — Use proper interfaces or `unknown` with type guards
- **Strict mode enabled** — `strict: true` in tsconfig.json
- **Explicit return types** on API route handlers (Response.json)
- **Proper error handling** — try/catch in every async function
- **No console.log in production** — Use proper logging

### Component Standards
```tsx
// Good: Proper typing, error handling, loading states
"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";

interface MyPageProps {
  // Define props
}

export function MyPage({}: MyPageProps) {
  const [data, setData] = useState<DataType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/my-endpoint");
      if (!res.ok) throw new Error("Failed to fetch");
      const json = await res.json();
      setData(json.data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <Loader2 className="animate-spin" />;
  if (error) return <div>Error: {error}</div>;

  return (
    <div className="space-y-6">
      {/* Content */}
    </div>
  );
}
```

### API Route Standards
```typescript
// Good: Auth check, validation, audit log, error handling
import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-helpers";
import { prisma } from "@/lib/db";
import { createAuditLog } from "@/lib/audit";
import { z } from "zod";

const CreateSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
});

export async function POST(req: NextRequest) {
  try {
    const session = await requireAuth();

    // Validate input
    const body = await req.json();
    const validated = CreateSchema.parse(body);

    // Business logic
    const record = await prisma.model.create({
      data: validated,
    });

    // Audit
    await createAuditLog({
      actorType: session.user.role as any,
      actorId: session.user.id,
      actorName: session.user.name || "Unknown",
      entityType: "Model",
      entityId: record.id,
      action: "CREATE",
    });

    return NextResponse.json({ success: true, data: record });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: "Validation failed", details: error.errors },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { success: false, error: error.message || "Internal server error" },
      { status: error.status || 500 }
    );
  }
}
```

---

## 2. ARCHITECTURE REVIEW NOTES

### What's Good
- Clean SPA pattern with centralized routing
- Proper RBAC at both page and API level
- Prisma ORM for type-safe database queries
- 3-tier AI response system (cost optimization)
- Self-learning engine that improves over time
- Comprehensive audit logging
- Modular lib/ structure

### Technical Debt (Known)
| Item | Severity | Impact | Fix Priority |
|------|----------|--------|-------------|
| SQLite for production | Medium | No concurrent writes, no scaling | High (Phase 4) |
| SPA pattern (no URL routing) | Low | Can't deep-link to pages | Low (acceptable for CRM) |
| No input validation (zod) on some routes | Medium | Security risk | High |
| No rate limiting on API routes | Medium | Abuse risk | Medium |
| No server-side caching | Low | Performance at scale | Low |
| AI responses not cached | Low | Redundant LLM calls | Medium |
| No automated tests | Medium | Regression risk | High (Phase 4) |
| Manual RBAC guards | Low | Easy to forget on new pages | Low |

### What We'd Change for Next Client
1. Start with PostgreSQL (Neon) from day 1
2. Add zod validation to ALL API routes from day 1
3. Consider Next.js middleware for auth instead of per-route guards
4. Add basic test suite (at least smoke tests)
5. Add rate limiting middleware

---

## 3. PERFORMANCE OPTIMIZATION

### Current Performance Profile
- **First Load (JS):** ~500KB (acceptable for CRM)
- **Time to Interactive:** < 2s on good connection
- **API Response Time:** < 100ms for most queries (SQLite, local)
- **AI Response Time:** 2-5 seconds (depends on LLM)

### Optimization Opportunities
| Area | Current | Optimization | Expected Impact |
|------|---------|-------------|----------------|
| Database queries | No eager loading | Use `include` for relations | 30% fewer queries |
| AI response | No caching | Cache FAQ matches, learned responses | 50% fewer LLM calls |
| Page loads | Full component tree | Lazy load non-visible pages | 20% faster initial load |
| Dashboard | Multiple API calls | Single aggregated endpoint | 60% fewer requests |
| List pages | No pagination | Already paginated (good) | N/A |

### Database Query Patterns
```typescript
// BAD: N+1 queries
const leads = await prisma.lead.findMany();
const leadsWithReps = leads.map(async (lead) => ({
  ...lead,
  rep: await prisma.user.findUnique({ where: { id: lead.assignedRepId } }),
}));

// GOOD: Single query with include
const leads = await prisma.lead.findMany({
  include: { assignedRep: true },
});
```

---

## 4. SECURITY REVIEW

### Auth & Authorization
- NextAuth JWT with 24h expiry — GOOD
- RBAC on all API routes — GOOD
- RBAC on all pages — GOOD
- Password hashing via NextAuth (bcrypt) — GOOD

### Input Validation
- Most routes have basic validation — NEEDS IMPROVEMENT
- Add zod schemas to ALL POST/PUT routes
- Sanitize all user inputs before database writes

### Data Protection
- AuditLog is immutable (no delete) — GOOD
- Soft delete for leads — GOOD
- .env never committed — GOOD
- .env.example as template — GOOD

### Security Gaps to Address
| Gap | Severity | Fix |
|-----|----------|-----|
| No CSRF protection on API routes | Medium | Add CSRF tokens to state-changing routes |
| No rate limiting | Medium | Add rate limiter middleware |
| No input sanitization on some fields | Medium | Add zod validation everywhere |
| Webhook secrets stored in DB | Low | Acceptable, but encrypt at rest |
| No CSP headers | Low | Add Content-Security-Policy |
| No HSTS header | Low | Add Strict-Transport-Security |

### Recommendations for Production
1. Add zod validation to ALL API routes
2. Add rate limiting (express-rate-limit or middleware)
3. Add CSP and HSTS headers
4. Enable HTTPS only (Cloudflare handles this)
5. Add request logging (structured JSON logs)
6. Set up error monitoring (Sentry — free tier)

---

## 5. AI SYSTEM ARCHITECTURE

### z-ai-web-dev-sdk Integration
```typescript
import ZAI from 'z-ai-web-dev-sdk';

// MUST be used in backend only (API routes)
// NEVER use in client-side components

async function callAI(systemPrompt: string, userMessage: string, temp: number) {
  const zai = await ZAI.create();
  const completion = await zai.chat.completions.create({
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userMessage },
    ],
    temperature: temp,
  });
  return completion.choices[0]?.message?.content;
}
```

### AI Cost Optimization Strategy
1. **Tier 1 (FAQ):** Zero cost — string matching, no API call
2. **Tier 2 (Learned):** Zero cost — database lookup
3. **Tier 3 (LLM):** Costs tokens — only when tiers 1&2 miss
4. **Result:** ~60-70% of bot responses cost nothing
5. **Future:** Cache LLM responses for similar queries

### AI Agent Temperature Guide
| Agent | Temp | Why |
|-------|------|-----|
| Lead Scoring | 0.2 | Need consistent, reproducible scores |
| Call Monitor | 0.3 | Analytical, factual extraction |
| Data Quality | 0.3 | Precise, factual |
| Follow-Up Agent | 0.4 | Balanced consistency + creativity |
| Customer Bot | 0.5 | Natural conversation, some creativity |
| Reporting Agent | 0.5 | Varied report styles |

---

## 6. DEPENDENCY MANAGEMENT

### Current Dependencies (Key Ones)
| Package | Version | Purpose | Risk |
|---------|---------|---------|------|
| next | 16.1 | Framework | Core |
| react | 19 | UI | Core |
| prisma | 6.11 | ORM | Core |
| next-auth | 4 | Auth | Locked (v5 is beta) |
| z-ai-web-dev-sdk | latest | AI | Core |
| @dnd-kit | latest | Drag & drop | Low |
| recharts | latest | Charts | Low |
| react-hook-form | latest | Forms | Low |
| zod | latest | Validation | Low |
| date-fns | latest | Date utils | Low |
| lucide-react | latest | Icons | Low |

### Dependency Risk Assessment
- **Next.js 16.1** — Bleeding edge, but stable. App Router is the future.
- **React 19** — Latest, stable. Concurrent features available.
- **NextAuth v4** — Stable, widely used. v5 in beta but not ready.
- **Prisma 6.11** — Latest, excellent DX. SQLite support is solid.
- **z-ai-web-dev-sdk** — Proprietary SDK, provided by the AI platform.

### Update Strategy
- Security patches: Apply immediately
- Minor updates: Test before applying
- Major updates: Wait for stability, test thoroughly
- Never update NextAuth to v5 until stable release

---

## 7. CODE REVIEW CHECKLIST

Before approving any code change:

### Functionality
- [ ] Does it work as described?
- [ ] Are edge cases handled?
- [ ] Is the error handling correct?

### Quality
- [ ] No TypeScript errors
- [ ] No ESLint warnings
- [ ] Proper types (no `any`)
- [ ] Consistent naming conventions

### Security
- [ ] Auth check on the route?
- [ ] RBAC check for the role?
- [ ] Input validation?
- [ ] Audit log for state changes?

### Performance
- [ ] No N+1 queries?
- [ ] Appropriate pagination?
- [ ] No unnecessary re-renders?

### Maintainability
- [ ] Code is readable?
- [ ] Comments for complex logic?
- [ ] Follows existing patterns?

---

## 8. TECHNICAL RECOMMENDATIONS (Priority Order)

### Must Do (Before Production)
1. Add zod validation to ALL API routes
2. Migrate to PostgreSQL (Neon)
3. Add rate limiting
4. Set up error monitoring (Sentry free tier)
5. Add basic smoke tests

### Should Do (After Production)
6. Add CSP headers
7. Implement response caching for AI
8. Add structured logging
9. Lazy load non-visible CRM pages
10. Add database indexes for common queries

### Nice to Have (Future)
11. Add automated test suite (Jest + Playwright)
12. Implement WebSocket for real-time notifications
13. Add PWA support for mobile
14. Implement server-side rendering for SEO pages
15. Add GraphQL API option for integrations

---

*Expert is maintained by the AI assistant. Updated with every code review and technical decision.*
