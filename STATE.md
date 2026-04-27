# STATE.md — Project Checkpoint

> **Last Updated:** 2026-04-28
> **Session:** #9 (Full QA + Env Fix + Backup)
> **Status:** QA COMPLETE — READY FOR RAILWAY DEPLOY (Stage 5)

---

## CURRENT STATE

| Item | Status | Details |
|------|--------|---------|
| Build | PASS | 0 errors, 51 routes |
| TypeScript | PASS | All types valid |
| Auth | PASS | Login/logout for all 3 roles |
| RBAC | PASS | SA=7, ADMIN=11, SA=20 sidebar items |
| API Routes | PASS | 21+ endpoints tested, all returning data |
| Database | PASS | SQLite, 11 tables, 7 users, 5+ leads seeded |
| Page Components | PASS | 20 pages, all registered in sidebar + crm-layout |

---

## WHAT WAS BROKEN (This Session)

| # | Issue | Root Cause | Fix Applied |
|---|-------|-----------|-------------|
| 1 | .env had wrong NEXTAUTH_SECRET and NEXTAUTH_URL | Platform auto-snapshots overwrite .env | Wrote exact values to BOTH .env and .env.local |
| 2 | No .env.local safety net | Never created | Created .env.local with same 3 values |
| 3 | No node_modules | Fresh clone | `bun install` (1213 packages) |
| 4 | No database | Fresh clone | `npx prisma db push` + `npx prisma db seed` |
| 5 | .env.example DATABASE_URL path wrong | `file:/home/z/my-project/db/custom.db` | Fixed to `file:./db/custom.db` |
| 6 | Manager password wrong in seed | Seed used `adminHash` instead of `managerHash` | Added `managerPassword="manager123"` + `managerHash` |
| 7 | Call Recordings hooks crash | React hooks called after conditional return | Extracted to `CallRecordingsContent` inner component |
| 8 | Call Recordings used alert() | Missing toast import | Added `useToast` import, replaced alert with toast |
| 9 | Team Leaderboard crash | `medals[idx]` unbounded for < 3 reps | Added `.slice(0, 3)` + `?? medals[2]` fallback |

---

## ENV VALUES USED

```env
NEXTAUTH_SECRET=sp-rwp-crm-secret-key-2024
NEXTAUTH_URL=http://localhost:3000
DATABASE_URL=file:./db/custom.db
```

**CRITICAL:** Write these to BOTH `.env` AND `.env.local` after every platform snapshot restore.

---

## LOGIN CREDENTIALS (Verified Working)

| Email | Password | Role | Verified |
|-------|----------|------|----------|
| admin@spcrm.com | admin123 | SUPER_ADMIN | YES |
| manager@spcrm.com | manager123 | ADMIN | YES |
| ali@spcrm.com | password123 | SALES_REP | YES |

---

## FILES MODIFIED THIS SESSION

| File | Change |
|------|--------|
| .env | Fixed NEXTAUTH_SECRET, NEXTAUTH_URL, DATABASE_URL |
| .env.local | Created with same 3 values |
| .env.example | Fixed DATABASE_URL path |
| prisma/seed.ts | Added managerPassword + managerHash |
| src/components/call-recordings-page.tsx | Fixed hooks-after-return, added toast import |
| src/components/team-page.tsx | Fixed leaderboard bounds check |

---

## QA RESULTS (Page-by-Page)

| # | Tab | Component | API | RBAC | Status |
|---|-----|-----------|-----|------|--------|
| 1 | Unified Inbox | unified-inbox-page.tsx | conversations, messaging/send | ADMIN+ | PASS |
| 2 | Teams | team-page.tsx | dashboard/stats, pipeline | All roles | PASS |
| 3 | Call Recordings | call-recordings-page.tsx | calls | ADMIN+ | PASS (fixed) |
| 4 | Sales Pipeline | pipeline-page.tsx | pipeline, leads/status | All roles | PASS |
| 5 | Call History | call-history-page.tsx | calls | All roles | PASS |
| 6 | AI Agents | ai-agents-page.tsx | ai-agents | SA=read, ADMIN+=full | PASS |
| 7 | Audit Log | audit-log-page.tsx | audit | ADMIN+ | PASS |
| 8 | Team Management | team-management-page.tsx | users | SUPER_ADMIN | PASS |
| 9 | Dashboard | dashboard.tsx | dashboard/stats | All roles | PASS |

---

## KNOWN ISSUES (Non-Blocking)

| # | Issue | Severity | Notes |
|---|-------|----------|-------|
| 1 | team-page.tsx dateRange not sent to API | Low | UI filter exists but backend doesn't use it |
| 2 | ai-agents-page.tsx systemPrompt not in interface | Low | Works at runtime, just a type definition gap |
| 3 | unified-inbox-page.tsx unused imports | Low | Dead code, no runtime impact |
| 4 | SUPER_ADMIN sidebar count is 20, not 21 | Low | CHAMP.md says 21 but actual is 20 |

---

## BACKUP FILE

Full project backup saved at:
`/home/z/my-project/download/sp-rwp-crm-full-backup-20260427.md`
(39,038 lines, all source files concatenated)

---

## NEXT STEP: Stage 5 — Railway Deployment

When ready to deploy, the next session should:

1. **Migrate SQLite → PostgreSQL (Neon)**
   - Create free Neon account at neon.tech
   - Get connection string: `postgresql://...`
   - Change `provider = "sqlite"` to `provider = "postgresql"` in prisma/schema.prisma
   - Remove `*.db` references
   - Update DATABASE_URL to Neon connection string
   - Run `npx prisma db push` + `npx prisma db seed`

2. **Deploy to Railway**
   - Create account at railway.app
   - Connect GitHub repo: abrar-de-ahmed/sp-rwp-crm
   - Set environment variables in Railway dashboard
   - Deploy — get permanent live link

3. **Verify live deployment**
   - Test login, all pages, API endpoints
   - Confirm database connectivity

---

## RECOVERY INSTRUCTIONS (If Everything Breaks Again)

```bash
# 1. Clone repo
git clone https://github.com/abrar-de-ahmed/sp-rwp-crm.git
cd sp-rwp-crm

# 2. Install dependencies
bun install

# 3. Fix .env (CRITICAL — platform wipes this)
cat > .env << 'EOF'
NEXTAUTH_SECRET=sp-rwp-crm-secret-key-2024
NEXTAUTH_URL=http://localhost:3000
DATABASE_URL=file:./db/custom.db
EOF

# Also create .env.local (safety net)
cp .env .env.local

# 4. Setup database
npx prisma db push
npx prisma db seed

# 5. Start dev server
npm run dev

# 6. Login
# admin@spcrm.com / admin123
```

---

*This file is the single source of truth for project state.*
*Read STATE.md + CHAMP.md at the start of every new session.*
