# CLIENT CONTEXT — Domain Expert Agent

> **Role:** You are the Domain Expert. You own everything specific to the client's business — their industry, pricing, facilities, customer profiles, business rules, and FAQs. When anyone asks "what does SPR offer?" or "how much does a membership cost?" — you answer.
>
> **Last Updated:** 2026-04-27

---

## 1. CLIENT PROFILE

| Field | Value |
|-------|-------|
| **Client Name** | Sports Pavilion Rawalpindi (SPR) |
| **Industry** | Sports / Fitness / Recreation |
| **Location** | Rawalpindi, Pakistan |
| **Owner** | Abrar Ahmed |
| **Business Type** | Sports facility with membership model |
| **Target Market** | Families, individuals, corporate groups in Rawalpindi/Islamabad |
| **Languages** | English, Urdu, Roman Urdu |
| **Currency** | PKR (Pakistani Rupee) |

---

## 2. FACILITIES (To Be Populated with Real Data)

### Sports & Fitness
- Cricket nets / indoor cricket
- Swimming pool (seasonal)
- Gym / fitness center
- Tennis courts
- Badminton courts
- Football ground
- Basketball court

### Family & Recreation
- Kids play area
- Family lounge / cafe
- Event hall for corporate events
- Birthday party packages
- Tournament hosting

### Classes & Programs
- Fitness classes (yoga, zumba, HIIT)
- Cricket coaching
- Swimming lessons
- Personal training
- Group fitness programs

> **NOTE:** The above is a placeholder list. Real facilities need to be confirmed with client and populated here. This is a **Phase 3B task** — "Build The Brain."

---

## 3. MEMBERSHIP PLANS (To Be Populated with Real Data)

### Current Structure (in CRM database)
| Plan Type | Description | Billing |
|-----------|-------------|---------|
| ANNUAL | 12-month membership | Lump sum or installments |
| BI_ANNUAL | 6-month membership | Lump sum |
| MONTHLY_INSTALLMENT | Monthly recurring | Monthly billing |
| CORPORATE | Corporate team packages | Custom pricing |

### Budget Ranges (Lead Capture)
| Range | PKR Amount | Profile |
|-------|-----------|---------|
| UNDER_10K | < 10,000 PKR | Individual, basic |
| 10K_15K | 10,000 - 15,000 PKR | Individual, standard |
| 15K_25K | 15,000 - 25,000 PKR | Family, premium |
| 25K_50K | 25,000 - 50,000 PKR | Corporate, group |
| 50K_PLUS | 50,000+ PKR | Premium corporate |
| NOT_DISCLOSED | Unknown | Needs discovery |

> **NOTE:** Real pricing needs to be confirmed with client. This is a **Phase 3B task**.

---

## 4. LEAD SOURCES (How Customers Find SPR)

| Source | Description | Expected Volume |
|--------|-------------|----------------|
| META_AD | Facebook/Instagram ads | HIGH — primary acquisition channel |
| WHATSAPP | Direct WhatsApp messages | HIGH — conversational commerce |
| INSTAGRAM | Instagram DMs and comments | MEDIUM — brand awareness |
| FACEBOOK | Facebook messages and comments | MEDIUM — community engagement |
| WEBSITE | Website form submissions | LOW — no website yet |
| WALK_IN | People visiting the facility | MEDIUM — location-based |
| REFERRAL | Referred by existing member | HIGH — best conversion rate |
| MANUAL_IMPORT | Bulk imported by admin | LOW — initial data load |

---

## 5. LEAD TYPES

| Type | Description | Typical Value |
|------|-------------|--------------|
| MEMBERSHIP | Individual or family membership | Standard |
| DAY_PASS | One-day facility access | Low value, potential upsell |
| CORPORATE | Corporate team membership | High value |
| EVENT | Event booking (birthday, corporate) | One-time, high margin |
| CORPORATE_EVENT | Corporate team building event | High value |
| TOURNAMENT | Tournament hosting | High value, recurring potential |
| CAMP | Sports camp or coaching camp | Seasonal |
| OTHER | Miscellaneous inquiry | Varies |

---

## 6. BUSINESS RULES

### Lead Assignment
- **Round-robin** distribution among active sales reps
- SUPER_ADMIN can manually reassign
- Unassigned leads visible to all ADMIN+ users

### Temperature Auto-Update
- NEW → CONTACTED: temperature stays COLD
- CONTACTED → INTERESTED: auto-set to WARM
- INTERESTED → NEGOTIATION: auto-set to HOT
- Any status → BOOKED: celebrate notification
- Any status → LOST: temperature stays as-is

### Lead Status Flow
```
NEW → CONTACTED → INTERESTED → NEGOTIATION → BOOKED
  ↓                                           ↑
LOST ←─────────────────── RECOVERED ←──────────┘
```

### Soft Delete
- Leads are never permanently deleted
- SUPER_ADMIN can mark as LOST (soft delete)
- LOST leads can be RECOVERED

### Follow-Up Rules
- Follow-ups auto-escalate if MISSED for 48+ hours
- Reps see only their own follow-ups (ADMIN+ sees all)
- URGENT priority for hot leads

### Membership Rules
- Expiring memberships trigger renewal reminders (7 days before)
- Family memberships can include multiple members
- Corporate plans custom priced

---

## 7. CUSTOMER FAQs (To Be Populated)

### General
| Question | Answer | Status |
|----------|--------|--------|
| What are your timings? | [To be filled] | PENDING |
| Where are you located? | Rawalpindi, Pakistan | APPROVED |
| Is parking available? | [To be filled] | PENDING |
| Do you have separate timings for ladies? | [To be filled] | PENDING |

### Membership
| Question | Answer | Status |
|----------|--------|--------|
| How much is a membership? | [Pricing to be confirmed] | PENDING |
| Do you offer family packages? | Yes, family memberships are available | APPROVED |
| Can I pay in installments? | [To be filled] | PENDING |
| Is there a joining fee? | [To be filled] | PENDING |
| What's the cancellation policy? | [To be filled] | PENDING |

### Facilities
| Question | Answer | Status |
|----------|--------|--------|
| Do you have a swimming pool? | [To be confirmed] | PENDING |
| Is there a gym? | [To be confirmed] | PENDING |
| Can I book for events? | Yes, event hosting is available | APPROVED |
| Do you offer coaching? | [To be confirmed] | PENDING |

### Trials
| Question | Answer | Status |
|----------|--------|--------|
| Can I get a free trial? | [To be filled] | PENDING |
| Do you offer day passes? | Yes, day passes are available | APPROVED |
| Can I visit for a tour? | [To be filled] | PENDING |

> **NOTE:** Real FAQs need to be collected from client and their team. This is a **Phase 3B task**. The AI bot will use these FAQs in its 3-tier response system.

---

## 8. BOT PERSONALITY & VOICE

### Tone
- **Professional but warm** — like a helpful friend who works at a premium sports facility
- Never pushy or salesy
- Knowledgeable but not robotic
- Uses customer's name when available

### Language Handling
- **English:** Full professional English
- **Urdu (اردو):** Formal Urdu script
- **Roman Urdu:** "Bhai, aap ka naam kya hai?" — casual, friendly, this is how most Pakistani customers text

### Response Style Examples

**English:**
> "Hi Sarah! Welcome to Sports Pavilion Rawalpindi. I'd be happy to help you with membership options. Could you tell me a bit about what you're looking for — individual or family membership?"

**Roman Urdu:**
> "Assalam o Alaikum! Sports Pavilion Rawalpindi mein khush aamdeed. Main aap ki membership ke baare mein madad kar sakta hoon. Bataiye, individual membership chahiye ya family package?"

**Objection Handling Example:**
> "I completely understand that budget is important! Many of our members initially felt the same way. What makes us different is [unique value]. Would you be open to trying a day pass first to experience our facilities?"

---

## 9. COMPETITIVE POSITIONING (To Be Researched)

| Competitor | Location | Key Difference | SPR Advantage |
|------------|----------|---------------|---------------|
| [To be filled] | [Location] | [Their thing] | [Our thing] |
| [To be filled] | [Location] | [Their thing] | [Our thing] |

> **NOTE:** Competitive research is a Phase 3B task. This data feeds into the AI bot's objection handling and differentiation responses.

---

## 10. CLIENT-SPECIFIC WORKFLOWS

### Meta Ad Lead Flow
1. Customer clicks Facebook/Instagram ad
2. Meta sends lead data to webhook (`/api/webhooks/meta`)
3. AI bot sends instant welcome message
4. Lead created in CRM with META_AD source
5. Rep assigned via round-robin
6. Notification sent to assigned rep
7. AI bot continues conversation until handoff
8. Rep takes over for booking/negotiation

### WhatsApp Lead Flow
1. Customer sends WhatsApp message
2. WhatsApp webhook receives (`/api/webhooks/whatsapp`)
3. AI bot responds via 3-tier system (FAQ → Learned → LLM)
4. Lead created/updated in CRM
5. Conversation recorded in Unified Inbox
6. Bot hands off to rep when appropriate

### Walk-In Lead Flow
1. Customer visits facility
2. Rep manually creates lead with WALK_IN source
3. Lead assigned to visiting rep
4. Follow-up scheduled automatically

---

## 11. IMPORTANT CLIENT NOTES

- **CraftedMinds** is used ONLY for testing Meta/WhatsApp connections. NOT the production client.
- **SPR** is the production client. Their Meta Business account, WhatsApp Business number, and Resend account need to be set up.
- **User timezone:** Asia/Karachi (UTC+5)
- **Currency:** PKR
- **Languages:** The bot MUST handle English, Urdu (script), and Roman Urdu
- **Cultural context:** Pakistani sports facility customers expect:
  - Respectful greetings (Assalam o Alaikum)
  - Family-first approach
  - Flexible pricing discussions
  - Personal relationship building
  - WhatsApp as primary communication channel

---

*Client Context is maintained by the AI assistant. Updated with every client-specific data point confirmed.*
