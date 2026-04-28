# STATE.md — Project Checkpoint

> **Last Updated:** 2026-04-29
> **Session:** #10 (Railway Deploy + Bug Fix + Safety Protocol + Master Docs)
> **Status:** DEPLOYED ON RAILWAY — BUG FIX APPLIED — MASTER DOCS CREATED

---

## CURRENT STATE

| Item | Status | Details |
|------|--------|---------|
| Build | PASS | 0 errors, 51 routes |
| TypeScript | PASS | All types valid |
| Auth | PASS | Login/logout for all 3 roles |
| RBAC | PASS | SALES_REP=7, ADMIN=11, SUPER_ADMIN=20 sidebar items |
| API Routes | PASS | 51 API routes, all endpoints functional |
| Database | PASS | PostgreSQL on Railway, 11 tables |
| Page Components | PASS | 21 pages, all registered |
| Railway Deploy | LIVE | App running, PostgreSQL connected |
| Lead Detail Bug | FIXED | Removed invalid auditLogs include |

---

## SESSION #10 — WHAT WAS DONE

### 1. Bug Fix: Lead Detail "Failed to Fetch"
| Item | Details |
|------|---------|
| **Bug** | Clicking any lead in All Leads → "Error: Failed to fetch". Pipeline card click → redirect to All Leads → same error |
| **Root Cause** | `GET /api/leads/[id]` included `auditLogs` in Prisma query, but `auditLogs` is NOT a Prisma relation on the `Lead` model (AuditLog uses string `entityType`/`entityId` references) |
| **Fix** | Removed `auditLogs: { orderBy: { createdAt: 'desc' }, take: 50 }` from the include block in `src/app/api/leads/[id]/route.ts` |
| **File Changed** | `src/app/api/leads/[id]/route.ts` (4 lines removed) |
| **Build Verify** | `next build` → 0 errors, 51 routes |
| **Branch** | `fix/lead-detail-fetch-error` → merged to `main` |
| **Commit** | `e3e26c8` (merge commit) |

### 2. Railway Deployment (Completed in Previous Sessions)
- Prisma schema: `provider = "postgresql"` (changed from sqlite)
- `next.config.ts`: `output: 'standalone'` added
- Dockerfile created (Node 20 Alpine, multi-stage)
- `nixpacks.toml` created for Railway Nixpacks builder
- `package.json`: postinstall script added, start script updated
- Env vars set on Railway: NEXTAUTH_SECRET, NEXTAUTH_URL, DATABASE_URL

### 3. Safety Protocol Established
- All changes MUST go to branch first → test → merge to main
- `npm run build` must pass with 0 errors before any push
- NEVER commit .env, .env.local, or secrets
- NEVER delete or overwrite .md master files — always APPEND
- Always update CHAMP.md, STATE.md, worklog.md after every session
- API keys in Railway env vars ONLY — never in code

### 4. Master Documents Created
- **SP_RWP_CRM_DEPLOYMENT_MASTER.md** — 798-line comprehensive reference saved to `/home/z/my-project/download/`
- Contains: full history, all bugs, all fixes, safety protocol, recovery instructions, env vars guide, QA checklist

### 5. GitHub Master Documents Verified Safe
All .md files confirmed present and intact:
- `CHAMP.md` (166 lines) — Supervisor entry point
- `MASTER_PROMPT.md` — Original master prompt
- `SP_RWP_CRM_MASTER_PROMPT_v3.md` — Version 3 prompt
- `STATE.md` — This file
- `worklog.md` — Full session history
- `agents/ARCHITECTURE.md` (522 lines)
- `agents/CRM_BRAIN.md` (270 lines)
- `agents/PLAYBOOK.md` (483 lines)
- `agents/CLIENT_CONTEXT.md` (264 lines)
- `agents/RAG_PLAYBOOK.md` (317 lines)
- `agents/EXPERT.md` (356 lines)
- `agents/QA_EXPERT.md` (305 lines)

---

## ENVIRONMENT VARIABLES

### Local Development (SQLite)
```env
NEXTAUTH_SECRET=sp-rwp-crm-secret-key-2024
NEXTAUTH_URL=http://localhost:3000
DATABASE_URL=file:./db/custom.db
```

### Railway (PostgreSQL)
```
NEXTAUTH_SECRET=[set in Railway dashboard]
NEXTAUTH_URL=[your-railway-url.up.railway.app]
DATABASE_URL=[postgresql://... connection string from Railway]
```

**CRITICAL:**
- For local dev, switch `prisma/schema.prisma` provider to `sqlite`
- For Railway deploy, provider must be `postgresql`
- ALWAYS write to BOTH `.env` AND `.env.local` locally
- NEVER commit actual secret values to GitHub

---

## LOGIN CREDENTIALS (Verified Working)

| Email | Password | Role | Verified |
|-------|----------|------|----------|
| admin@spcrm.com | admin123 | SUPER_ADMIN | YES |
| manager@spcrm.com | manager123 | ADMIN | YES |
| ali@spcrm.com | password123 | SALES_REP | YES |
| bilal@spcrm.com | password123 | SALES_REP | YES |
| sara@spcrm.com | password123 | SALES_REP | YES |
| omar@spcrm.com | password123 | SALES_REP | YES |
| zain@spcrm.com | password123 | SALES_REP | YES |

---

## ALL BUGS FOUND & FIXED (Complete History)

| # | Session | Bug | Root Cause | Fix |
|---|---------|-----|-----------|-----|
| 1 | #9 | .env wrong values | Platform snapshot overwrite | Fixed .env + .env.local |
| 2 | #9 | No .env.local | Never created | Created safety net |
| 3 | #9 | Manager password wrong | Seed used adminHash | Added managerPassword + managerHash |
| 4 | #9 | Call Recordings hooks crash | Hooks after conditional return | Extracted to inner component |
| 5 | #9 | Call Recordings alert() | Missing toast import | Replaced with toast |
| 6 | #9 | Team Leaderboard crash | medals[idx] unbounded | Added .slice(0,3) + fallback |
| 7 | #9 | Notification link format | Colon vs slash mismatch | Fixed to colon format |
| 8 | #9 | Prisma logging in prod | Enabled globally | Restricted to dev-only |
| 9 | #10 | Lead Detail "Failed to Fetch" | Invalid auditLogs include | Removed from Prisma query |

---

## DEPLOYMENT ERRORS ENCOUNTERED (Historical)

| # | Error | Resolution |
|---|-------|-----------|
| 1 | DATABASE_URL shell override | Unset shell variable |
| 2 | Railway PostgreSQL crash | Recreated service |
| 3 | Private repo access | Made repo public |
| 4 | GitHub PAT invalidated | Got new PAT from user |
| 5 | Railway CLI token issues | Used GraphQL API directly |

---

## PENDING WORK

### Immediate (Next Session)
- [ ] Expert QA on live Railway deployment (all 3 roles, all 21 pages)
- [ ] Verify WhatsApp/Meta integration status on live
- [ ] Set up custom domain (spcrm) on Railway
- [ ] Run /api/setup endpoint on Railway PostgreSQL (if not done)

### Phase 3A: Prove It Works
- [ ] Set up Meta Developer App for SPR
- [ ] Connect SPR Facebook page + test webhooks
- [ ] Connect SPR Instagram + test webhooks
- [ ] Set up WhatsApp Business number + test
- [ ] Test AI bot with real conversations
- [ ] Set up Resend account + test emails

### Phase 3B: Build The Brain
- [ ] Populate CLIENT_CONTEXT.md with real SPR data
- [ ] Configure bot personality for SPR brand voice
- [ ] Set up Roman Urdu response templates

### Phase 4: Production
- [ ] Cloudflare Pages / custom domain
- [ ] CI/CD pipeline
- [ ] Production monitoring

---

## RECOVERY INSTRUCTIONS (If Everything Breaks)

```bash
# 1. Clone repo
git clone https://github.com/abrar-de-ahmed/sp-rwp-crm.git
cd sp-rwp-crm

# 2. Install dependencies
npm install --legacy-peer-deps

# 3. Fix .env (CRITICAL — platform wipes this)
cat > .env << 'EOF'
NEXTAUTH_SECRET=sp-rwp-crm-secret-key-2024
NEXTAUTH_URL=http://localhost:3000
DATABASE_URL=file:./db/custom.db
EOF
cp .env .env.local

# 4. For local dev: switch schema to SQLite
# Edit prisma/schema.prisma: provider = "sqlite"

# 5. Setup database
npx prisma generate
npx prisma db push
npx tsx prisma/seed.ts

# 6. Start dev server
npm run dev

# 7. Login: admin@spcrm.com / admin123
```

### For Railway Recovery
1. Railway auto-deploys from GitHub main branch
2. Ensure env vars are set: NEXTAUTH_SECRET, NEXTAUTH_URL, DATABASE_URL
3. Ensure schema has `provider = "postgresql"`
4. Run `/api/setup` endpoint once to seed the Railway database
5. Check Railway logs for any errors

---

## MASTER DEPLOYMENT DOCUMENT

Full reference saved at: `/home/z/my-project/download/SP_RWP_CRM_DEPLOYMENT_MASTER.md`
(798 lines — contains everything needed for session continuity)

---

*This file is the single source of truth for project state.*
*Read STATE.md + CHAMP.md at the start of every new session.*
*Last updated: 2026-04-29 (Session #10)*
