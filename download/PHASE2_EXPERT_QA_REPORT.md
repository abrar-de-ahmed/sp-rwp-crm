# PHASE 2 — EXPERT QA REPORT
# Sports Pavilion RWP CRM — AI Agents & System
# Generated: 2026-04-23

## EXECUTIVE SUMMARY

| Category | Count | Details |
|----------|-------|---------|
| CRITICAL | 0 | Zero build-breaking issues |
| HIGH | 3 | AI config persistence, auth levels, missing pages |
| MEDIUM | 4 | Price mismatches, thresholds, rate limiting, error handling |
| LOW | 4 | Audit log types, cron jobs, placeholders, export |
| **TOTAL** | **11** | |

**Build Status:** PASS (0 errors, 0 warnings)
**Lint Status:** PASS (0 errors, 0 warnings)
**Overall Assessment:** System is functional but requires 3 HIGH priority fixes before production deployment.

---

## FINDINGS

### HIGH PRIORITY

#### H-01: AI Agent Configuration Lost on Server Restart
- **File:** `src/app/api/ai-agents/route.ts` (line 8)
- **Issue:** Agent configs stored in in-memory `let agentConfigs` variable. Any changes Super Admin makes (enable/disable agents, edit system prompts) are lost when the server restarts or redeploys.
- **Impact:** All AI agent custom configuration resets to defaults on every deploy.
- **Fix:** Persist agent configurations in the database (create an `AgentConfig` table or use JSON in Settings). Load from DB on startup, update DB on PUT.

#### H-02: AI Agents Page Accessible to All Roles
- **File:** `src/app/api/ai-agents/route.ts` (line 15)
- **Issue:** GET endpoint uses `requireRole('SALES_REP')` which allows any authenticated user to view agent configurations including system prompts and temperature settings. The spec restricts agent configuration to Super Admin only.
- **Impact:** Sales reps can see internal system prompts meant for admin eyes only.
- **Fix:** Change GET to `requireRole('SUPER_ADMIN')`, or create a separate read-only endpoint that excludes sensitive fields (systemPrompt, temperature, maxTokens).

#### H-03: Missing Messages / Unified Inbox Page
- **File:** `src/components/crm-layout.tsx`
- **Issue:** No `renderPage()` handler for messages/unified inbox. The spec includes this as a key feature (Section 4.6, Section 8.2). Falls through to PlaceholderPage.
- **Impact:** The Conversations table in the DB is unused. No way to view message history per lead.
- **Fix:** Build the unified inbox page that fetches conversations by leadId and displays them in a chat-like interface with channel badges.

---

### MEDIUM PRIORITY

#### M-01: FAQ Knowledge Base Prices Mismatch with Official Spec
- **File:** `src/lib/ai-agent.ts` (lines 173-210)
- **Issue:** FAQ answers reference prices like "PKR 5,000-8,000/month" and "PKR 500/person, PKR 800/family" which differ from the official membership plans (PKR 10K-15K/month, weekday PKR 750, weekend PKR 999).
- **Impact:** AI bot gives incorrect pricing to customers. Revenue expectations will be wrong.
- **Fix:** Update all FAQ answers to match the exact prices from Section 1.3 and 1.4 of the master spec. Single source of truth.

#### M-02: AI Agent Temperature Thresholds Mismatch with Spec
- **File:** `src/lib/ai-agent.ts` (line 342-343)
- **Issue:** Implementation: HOT >= 70, WARM 40-69, COLD < 40. Spec says: HOT 80-100, WARM 50-79, COLD 0-49.
- **Impact:** Lead classification differs from what Super Admin expects. More leads classified as HOT than intended.
- **Fix:** Update thresholds to match spec: HOT >= 80, WARM >= 50, COLD < 50.

#### M-03: No Rate Limiting on AI Endpoints
- **Files:** All 5 AI API routes under `src/app/api/ai/`
- **Issue:** No rate limiting on AI endpoints. A malfunctioning client or bot could exhaust OpenAI API budget quickly.
- **Fix:** Add rate limiting middleware. Suggested: 100 requests/minute for chat, 30/minute for scoring/analysis, 10/minute for reports.

#### M-04: Hardcoded Business Info in Customer Bot System Prompt
- **File:** `src/app/api/ai/chat/route.ts` (lines 104-122)
- **Issue:** The system prompt hardcodes timings as "Mon-Sat 6AM-11PM, Sunday 7AM-10PM" and prices that don't match the spec. This should reference a single source of truth.
- **Impact:** Inconsistency with official business information displayed elsewhere.
- **Fix:** Create a centralized business-info constant or config, and reference it in all AI system prompts.

---

### LOW PRIORITY

#### L-01: Audit Log actorId Type Mismatch
- **File:** Multiple AI route files
- **Issue:** `actorId: '2'` is a string but the schema expects `actorId` to reference Users.id. Prisma coerces this but it's semantically incorrect.
- **Fix:** Use the actual agent ID format or leave null for AI agents.

#### L-02: No Automated Cron Jobs for SLA Monitoring
- **Issue:** The spec describes automated follow-up reminders, SLA breach escalation, and customer nurturing sequences. None of these run automatically — they rely on manual checks.
- **Fix:** Implement cron scheduler (node-cron, BullMQ) or use Vercel Cron Jobs for production.

#### L-03: Placeholder Pages Still Exist in CRM Layout
- **File:** `src/components/crm-layout.tsx` (line 283)
- **Issue:** Unmapped page IDs still show a "under development" placeholder. Should be removed or mapped.
- **Fix:** Either implement the missing pages or remove the placeholder fallback.

#### L-04: Data Export Implementation Incomplete
- **File:** `src/components/data-export-page.tsx`
- **Issue:** The export page exists but the actual export logic for CSV/Excel/PDF with custom date ranges may not be fully implemented.
- **Fix:** Verify and complete the export functionality.

---

## PHASE 2 FEATURE COMPLETENESS

| AI Agent | API Route | Frontend Page | Status |
|----------|-----------|---------------|--------|
| Agent 1: Lead Scoring | POST /api/ai/score-lead | Lead detail (trigger button) | COMPLETE |
| Agent 2: Customer Bot | POST /api/ai/chat | Not directly exposed in UI | COMPLETE (needs UI) |
| Agent 3: Call Monitor | POST /api/ai/call-analysis | Call detail (trigger button) | COMPLETE |
| Agent 4: Follow-Up | POST /api/ai/followup-suggest | Follow-up detail (trigger button) | COMPLETE |
| Agent 5: Reporting | POST /api/ai/report | Reports page (generate button) | COMPLETE |
| Agent Config | GET/PUT /api/ai-agents | ai-agents-page.tsx | COMPLETE |
| AI Insights | GET/PUT /api/ai/insights | ai-insights-page.tsx | COMPLETE |

## RECOMMENDATIONS (Priority Order)

1. **Fix H-01:** Persist AI agent configs to database (prevents config loss on deploy)
2. **Fix H-02:** Restrict AI agents page to Super Admin only
3. **Fix M-01 + M-02:** Sync all pricing/timings with master spec
4. **Fix H-03:** Build the Unified Inbox messages page
5. **Fix M-03 + M-04:** Add rate limiting + centralized business info config
6. **Fix M-04:** Centralize business info constants for AI system prompts
7. **Low priority fixes:** Audit log types, cron jobs, placeholders, export

---

*Report generated as part of Phase 2 Expert QA. All findings are based on static code analysis and build verification.*
