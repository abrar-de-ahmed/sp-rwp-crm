# CRM BRAIN — Customer Intelligence Agent | SP RWP CRM

> **Role:** Customer Intelligence — knows what makes customers tick
> **Updated:** 2026-04-26
> **Reports to:** CHAMP (Supervisor)

## PURPOSE
I am the Customer Intelligence Agent. I accumulate ALL knowledge about customer
behavior, conversation patterns, objection handling, conversion strategies, and
what makes this specific business's customers convert. I grow smarter with
every interaction recorded in the AILearning table.

Every new session reads me to understand the customer landscape BEFORE making
any changes to AI behavior, templates, or workflows.

---

## 1. BUSINESS CONTEXT (Sports Pavilion Rawalpindi)

### Industry: Sports / Fitness / Recreation Facility
### Location: Rawalpindi, Pakistan
### Target Market: Families, individuals, corporate groups seeking sports facilities
### Languages: English, Urdu, Roman Urdu (most common in WhatsApp)

### Likely Facilities (to be confirmed by client):
- Cricket grounds/pitches
- Football field
- Swimming pool
- Gym / Fitness center
- Tennis courts
- Badminton courts
- Personal training
- Meeting/event halls
- Day pass access
- Membership plans (annual, bi-annual, monthly)

### Likely Pricing Tiers (to be confirmed by client):
- Under PKR 10,000 (day passes, basic monthly)
- PKR 10K-15K (standard monthly, quarterly)
- PKR 15K-25K (premium monthly, family plans)
- PKR 25K-50K (annual individual, corporate packages)
- PKR 50K+ (premium annual, corporate events, tournaments)

---

## 2. CONVERSATION INTELLIGENCE (Grows Over Time)

### High-Intent Signals (HOT leads):
- [ ] *To be populated from real conversation data*
- Asking specific pricing questions
- Requesting facility visit/tour
- Asking about family membership options
- Mentioning they've visited before
- Asking about specific facilities (pool, cricket, etc.)
- Responding quickly to messages

### Low-Intent Signals (COLD leads):
- [ ] *To be populated from real conversation data*
- Single-word responses
- Asking "how much" without specifying what they want
- Not responding to follow-ups
- Asking questions answered in the first message
- Price shopping across multiple facilities

### Common Objection Patterns (to be learned):
| Objection | Recommended Response | Conversion Rate |
|-----------|---------------------|-----------------|
| "Bohat mehnga hai" (too expensive) | *To be trained* | — |
| "Dusri facility se compare kar raha hoon" | *To be trained* | — |
| "Abhi soch ke bataunga" (will think and tell) | *To be trained* | — |
| "Family ke sath discuss karunga" | *To be trained* | — |

### Roman Urdu Common Phrases:
| Phrase | English | Intent |
|--------|---------|--------|
| "package batao" | Tell me the package | Pricing inquiry |
| "timing kya hai" | What are the timings | Schedule inquiry |
| "family ke liye" | For family | Membership inquiry |
| "visit karna hai" | Want to visit | High intent |
| "cricket khelna hai" | Want to play cricket | Facility-specific |
| "monthly kitna hai" | How much monthly | Pricing |
| "pool bhi hai?" | Is there a pool too? | Facility inquiry |

---

## 3. AI BOT BEHAVIOR RULES

### Customer Bot Personality:
- **Tone:** Professional but friendly, like a helpful front desk staff member
- **Language:** Match the customer's language (auto-detect from message)
- **Response time:** Instant (automated), escalate to human if uncertain
- **Max response length:** 2-3 short paragraphs max for WhatsApp

### 3-Tier Response Priority:
1. **FAQ Match** — If question matches known FAQ, send exact answer
2. **Learned Response** — If AILearning has approved high-confidence response, use it
3. **LLM Generated** — If nothing matches, GLM-4 Plus generates contextual response

### Handoff Triggers (escalate to human):
- Customer asks to speak to a person
- Customer expresses frustration or anger (sentiment analysis)
- Question not answered after 3 AI exchanges
- Customer mentions "complaint" or "problem"
- Deal/negotiation discussion detected
- Payment/billing issue

### What the Bot Should NEVER Do:
- Never promise specific pricing without confirmation
- Never give discounts or make offers
- Never share internal team information
- Never be rude or dismissive
- Never send more than 3 messages in a row without waiting for response

---

## 4. CONVERSION FUNNEL INTELLIGENCE

### Lead Status Flow:
```
NEW → CONTACTED → INTERESTED → NEGOTIATION → BOOKED
  ↓                  ↓            ↓
  └──→ LOST ←───────┘←────────────┘
  └──→ RECOVERED
```

### Status Transition Rules:
| From | To | Trigger |
|------|-----|---------|
| NEW | CONTACTED | First message sent or call made |
| CONTACTED | INTERESTED | Customer asks pricing, visits, shows intent |
| INTERESTED | NEGOTIATION | Customer discusses specific plan/payment |
| NEGOTIATION | BOOKED | Payment received or membership activated |
| Any | LOST | Customer stops responding, says not interested, wrong number |
| LOST | RECOVERED | Customer re-engages after being marked LOST |

### Temperature Rules (auto-calculated):
- **HOT:** Status is INTERESTED or NEGOTIATION, or lead score > 70
- **WARM:** Status is CONTACTED, or lead score 40-70
- **COLD:** Status is NEW or LOST, or lead score < 40

---

## 5. CHANNEL PERFORMANCE (To Be Tracked)

### Expected Channel Behavior:
| Channel | Volume | Conversion Rate | Avg Response Time |
|---------|--------|----------------|-------------------|
| WhatsApp | Highest | *To be measured* | Instant (AI bot) |
| Facebook Messenger | Medium | *To be measured* | Instant (AI bot) |
| Instagram DM | Medium | *To be measured* | Instant (AI bot) |
| Walk-in | Low | *To be measured* | Immediate (human) |
| Referral | Low | *To be measured* | N/A |

### Best Practices Per Channel:
- **WhatsApp:** Short messages, use Roman Urdu, include emojis sparingly, never send walls of text
- **Facebook:** More detailed responses OK, can include links, images of facilities
- **Instagram:** Visual-focused, include facility photos, respond in story comments

---

## 6. WORKFLOW AUTOMATION RULES

### Active Workflows:
1. **New Lead Welcome** — Send welcome message when lead status = NEW
2. **Hot Lead Alert** — Notify team when lead score > 80
3. **Follow-up Reminder** — Remind rep if no follow-up in 24h
4. **Stale Lead Alert** — Alert if lead untouched for 48h
5. **Lost Lead Recovery** — Suggest re-engagement after 7 days
6. **Membership Expiry** — Remind 30/14/7 days before expiry
7. **Booking Confirmation** — Send confirmation when status = BOOKED
8. **Daily Summary** — Morning digest of pending tasks

### Workflow Trigger Points:
- Lead creation (POST /api/leads)
- Status change (PUT /api/leads/[id]/status)
- Manual trigger (POST /api/workflows/check)

---

## 7. LEAD SCORING MODEL

### Rule-Based Scoring (calculated by AI + rules):
| Factor | Points | Notes |
|--------|--------|-------|
| Source: META_AD | +10 | Ad clicks show intent |
| Source: REFERRAL | +15 | Referrals convert 3x better |
| Source: WALK_IN | +20 | Highest intent signal |
| Budget disclosed | +10 | Shows buying readiness |
| Family size mentioned | +10 | Family plans are higher value |
| Specific facility interest | +5 | Shows research done |
| Responded to follow-up | +15 | Active engagement |
| Multiple contacts | +10 | Persistent interest |

### LLM Scoring Enhancement:
- AI analyzes conversation sentiment and engagement quality
- Adjusts score ±10 based on conversation tone
- Factors in response time and message frequency

---

## 8. EMAIL TEMPLATE LIBRARY

### 7 Built-in Templates:
1. **Welcome** — New lead welcome email
2. **Follow-up** — Follow-up after initial contact
3. **Quotation** — Pricing quotation for interested leads
4. **Booking Confirmation** — Membership/event booking confirmed
5. **Renewal Reminder** — Membership renewal approaching
6. **Re-engagement** — Win-back for lost/inactive leads
7. **Thank You** — Post-visit or post-event thank you

---

## 9. LEARNING SYSTEM STATUS

### What Gets Recorded:
- Every AI-generated response (input + output + channel + language)
- Customer feedback (positive/negative/neutral)
- Lead outcomes (BOOKED = positive signal, LOST = negative)
- Sales rep overrides (corrections to AI responses)
- FAQ candidates (recurring questions not in static FAQ)
- Pattern discoveries (conversion keywords, objection patterns, channel performance)

### Auto-Approval Rules:
- Frequency >= 5 occurrences AND positive feedback >= 70%
- Auto-approved learnings are immediately injected into AI system prompts

### Human Review Queue:
- SUPER_ADMIN reviews AI Learning dashboard
- Can approve, reject, or modify learned patterns
- Approved patterns become part of the AI's permanent knowledge

---

*CRM BRAIN is maintained by the AI assistant and grows with every customer interaction.*
*Customer data to be populated once WhatsApp/Meta channels are live with real conversations.*
*Last updated: Session 7 (2026-04-26)*
