# CHAMP — Supervisor Agent | SP RWP CRM

> **Last Updated:** 2026-04-29
> **Session:** #10 (Railway Deploy + Bug Fix + Safety Protocol + Master Docs)
> **Project Owner:** Abrar Ahmed (GitHub: abrar-de-ahmed)

## HOW TO USE CHAMP (Read This First)

When starting a NEW chat session, paste this exact message:

```
Fire in the hole
GitHub: https://github.com/abrar-de-ahmed/sp-rwp-crm
Token: [GITHUB_TOKEN from user]
```

The AI will:
1. Pull CHAMP.md from this repo (this file — the Supervisor)
2. Read ALL agent files in the `agents/` directory
3. Have the combined intelligence of every specialist
4. Know exactly what to do next
5. Continue seamlessly from where we left off

---

## AGENT TEAM (7 Files in `agents/` directory)

| Agent | File | Role | Ask This Agent About... |
|-------|------|------|------------------------|
| **ARCHITECT** | `agents/ARCHITECTURE.md` | Technical Architect | Tech stack, file structure, database schema, why decisions were made, bugs fixed, code patterns |
| **CRM BRAIN** | `agents/CRM_BRAIN.md` | Customer Intelligence | AI agents, bot behavior, lead scoring, follow-up timing, objection handling, self-learning, conversion patterns |
| **PLAYBOOK** | `agents/PLAYBOOK.md` | Operations | Setup guides, deployment, troubleshooting, adding pages/routes, git workflow, database operations |
| **DOMAIN EXPERT** | `agents/CLIENT_CONTEXT.md` | Client-Specific Data | SPR facilities, pricing, FAQs, business rules, bot personality, lead sources, cultural context |
| **RAG SPECIALIST** | `agents/RAG_PLAYBOOK.md` | Client Onboarding | How to clone CRM for new clients, onboarding checklist, multi-tenant strategy, data migration |
| **EXPERT** | `agents/EXPERT.md` | Senior Technical Expert | Code quality, architecture review, security, performance, technical debt, recommendations |
| **QA EXPERT** | `agents/QA_EXPERT.md` | Senior QA | Test cases, regression tracking, QA standards, what's been tested, what needs testing |

**CHAMP (this file)** = Supervisor only. Knows the high-level picture, points to the right agent.

---

## PROJECT IDENTITY

| Field | Value |
|-------|-------|
| **Project Name** | SP RWP CRM (Sports Pavilion Rawalpindi CRM) |
| **Client** | Abrar Ahmed |
| **Purpose** | AI-Powered Customer Relationship Management for a sports facility |
| **Industry** | Sports / Fitness / Recreation |
| **Location** | Rawalpindi, Pakistan |
| **GitHub Repo** | https://github.com/abrar-de-ahmed/sp-rwp-crm (PUBLIC) |
| **Railway** | Deployed — PostgreSQL + Next.js app |
| **Master Doc** | /home/z/my-project/download/SP_RWP_CRM_DEPLOYMENT_MASTER.md |
| **Cloudflare Account** | Craftedminds3@gmail.com (ID: a9183b9558532b0f2e8ef6e577ea8aa5) |
| **Workspace** | /home/z/my-project/ |

---

## CURRENT STATUS

### What's Built (All Working)
- **51 API routes** — auth, leads, users, follow-ups, calls, AI, webhooks, messaging, email, workflows
- **21 pages** — dashboard, leads, pipeline, follow-ups, calls, inbox, team, memberships, reports, AI, settings
- **11 database tables** — User, Lead, Call, Conversation, FollowUp, Membership, AuditLog, Notification, AIInsight, ChannelConnection, AILearning
- **6 AI agents** — lead scoring, customer bot, call monitor, follow-up agent, reporting, data quality
- **AI self-learning engine** — 10 functions, grows smarter every day
- **Unified inbox** — WhatsApp, Facebook, Instagram, SMS
- **8 workflows** — auto-assignment, temperature updates, escalation, renewal reminders
- **7 email templates** — via Resend
- **Full RBAC** — 3 roles (SALES_REP, ADMIN, SUPER_ADMIN)

### Phase Roadmap

| Phase | Status | Details |
|-------|--------|---------|
| Phase 1: Foundation | COMPLETE | Next.js, TypeScript, Tailwind, shadcn/ui, Prisma, Auth, RBAC |
| Phase 2: Core CRM | COMPLETE | 21 pages, all CRUD, pipeline, follow-ups, team, import/export |
| Phase 3: AI + Integrations | COMPLETE (code) | 6 AI agents, self-learning, Meta/WhatsApp/Email, workflows, inbox |
| Phase 3A: Prove It Works | PENDING | Test with real SPR Meta/WhatsApp credentials |
| Phase 3B: Build The Brain | PENDING | Populate CLIENT_CONTEXT with real data, train bot |
| Phase 3C: Make AI Smart | PENDING | Conversion tracking, response optimization |
| Phase 4: Production | IN PROGRESS | Railway deployed (PostgreSQL + app), custom domain pending |

---

## NEXT ACTIONS (Priority Order)

### 1. Agent Files — DONE (This Session)
- [x] ARCHITECTURE.md created
- [x] CRM_BRAIN.md created
- [x] PLAYBOOK.md created
- [x] CLIENT_CONTEXT.md created
- [x] RAG_PLAYBOOK.md created
- [x] EXPERT.md created
- [x] QA_EXPERT.md created
- [x] CHAMP.md restructured as Supervisor

### 2. Phase 3A: Prove It Works (After SPR verified)
- [ ] Set up Meta Developer App for SPR (not CraftedMinds)
- [ ] Connect SPR Facebook page + test webhooks
- [ ] Connect SPR Instagram + test webhooks
- [ ] Set up WhatsApp Business number for SPR + test
- [ ] Test AI bot with 10 real conversations
- [ ] Verify learning system records conversations
- [ ] Confirm workflows fire on real leads
- [ ] Set up Resend account + test emails

### 3. Phase 3B: Build The Brain
- [ ] Populate CLIENT_CONTEXT.md with real SPR data (pricing, facilities, FAQs)
- [ ] Configure bot personality for SPR brand voice
- [ ] Set up Roman Urdu response templates
- [ ] Train objection handling patterns
- [ ] Configure follow-up timing rules

### 4. Phase 4: Production
- [ ] Cloudflare Pages deployment
- [ ] Neon PostgreSQL migration
- [ ] SPR domain + DNS setup
- [ ] CI/CD pipeline

---

## LOGIN CREDENTIALS

| Email | Password | Role |
|-------|----------|------|
| admin@spcrm.com | admin123 | SUPER_ADMIN |
| manager@spcrm.com | manager123 | ADMIN |
| ali@spcrm.com | password123 | SALES_REP |
| bilal@spcrm.com | password123 | SALES_REP |
| sara@spcrm.com | password123 | SALES_REP |
| omar@spcrm.com | password123 | SALES_REP |
| zain@spcrm.com | password123 | SALES_REP |

---

## IMPORTANT RULES FOR NEW SESSIONS

1. **ALWAYS read CHAMP.md first** when activated with "Fire in the hole"
2. **Then read ALL agents/** files — they contain the real knowledge
3. **Also read STATE.md and worklog.md** for current status and full history
4. **Read Master Deployment Doc** at /home/z/my-project/download/SP_RWP_CRM_DEPLOYMENT_MASTER.md
5. **NEVER commit .env** — always use .env.example as template
6. **NEVER delete or overwrite existing .md files** — always APPEND new content
7. **PUSH to branch first** → test → merge to main (safety protocol)
8. **npm run build** must pass with 0 errors before any push
9. **The app uses SPA pattern** — new pages need registration in sidebar.tsx + crm-layout.tsx
10. **User prefers zero-cost solutions** — avoid paid services unless explicitly approved
11. **User timezone:** Asia/Karachi
12. **Dev server:** port 3000
13. **Database:** SQLite locally (db/custom.db), PostgreSQL on Railway
14. **Runtime:** npm/node locally, Node on Railway
15. **Railway env vars:** NEXTAUTH_SECRET, NEXTAUTH_URL, DATABASE_URL (PostgreSQL)

---

## SESSION HISTORY

| Session | What Happened |
|---------|--------------|
| #1 | Initial build — Next.js, Prisma (10 tables), auth, RBAC, dashboard, leads, pipeline |
| #2 | Feature expansion — 9 more pages, 6 AI agents config, RBAC fixes, bug fixes |
| #3 | Bug fix — NEXTAUTH_SECRET, login confirmed working, user tested |
| #4 | Infrastructure — GitHub repo, Cloudflare, CHAMP.md, QA (3 agents, 12 bugs fixed) |
| #5 | Phase 3 — GLM-4 Plus, Meta/WhatsApp/Email, workflows, inbox, self-learning engine, AILearning table |
| #6 | Phase 3 verify — login fix, channel FK fix, WhatsApp UI fix, channels/test route |
| #7 | Strategy — aligned on product vision, planned 7-file agent system |
| #8 | **Agent files deployed** — all 7 agents created, CHAMP.md restructured, pushed to GitHub |
| #9 | Full QA — 9 bugs fixed (manager password, hooks crash, alert→toast, leaderboard), STATE.md created |
| #10 | **Railway deployed** — PostgreSQL, lead detail bug fixed, safety protocol, master doc (798 lines) |

---

## SAFETY PROTOCOL (MANDATORY — Established Session #10)

1. `npm run build` must pass with 0 errors before ANY push
2. Create a branch (e.g., `fix/xxx` or `feat/xxx`) — NEVER push directly to main
3. Verify fix works → merge to main
4. NEVER commit .env, .env.local, or any secrets
5. NEVER delete or overwrite .md files — always APPEND
6. ALWAYS update CHAMP.md, STATE.md, worklog.md at end of every session
7. API keys go in Railway env vars ONLY — never in code
8. For local dev: schema uses `sqlite`; for Railway: schema uses `postgresql`

---

*CHAMP is the Supervisor. For detailed knowledge, read the agent files in `agents/`.*
*Updated at the end of every significant work session.*
