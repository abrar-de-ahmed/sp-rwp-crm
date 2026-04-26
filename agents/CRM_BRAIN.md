# CRM BRAIN — Customer Intelligence Agent

> **Role:** You are the Customer Intelligence Agent. You own everything about how the AI talks to customers, how leads convert, what objections come up, how the bot behaves, and what patterns drive (or kill) sales. When anyone asks "how should the AI respond to X?" or "what's converting well?" — you answer.
>
> **Last Updated:** 2026-04-27

---

## 1. AI AGENTS (6 Total — All GLM-4 Plus)

| # | Agent | Model | Temp | Purpose | When Triggered |
|---|-------|-------|------|---------|----------------|
| 1 | Lead Scoring Engine | glm-4-plus | 0.2 | Hybrid rule-based + LLM scoring (0-100) | Lead created, status changed |
| 2 | Customer Bot | glm-4-plus | 0.5 | Multi-language FAQ + LLM chat + self-learning | WhatsApp, FB, IG inbound messages |
| 3 | Call Monitor | glm-4-plus | 0.3 | Transcript analysis, sentiment, coaching | Call completed |
| 4 | Follow-Up Agent | glm-4-plus | 0.4 | Timing + message suggestions | Follow-up due, manual request |
| 5 | Reporting Agent | glm-4-plus | 0.5 | Daily/weekly/monthly performance reports | Report requested |
| 6 | Data Quality Agent | glm-4-plus | 0.3 | CRM data quality auditing | Admin requests audit |

### Why GLM-4 Plus?
- Free tier with generous limits
- Good multilingual support (English, Urdu, Roman Urdu)
- z-ai-web-dev-sdk integrates directly
- Switch to paid model when revenue starts

---

## 2. CUSTOMER BOT BEHAVIOR (Most Important Agent)

### 3-Tier Response System
The customer bot does NOT always call the LLM. It uses a cost-optimized 3-tier system:

```
Incoming Message
    │
    ├── Tier 1: FAQ Match (instant, free)
    │   └── Exact or fuzzy match from approved FAQ database
    │   └── If match found → return immediately
    │
    ├── Tier 2: Learned Response (fast, free)
    │   └── Check AILearning table for high-confidence matches
    │   └── If confidence >= 0.7 AND frequency >= 3 → return
    │
    └── Tier 3: LLM Call (slower, costs tokens)
        └── Full GLM-4 Plus call with system prompt
        └── Include approved learnings in context
        └── Response gets recorded for future learning
```

### Multi-Language Support
- **English** — Primary
- **Urdu** (اردو) — Script
- **Roman Urdu** — "aap ka naam kya hai?" style
- Bot detects language automatically from incoming message
- Responds in the same language

### Human Handoff Triggers
Bot automatically hands off to a human rep when:
- Customer says "agent", "human", "representative", "insaan"
- Customer expresses frustration (negative sentiment detected)
- Customer asks about pricing details (beyond general ranges)
- Customer wants to book a visit
- Bot confidence is below threshold (0.5)
- Same question asked 3+ times without resolution

### Bot Personality (Configurable per client)
- Professional but friendly
- Never pushy or aggressive
- Uses customer's name when known
- Acknowledges before answering
- Offers to connect with a human when unsure

---

## 3. AI SELF-LEARNING ENGINE

### Location: `src/lib/ai-learning.ts` (10 core functions)

### How It Works
1. **Every AI conversation is recorded** — input, output, channel, language, outcome
2. **Feedback loop:**
   - Lead status → BOOKED = positive feedback for all related AI responses
   - Lead status → LOST = negative feedback
   - Rep manually overrides bot response = correction recorded
3. **FAQ auto-discovery:** Questions asked 3+ times with no good answer → FAQ candidate
4. **Pattern discovery:** System analyzes conversations for:
   - Keywords that appear in successful conversions
   - Common objections and what responses worked
   - Channel performance (WhatsApp vs FB vs IG)
   - Best times to follow up
   - Sentiment patterns leading to booking vs loss
5. **Auto-approval:** Learnings auto-approve when:
   - frequency >= 5 AND positive_feedback_rate >= 70%
6. **5-minute cache:** Learning context cached in-memory for performance

### AILearning Categories
| Category | What It Tracks |
|----------|---------------|
| question_answer | Q&A pairs from customer conversations |
| objection_handling | Objections + what responses worked |
| pricing_response | How pricing questions were handled |
| facility_info | Questions about facilities, amenities, timings |
| booking_flow | Patterns in successful booking conversations |
| sentiment_pattern | Emotional patterns in conversations |
| conversion_strategy | What ultimately leads to closed deals |

### AILearning Status Flow
```
PENDING_REVIEW → APPROVED → DEPLOYED (fed back into AI)
               → REJECTED (discarded)
               → AUTO_APPROVED (high confidence, skips review)
```

### Learning Functions (10 total)
1. `recordConversation()` — Store AI conversation with metadata
2. `submitFeedback()` — Record positive/negative/neutral feedback
3. `getLearningContext()` — Build context from approved learnings for AI prompts
4. `discoverPatterns()` — Analyze conversation history for patterns
5. `suggestFAQs()` — Auto-generate FAQ candidates from recurring questions
6. `getSmartReply()` — AI-suggested reply based on learnings
7. `autoApproveLearnings()` — Background process for high-confidence items
8. `getLearningStats()` — Dashboard statistics
9. `updateLearningRecord()` — Admin review/approve/reject
10. `injectLearningsIntoPrompt()` — Build enhanced system prompt with learnings

---

## 4. LEAD SCORING SYSTEM

### Hybrid Approach (Rule-Based + LLM)

**Rule-Based Component (always runs):**
| Factor | Score | Condition |
|--------|-------|-----------|
| Source: Meta Ad | +15 | Came from paid advertising |
| Source: Referral | +20 | Referred by existing member |
| Source: Walk-in | +25 | Visited in person |
| Budget: 25K-50K | +15 | Higher budget range |
| Budget: 50K+ | +25 | Highest budget |
| Temperature: HOT | +20 | Already showing strong interest |
| Family size: 3+ | +10 | Family packages potential |
| Lead type: Corporate | +15 | Bulk membership potential |
| Recent activity | +5/day | Each interaction in last 7 days |

**LLM Component (enhances score):**
- Analyzes remarks, conversation history, and context
- Adjusts score based on sentiment and engagement quality
- Temperature 0.2 for consistent scoring

**Score Ranges:**
| Score | Classification | Action |
|-------|---------------|--------|
| 80-100 | Hot Lead | Immediate follow-up, top priority |
| 50-79 | Warm Lead | Follow up within 24 hours |
| 20-49 | Cold Lead | Nurture campaign, weekly check-in |
| 0-19 | Low Priority | Monitor, no active outreach |

---

## 5. FOLLOW-UP INTELLIGENCE

### AI Suggested Follow-Up Timing
| Lead Status | Suggested Delay | Reason |
|------------|----------------|--------|
| NEW | Within 1 hour | Strike while hot |
| CONTACTED (first time) | 2-4 hours | Give breathing room |
| INTERESTED | Within 24 hours | Keep momentum |
| NEGOTIATION | Within 12 hours | Don't lose the deal |
| HOT temperature | Same day | Urgent |
| WARM temperature | Next day | Stay visible |
| COLD temperature | 3-7 days | Don't overwhelm |
| RECOVERED | Within 4 hours | Second chance energy |

### Follow-Up Priority Matrix
| Priority | When to Use |
|----------|------------|
| URGENT | Hot lead not contacted in 24h, negotiation going cold |
| HIGH | Interested lead, follow-up overdue |
| NORMAL | Standard follow-up cadence |
| LOW | Cold leads, nurturing campaigns |

### Escalation Rules
- Follow-up MISSED for 48+ hours → auto-escalate to ADMIN
- Hot lead not contacted in 12 hours → auto-escalate to SUPER_ADMIN
- 3 missed follow-ups on same lead → flag for review

---

## 6. OBJECTION HANDLING (Training Targets)

### Common Objections in Sports Facility CRM
| Objection | Bot Strategy | Success Rate (Target) |
|-----------|-------------|----------------------|
| "Too expensive" | Highlight value, compare to alternatives, offer payment plans | 40% |
| "Location is far" | Emphasize unique facilities, offer trial visit | 30% |
| "Need to think about it" | Create urgency, offer limited-time incentive | 35% |
| "Already have a gym" | Differentiate facilities, offer free tour | 25% |
| "Not sure about commitment" | Suggest day pass or monthly plan | 45% |
| "Family member not interested" | Address concerns individually, family packages | 30% |

### Objection Handling Flow
```
Objection Detected
    │
    ├── Acknowledge ("I understand your concern...")
    ├── Empathize ("Many of our members initially felt the same...")
    ├── Reframe ("What makes us different is...")
    ├── Provide evidence (testimonials, stats, comparisons)
    ├── Soft close ("Would you be open to a free trial?")
    └── If resistance continues → Offer human connection
```

---

## 7. WORKFLOW AUTOMATION (8 Workflows)

| Workflow | Trigger | Action |
|----------|---------|--------|
| New Lead Assignment | Lead created | Round-robin to active reps, notify rep |
| Status Change Temperature | Lead status → CONTACTED | Auto-set WARM |
| Status Change Temperature | Lead status → INTERESTED | Auto-set HOT |
| Status Change Temperature | Lead status → BOOKED | Celebrate notification |
| Lost Lead Recovery | Lead status → LOST | Schedule recovery follow-up in 30 days |
| Follow-Up Escalation | Follow-up MISSED 48h | Escalate to admin |
| Membership Expiry | Membership expiring in 7 days | Renewal notification |
| Inactive Lead Nudge | No activity in 14 days | Re-engagement notification |

---

## 8. CALL MONITORING INTELLIGENCE

### What the AI Extracts from Calls
- **Summary** — What was discussed
- **Interest Level** — What facilities/services the lead showed interest in
- **Budget Range** — Extracted budget indications
- **Objections** — Any concerns or hesitations raised
- **Timeline** — When the lead is looking to decide
- **Sentiment** — POSITIVE / NEGATIVE / NEUTRAL
- **Coaching Flag** — Did the rep miss something?
- **Coaching Note** — Specific suggestion for the rep

### Coaching Triggers
- Rep didn't ask about budget → "Try asking about their budget range"
- Rep interrupted customer → "Practice active listening"
- No closing attempt → "Consider suggesting a trial visit"
- Negative sentiment detected → "Customer seemed frustrated — follow up with empathy"

---

## 9. CONVERSION DATA TRACKING (Future — Phase 3C)

### Metrics to Track
- Conversion rate by source (Meta Ad vs WhatsApp vs Walk-in vs Referral)
- Conversion rate by lead type
- Average time from NEW to BOOKED
- Follow-up success rate by timing
- Best performing AI responses
- Objection → conversion mapping
- Rep performance leaderboard
- Channel effectiveness (WhatsApp vs FB vs IG)

### A/B Testing (Future — Monster Protocol)
- Test different AI response styles
- Test follow-up timing variations
- Test objection handling approaches
- Test pricing presentation strategies

---

*CRM Brain is maintained by the AI assistant. Updated with every customer interaction pattern discovered.*
