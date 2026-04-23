# Phase 2 QA Report — AI Agents (5 Agents)
**Sports Pavilion Rawalpindi CRM**  
**Date:** 2025-07-12  
**Reviewer:** Senior QA Engineer  
**Scope:** All 5 AI agents, their API routes, UI components, and cross-cutting concerns  

---

## 1. Executive Summary

Phase 2 introduces 5 AI-powered agents into the Sports Pavilion Rawalpindi CRM. The implementation is **architecturally sound** — it follows a clean separation of concerns with a core library (`ai-agent.ts`), dedicated API routes per agent, and well-structured UI components. The system includes rule-based lead scoring with LLM augmentation, multi-language FAQ handling, call transcript analysis, follow-up suggestion, and AI-powered reporting.

**Overall Assessment: NEEDS WORK**

The core functionality is well-built and demonstrates solid engineering. However, **1 critical bug**, **5 high-severity issues**, and **8 medium-severity issues** were identified that should be addressed before declaring Phase 2 production-ready.

| Severity | Count |
|----------|-------|
| CRITICAL | 1     |
| HIGH     | 5     |
| MEDIUM   | 8     |
| LOW      | 6     |

---

## 2. Per-Agent Analysis

### Agent 1: Lead Scoring Engine
**File:** `/src/lib/ai-agent.ts` (lines 19–48) + `/src/app/api/ai/score-lead/route.ts`

| Aspect | Status | Notes |
|--------|--------|-------|
| Agent definition | ✅ Pass | Correct ID, name, description, capabilities |
| Scoring criteria | ✅ Pass | All 10 criteria implemented (facility +15, budget +20, family +15, urgency +25, corporate +20, meta ad +10, referral +15, pricing +10, messages +5/each, day pass -10) |
| Temperature thresholds | ✅ Pass | HOT ≥70, WARM 40–69, COLD <40 — matches system prompt |
| Score clamping | ✅ Pass | `Math.max(0, Math.min(100, score))` applied |
| Base score | ✅ Pass | Starts at 30, not 0 — reasonable for new leads |
| Dual scoring (rule + LLM) | ✅ Pass | Rule-based pre-score sent to LLM for final judgment; graceful fallback |
| DB update on score | ✅ Pass | Updates `leadScore` and `temperature` in Lead table when `leadId` provided |
| Audit logging | ✅ Pass | Logs AI_AGENT actor with score details |
| LLM failure fallback | ✅ Pass | Falls back to rule-based score with explanatory reason |

**Issues Found:**
- **[MEDIUM] Score duplication risk:** Corporate leads get +15 from "Family/corporate" AND potentially +20 from "Corporate inquiry" if both conditions trigger independently. The dedup check at line 300-303 prevents the double-count but labels the first +15 as "Family/corporate" even when it's purely corporate.
- **[LOW] Base score of 30 may be too generous** for completely cold/unqualified leads. Consider 20 or configurable.

---

### Agent 2: Customer Bot
**File:** `/src/lib/ai-agent.ts` (lines 49–77) + `/src/app/api/ai/chat/route.ts`

| Aspect | Status | Notes |
|--------|--------|-------|
| Agent definition | ✅ Pass | Correct ID, capabilities include multi-language, FAQ, lead qualification |
| Business info accuracy | ✅ Pass | Timings, pricing, facilities, memberships all match master prompt |
| FAQ knowledge base | ✅ Pass | 6 FAQ categories covering timings, location, pricing, facilities, booking, membership |
| Language detection | ✅ Pass | 3-way detection: Urdu script (Unicode ranges), Roman Urdu (word list), English (default) |
| Handoff trigger detection | ✅ Pass | 22+ triggers including English and Roman Urdu phrases |
| FAQ fast-path | ✅ Pass | FAQ matching before LLM call saves latency and cost |
| Conversation history | ✅ Pass | Fetches last 10 messages from DB for context when `leadId` provided |
| Handoff logging | ✅ Pass | Audit log created on handoff trigger |
| JSON parse failure fallback | ✅ Pass | Falls back to raw LLM text wrapped in safe structure |
| Channel validation | ✅ Pass | Validates against WHATSAPP, INSTAGRAM, FACEBOOK |

**Issues Found:**
- **[MEDIUM] FAQ answers not sent to LLM as context.** When the FAQ fast-path matches, the bot returns a static answer. If a customer asks a follow-up question not in the FAQ, the LLM path won't know what was already said — no conversation continuity for FAQ-triggered responses.
- **[MEDIUM] `messageText` truncation risk:** At line 151, `result.message.substring(0, 100)` is used for audit logging. This is fine for logs but there's no length validation on the customer's input message — extremely long messages could inflate token usage.
- **[LOW] No rate limiting** on the chat endpoint — could be abused.

---

### Agent 3: Call Monitor
**File:** `/src/lib/ai-agent.ts` (lines 78–108) + `/src/app/api/ai/call-analysis/route.ts`

| Aspect | Status | Notes |
|--------|--------|-------|
| Agent definition | ✅ Pass | Correct ID, capabilities include transcription, sentiment, coaching |
| Transcript handling | ✅ Pass | Accepts `transcriptText` parameter or uses existing `call.transcriptText` |
| Call existence check | ✅ Pass | Returns 404 if `callId` not found |
| Empty transcript check | ✅ Pass | Returns 400 if no transcript available |
| DB fields update | ✅ Pass | Updates all 8 AI fields: summary, interest, budget, objections, timeline, sentiment, coachingFlag, coachingNote |
| Sentiment validation | ✅ Pass | Validates against POSITIVE/NEUTRAL/NEGATIVE, defaults to NEUTRAL |
| AI Insight creation | ✅ Pass | Creates COACHING insight when coaching flag is true |
| Audit logging | ✅ Pass | Full audit trail with sentiment and coaching info |
| LLM parse failure | ✅ Pass | Returns 500 error (no silent fallback — appropriate for admin-facing analysis) |

**Issues Found:**
- **[MEDIUM] `recordingUrl` is accepted but never used.** The parameter is destructured at line 15 but there's no transcription logic — it's silently ignored. This should either be documented as "future feature" or removed from the interface.
- **[LOW] Coaching insight has hardcoded `confidenceScore: 0.7`.** Should be derived from LLM confidence or sentiment consistency.

---

### Agent 4: Follow-Up Agent
**File:** `/src/lib/ai-agent.ts` (lines 109–135) + `/src/app/api/ai/followup-suggest/route.ts`

| Aspect | Status | Notes |
|--------|--------|-------|
| Agent definition | ✅ Pass | Correct ID, capabilities include scheduling, templates, priority, timing |
| Lead context gathering | ✅ Pass | Fetches lead + recent calls (3) + conversations (5) + follow-ups (3) |
| Hours-since-interaction calc | ✅ Pass | Merges calls and conversations, sorts by time, calculates delta |
| LLM prompt quality | ✅ Pass | Comprehensive prompt with lead info, recent activity, past follow-ups, current time |
| Fallback suggestion | ✅ Pass | Rule-based fallback when LLM fails — uses temperature to determine timing/channel |
| Audit logging | ✅ Pass | Logs suggestion with priority, datetime, channel, and reasoning |
| LLM parse failure | ✅ Pass | Graceful fallback with contextual message |

**Issues Found:**
- **[HIGH] Suggestion is NOT persisted to DB.** The API returns a suggestion object but **does not create a FollowUp record**. The user must manually create a follow-up based on the suggestion. The master prompt states the agent should "suggest follow-up actions" so this may be by design, but it's a usability gap — consider adding an optional `autoCreate: true` parameter.
- **[MEDIUM] No assigned rep check.** If `lead.assignedRep` is null, the fallback message says "the team" which is vague. The API should probably require the lead to be assigned before suggesting follow-ups, or at least warn.

---

### Agent 5: Reporting Agent
**File:** `/src/lib/ai-agent.ts` (lines 136–167) + `/src/app/api/ai/report/route.ts`

| Aspect | Status | Notes |
|--------|--------|-------|
| Agent definition | ✅ Pass | Correct ID, capabilities include performance analysis, trend detection, rep comparison |
| Period validation | ✅ Pass | Validates against daily, weekly, monthly |
| Date range calculation | ✅ Pass | Correct: daily=today, weekly=7d, monthly=30d |
| Role-based data scoping | ✅ Pass | SALES_REP only sees their own leads; ADMIN/SUPER_ADMIN sees all + rep breakdown |
| Metric calculations | ✅ Pass | 9 parallel DB queries for comprehensive metrics |
| Source breakdown | ✅ Pass | Uses `groupBy` for lead source distribution |
| Rep performance (admin only) | ✅ Pass | Per-rep leads, calls, conversions fetched for admin roles |
| AI Insight auto-creation | ✅ Pass | Creates SUGGESTION insight with report summary |
| Audit logging | ✅ Pass | Logs report generation with pipeline health |
| LLM parse failure | ✅ Pass | Comprehensive fallback report with real metric data |

**Issues Found:**
- **[HIGH] Report insights accumulate unbounded.** Every report generation creates a new AIInsight. Running daily reports will create 365+ insights per year with no cleanup mechanism. This bloats the database and makes the insights page noisy.
- **[MEDIUM] Rep conversion query uses `updatedAt` not `createdAt`.** At line 83, conversions filter on `updatedAt: { gte: startDate }` — a lead updated (e.g., status changed to BOOKED) in the period counts, even if it was created months ago. This could misrepresent the period's actual conversions.

---

## 3. API Route Analysis

### 3.1 `/api/ai-agents` (Config Management)
| Check | Status | Notes |
|-------|--------|-------|
| GET auth | ✅ | `requireRole('SALES_REP')` — all authenticated users can view |
| PUT auth | ✅ | `requireRole('SUPER_ADMIN')` — only super admin can modify |
| Input validation (PUT) | ✅ | Validates `agentId` is a number |
| Agent existence check | ✅ | Returns 404 if agent not found |
| Field clamping | ✅ | Temperature clamped 0–2, maxTokens clamped 50–4000 |
| System prompt validation | ✅ | Must be non-empty trimmed string |
| Audit logging | ✅ | Logs config changes |
| **CRITICAL BUG** | ❌ | **In-memory store resets on server restart** (line 8). All toggle/config changes are lost. |
| Response omits systemPrompt | ⚠️ | GET response doesn't expose systemPrompt (intentional for security) |

### 3.2 `/api/ai/chat` (Customer Bot)
| Check | Status | Notes |
|-------|--------|-------|
| Auth | ✅ | `requireAuth()` — any authenticated user |
| Input validation | ✅ | Validates `messageText` and `channel` |
| Channel whitelist | ✅ | WHATSAPP, INSTAGRAM, FACEBOOK |
| Error propagation | ✅ | `error instanceof Response` pattern for auth errors |

### 3.3 `/api/ai/call-analysis` (Call Monitor)
| Check | Status | Notes |
|-------|--------|-------|
| Auth | ✅ | `requireAuth()` |
| Input validation | ✅ | Validates `callId`, checks call existence, checks transcript |
| DB write safety | ✅ | Updates only after successful LLM parse |
| AI Insight creation | ✅ | Conditional on coaching flag |

### 3.4 `/api/ai/followup-suggest` (Follow-Up)
| Check | Status | Notes |
|-------|--------|-------|
| Auth | ✅ | `requireAuth()` |
| Input validation | ✅ | Validates `leadId`, checks lead existence |
| JSON parse on lead data | ✅ | `JSON.parse(lead.interestedFacilities)` with `'[]'` default |
| Fallback quality | ✅ | Rule-based fallback generates contextual messages |

### 3.5 `/api/ai/insights` (Self-Improvement)
| Check | Status | Notes |
|-------|--------|-------|
| GET auth | ✅ | `requireAuth()` |
| PUT auth | ✅ | `requireRole('SUPER_ADMIN')` |
| **CRITICAL BUG** | ❌ | **Missing import: `requireRole` is used at line 78 but only `requireAuth` is imported at line 2.** This will cause a `ReferenceError` at runtime when any SUPER_ADMIN tries to approve/reject/deploy an insight. |
| Action validation | ✅ | APPROVE, REJECT, DEPLOY whitelist |
| Insight existence check | ✅ | Returns 404 if not found |
| Pagination | ✅ | Supports page/limit with safe clamping |

### 3.6 `/api/ai/report` (Reporting)
| Check | Status | Notes |
|-------|--------|-------|
| Auth | ✅ | `requireAuth()` |
| Input validation | ✅ | Period whitelist, defaults to 'daily' |
| Role-based data scoping | ✅ | SALES_REP scoped to own leads |
| Parallel DB queries | ✅ | 9 `Promise.all` queries for performance |

### 3.7 `/api/ai/score-lead` (Lead Scoring)
| Check | Status | Notes |
|-------|--------|-------|
| Auth | ✅ | `requireAuth()` |
| Input validation | ✅ | Validates `firstName` and `lastName` |
| Score validation | ✅ | Final score clamped to 0–100, temperature validated |
| Conditional DB update | ✅ | Only updates lead if `leadId` provided |
| Dual scoring | ✅ | Rule-based + LLM with fallback |

---

## 4. UI Component Analysis

### 4.1 `ai-agents-page.tsx` (Agent Dashboard)
| Check | Status | Notes |
|-------|--------|-------|
| Role-based toggle | ✅ | `isSuperAdmin` controls toggle and configure button visibility |
| Non-admin message | ✅ | "Contact Super Admin to change settings" shown |
| Loading skeleton | ✅ | 5 skeleton placeholders during load |
| Toggle loading state | ✅ | `Loader2` spinner during toggle |
| Error toasts | ✅ | Error toasts on fetch and toggle failures |
| Active agent count badge | ✅ | Shows X/5 Active |
| Agent cards | ✅ | Color-coded, icons, capabilities badges |
| **Config dialog issues** | ⚠️ | See bugs below |

**Issues Found:**
- **[HIGH] Config dialog doesn't show current system prompt.** The dialog starts with an empty `Textarea` (line 145: `setSystemPrompt('')`). Users cannot see the current prompt before modifying it. This makes editing dangerous — they can't review what they're changing.
- **[HIGH] Config dialog toggle doesn't call API.** The `Switch` in the config dialog (lines 385–397) only updates local state via `setSelectedAgent`. It does NOT call `handleToggle` or the PUT API. The toggle change is lost when the dialog closes.
- **[MEDIUM] No temperature/maxTokens configuration in dialog.** The API supports changing temperature and maxTokens, but the UI only exposes the system prompt and a non-functional toggle.

### 4.2 `ai-insights-page.tsx` (Insights Dashboard)
| Check | Status | Notes |
|-------|--------|-------|
| Filter by agent/type/status | ✅ | Three dropdown filters with reset |
| Pagination | ✅ | Previous/Next with page info |
| Empty state | ✅ | "No insights found" with clear-filters link |
| Expand/collapse details | ✅ | Chevron toggle for proposed change, impact, notes |
| Approve/Reject dialogs | ✅ | Both have notes fields, proper disabled states |
| Reject requires reason | ✅ | Reject button disabled when notes empty |
| Review action buttons | ✅ | Only shown for PENDING_REVIEW + SUPER_ADMIN |
| Stats cards | ⚠️ | See issue below |

**Issues Found:**
- **[HIGH] No "Deploy" button in UI.** The backend supports a DEPLOY action (line 90 of insights route), the `handleReview` function handles it (line 186), but there is no UI button to trigger it. Approved insights cannot be deployed through the interface. There should be a "Deploy" button visible on APPROVED insights for SUPER_ADMIN.
- **[MEDIUM] Stats are calculated from current page only.** At lines 242–247, `stats.total`, `stats.pending`, etc. are derived from `insights.length` (current page), not the actual total count. The API returns `total` but it's not used for stats. If there are 100 insights and 50 pending but the page shows 20, the stats will be wrong.
- **[LOW] Missing `useToast` dependency in `fetchInsights` useCallback.** The `toast` function isn't in the dependency array (line 180). This won't cause bugs with the current toast implementation but is technically a React hooks lint violation.

---

## 5. Bug List

### CRITICAL

| # | Bug | Location | Impact |
|---|-----|----------|--------|
| C1 | **Missing `requireRole` import** — `requireRole('SUPER_ADMIN')` is called at line 78 but only `requireAuth` is imported at line 2 | `/src/app/api/ai/insights/route.ts` | Runtime `ReferenceError` when SUPER_ADMIN approves/rejects/deploys insights. The entire insight review workflow is broken. |

### HIGH

| # | Bug | Location | Impact |
|---|-----|----------|--------|
| H1 | **In-memory config store resets on server restart** | `/src/app/api/ai-agents/route.ts:8` | All agent toggle and system prompt changes are lost on redeploy/restart. |
| H2 | **Config dialog doesn't show current system prompt** | `/src/components/ai-agents-page.tsx:145` | Super Admin cannot review existing prompt before editing. |
| H3 | **Config dialog toggle doesn't persist** | `/src/components/ai-agents-page.tsx:385-397` | Switch only updates local state, not saved to API. Misleading UI. |
| H4 | **No "Deploy" button in insights UI** | `/src/components/ai-insights-page.tsx` | DEPLOY action supported by backend but unreachable from UI. |
| H5 | **Follow-up suggestions not auto-created** | `/src/app/api/ai/followup-suggest/route.ts` | Suggestions are returned but not persisted as FollowUp records. |

### MEDIUM

| # | Bug | Location | Impact |
|---|-----|----------|--------|
| M1 | Insights stats calculated from current page, not total | `/src/components/ai-insights-page.tsx:242-247` | Misleading dashboard stats |
| M2 | Report insights accumulate without cleanup | `/src/app/api/ai/report/route.ts:174-185` | DB bloat over time |
| M3 | Rep conversion uses `updatedAt` instead of `createdAt` | `/src/app/api/ai/report/route.ts:83` | Inflated conversion counts for period |
| M4 | `recordingUrl` parameter accepted but unused | `/src/app/api/ai/call-analysis/route.ts:15` | Misleading API contract |
| M5 | No temperature/maxTokens in config dialog | `/src/components/ai-agents-page.tsx` | Configurable API fields not exposed in UI |
| M6 | FAQ responses break conversation continuity | `/src/app/api/ai/chat/route.ts:60-69` | LLM doesn't know what FAQ was sent |
| M7 | No input length validation on chat message | `/src/app/api/ai/chat/route.ts` | Potential token abuse |
| M8 | Lead scoring: corporate double-count labeling | `/src/lib/ai-agent.ts:287-303` | Factor labeled "Family/corporate" for purely corporate leads |

### LOW

| # | Bug | Location | Impact |
|---|-----|----------|--------|
| L1 | Base lead score of 30 may be too generous | `/src/lib/ai-agent.ts:264` | New leads appear warmer than they are |
| L2 | Hardcoded coaching confidence 0.7 | `/src/app/api/ai/call-analysis/route.ts:151` | Should be dynamic |
| L3 | No rate limiting on chat endpoint | `/src/app/api/ai/chat/route.ts` | Abuse potential |
| L4 | Missing `toast` in useCallback deps | `/src/components/ai-insights-page.tsx:180` | React hooks lint violation |
| L5 | No confirmation dialog for agent toggle | `/src/components/ai-agents-page.tsx:109` | Accidental disable possible |
| L6 | `lead.interestedFacilities` parsed with try/catch missing | `/src/app/api/ai/followup-suggest/route.ts:55` | Could throw if corrupted JSON |

---

## 6. Comparison with Master Prompt Requirements

| Requirement | Status | Implementation |
|-------------|--------|----------------|
| **5 AI agents with distinct roles** | ✅ Complete | All 5 defined: Lead Scoring, Customer Bot, Call Monitor, Follow-Up, Reporting |
| **Agent 1: Lead scoring (0-100) with HOT/WARM/COLD** | ✅ Complete | Rule-based + LLM dual scoring, correct thresholds |
| **Agent 2: Customer Bot with multi-language** | ✅ Complete | English, Urdu script, Roman Urdu detection + FAQ + handoff |
| **Agent 3: Call Monitor with transcript analysis** | ✅ Complete | Interest, budget, objections, timeline, sentiment, coaching |
| **Agent 4: Follow-Up suggestions** | ✅ Complete | Timing, priority, channel, message templates |
| **Agent 5: Reporting with recommendations** | ✅ Complete | Daily/weekly/monthly reports, rep performance, pipeline health |
| **AI actions must be audit-logged** | ✅ Complete | Every agent action creates AuditLog with AI_AGENT actor |
| **SUPER_ADMIN can toggle agents on/off** | ⚠️ Partial | Works but config lost on restart (H1) |
| **SUPER_ADMIN can configure system prompts** | ⚠️ Partial | Works but dialog UX issues (H2, H3) |
| **Self-improvement loop (AI Insights)** | ⚠️ Partial | Broken by missing import (C1), no Deploy button (H4) |
| **Scoring criteria match specification** | ✅ Complete | All 10 criteria implemented correctly |
| **Temperature thresholds consistent** | ✅ Complete | HOT≥70, WARM 40-69, COLD<40 across all files |
| **FAQ knowledge base comprehensive** | ✅ Complete | Timings, location, pricing, facilities, booking, membership |
| **Handoff triggers for escalation** | ✅ Complete | 22+ triggers in English and Roman Urdu |
| **Roman Urdu support** | ✅ Complete | 40+ word detection list |
| **Conversation history for bot context** | ✅ Complete | Last 10 messages fetched for LLM context |

---

## 7. Recommendations for Improvement

### Must Fix Before Release
1. **Fix the `requireRole` import** in `/src/app/api/ai/insights/route.ts` — add `requireRole` to the import from `@/lib/auth-helpers`. This is a one-line fix.
2. **Persist agent configs to DB** — Add an `AIAgentConfig` table or a JSON column in a settings table. Eliminate the in-memory store.
3. **Fix config dialog UX** — Load and display current system prompt; either wire the toggle to the API or remove it; add temperature/maxTokens fields.
4. **Add Deploy button** for APPROVED insights in the UI.

### Should Fix Soon
5. **Auto-create FollowUp records** — Add optional `createFollowUp: true` parameter to the follow-up API, or add a "Create Follow-Up" button in the UI that pre-fills the AI suggestion.
6. **Fix insight stats** — Use `data.total` from API response for stats cards, not `insights.length`.
7. **Add report insight deduplication** — Check if a recent report insight exists before creating a new one, or add a TTL/cleanup job.
8. **Fix rep conversion query** — Use `createdAt` or add a `statusChangedAt` field.

### Nice to Have
9. Add rate limiting on the chat endpoint.
10. Wrap `JSON.parse(lead.interestedFacilities)` in try/catch in follow-up route.
11. Add conversation continuity for FAQ responses (pass FAQ answer to LLM as context).
12. Make base lead score configurable.
13. Add confirmation dialog before toggling agents.
14. Implement actual audio transcription for `recordingUrl` in call analysis.

---

## 8. Overall Phase 2 Readiness Assessment

```
╔══════════════════════════════════════════════════╗
║                                                   ║
║   PHASE 2 STATUS:  NEEDS WORK                     ║
║                                                   ║
║   Core Functionality:     ████████████░░  85%     ║
║   Bug Severity:           ████████░░░░░░  60%     ║
║   Production Readiness:   █████████░░░░░  70%     ║
║                                                   ║
╚══════════════════════════════════════════════════╝
```

**Justification:**

The Phase 2 AI agent implementation demonstrates **strong architectural fundamentals** — clean code organization, comprehensive audit logging, graceful error handling with fallbacks, and thorough business logic. The scoring engine is well-designed with dual (rule + LLM) scoring, the customer bot handles multi-language detection impressively, and the reporting agent generates actionable insights.

However, the phase **cannot be marked READY** due to:

1. **The `requireRole` import bug (C1)** completely breaks the insight review workflow — a core self-improvement feature. This is a trivial fix but blocks the entire flow.

2. **The in-memory config store (H1)** means every server restart resets all agent configurations, making the toggle/configure feature unreliable in production.

3. **Config dialog UX issues (H2, H3)** make the Super Admin configuration experience confusing and potentially destructive.

4. **Missing Deploy button (H4)** means approved insights can never be deployed through the UI.

With an estimated **2-4 hours** of focused development to fix the CRITICAL and HIGH issues, Phase 2 would be ready for production deployment. The MEDIUM and LOW issues can be addressed in a follow-up sprint.

---

*Report generated by automated QA analysis. All file paths are relative to `/home/z/my-project/`.*
