# CLIENT CONTEXT — Domain Expert Agent | SP RWP CRM

> **Role:** Domain Expert — knows the client's business inside out
> **Updated:** 2026-04-26
> **Reports to:** CHAMP (Supervisor)

## PURPOSE
I am the Domain Expert Agent. I hold ALL client-specific business knowledge —
pricing, facilities, team structure, business rules, FAQs, and operational
details. This data feeds directly into the CRM's AI system to provide
accurate, contextual responses to customers.

When onboarding a NEW client, CLONE this file and replace all values.

---

## 1. CLIENT PROFILE

| Field | Value |
|-------|-------|
| **Business Name** | Sports Pavilion Rawalpindi (SPR) |
| **Type** | Sports / Fitness / Recreation Facility |
| **Location** | Rawalpindi, Pakistan |
| **Owner** | Abrar Ahmed |
| **Target Market** | Families, individuals, corporate groups |
| **Primary Language** | Urdu / Roman Urdu (WhatsApp), English (formal) |
| **Operating Hours** | *To be confirmed* |
| **Website** | *To be confirmed* |
| **Social Media** | Facebook: @SportsPavilionRWP, Instagram: @spr.rawalpindi |
| **WhatsApp Business** | *To be connected* |

---

## 2. FACILITIES & SERVICES

### Facilities (To Be Confirmed by Client):
| Facility | Description | Capacity | Availability |
|----------|-------------|----------|-------------|
| Cricket Ground | *To be confirmed* | *To be confirmed* | *To be confirmed* |
| Football Field | *To be confirmed* | *To be confirmed* | *To be confirmed* |
| Swimming Pool | *To be confirmed* | *To be confirmed* | *To be confirmed* |
| Gym / Fitness Center | *To be confirmed* | *To be confirmed* | *To be confirmed* |
| Tennis Court | *To be confirmed* | *To be confirmed* | *To be confirmed* |
| Badminton Court | *To be confirmed* | *To be confirmed* | *To be confirmed* |
| Personal Training | *To be confirmed* | *To be confirmed* | *To be confirmed* |
| Event/Meeting Hall | *To be confirmed* | *To be confirmed* | *To be confirmed* |

### Additional Services:
- Day passes
- Birthday party packages
- Corporate events
- Sports tournaments
- Coaching/training programs
- Cafe/refreshments

---

## 3. PRICING (To Be Confirmed by Client)

> ⚠️ CRITICAL: Do NOT use these prices in customer responses until confirmed.
> These are estimated ranges for the AI to understand pricing tiers.

### Membership Plans:
| Plan | Duration | Estimated Price | Includes |
|------|----------|----------------|----------|
| Basic Monthly | 1 month | PKR 3,000-5,000 | Gym + one sport |
| Standard Monthly | 1 month | PKR 5,000-8,000 | Gym + all facilities |
| Family Monthly | 1 month | PKR 10,000-15,000 | Family (4 members) + all |
| Quarterly | 3 months | PKR 12,000-20,000 | Standard quarterly |
| Annual Individual | 12 months | PKR 30,000-50,000 | All facilities + PT sessions |
| Annual Family | 12 months | PKR 50,000-80,000 | Family + all + premium |
| Corporate | Custom | Custom | Negotiated per company |

### Day Passes:
| Type | Estimated Price |
|------|----------------|
| Single Day | PKR 500-1,000 |
| Weekend Day | PKR 800-1,500 |
| Group (5+) | PKR 300-500/person |

### Special Packages:
- Birthday parties: Starting PKR 15,000
- Corporate events: Custom quotation
- Tournament hosting: Custom quotation

---

## 4. TEAM STRUCTURE

| Name | Email | Role | Phone |
|------|-------|------|-------|
| Super Admin | admin@spcrm.com | SUPER_ADMIN | 03001234567 |
| Ahmed Manager | manager@spcrm.com | ADMIN | 03009876543 |
| Ali Khan | ali@spcrm.com | SALES_REP | 03121234567 |
| Bilal Ahmed | bilal@spcrm.com | SALES_REP | 03139876543 |
| Sara Tariq | sara@spcrm.com | SALES_REP | 03211234567 |
| Omar Farooq | omar@spcrm.com | SALES_REP | 03229876543 |
| Zain Malik | zain@spcrm.com | SALES_REP | 03331234567 |

### Lead Assignment:
- New leads assigned via round-robin among sales reps
- SUPER_ADMIN can manually reassign
- ADMIN can reassign within their team

---

## 5. BUSINESS RULES

### Operating Rules:
- [ ] Operating hours (to be set)
- [ ] Day pass vs membership rules
- [ ] Family membership definition (how many members)
- [ ] Corporate booking minimum requirements
- [ ] Cancellation/refund policy
- [ ] Membership transfer rules
- [ ] Visitor policy (non-members)

### Follow-up Rules:
- First follow-up within 2 hours of new lead
- Second follow-up within 24 hours if no response
- Escalate to ADMIN if no response in 48 hours
- Maximum 3 follow-up attempts before marking cold

### Booking Rules:
- [ ] Payment method options (cash, bank transfer, jazzcash?)
- [ ] Booking confirmation process
- [ ] Membership card issuance
- [ ] Renewal process and reminders

---

## 6. CUSTOMER FAQ (Static — To Be Expanded)

### General:
| Question | Answer |
|----------|--------|
| What is Sports Pavilion? | *To be written* |
| Where are you located? | *To be written — include address/map link* |
| What are your timings? | *To be written* |

### Pricing:
| Question | Answer |
|----------|--------|
| How much is the membership? | *To be written — link to plans* |
| Do you have family packages? | *To be written* |
| Is there a day pass option? | *To be written* |
| Any discount for annual membership? | *To be written* |

### Facilities:
| Question | Answer |
|----------|--------|
| Do you have a swimming pool? | *To be written* |
| Can I play cricket? | *To be written* |
| Is there a gym? | *To be written* |
| Do you offer personal training? | *To be written* |

### Policies:
| Question | Answer |
|----------|--------|
| Can I freeze my membership? | *To be written* |
| What's the cancellation policy? | *To be written* |
| Can I transfer my membership? | *To be written* |

---

## 7. AI BOT KNOWLEDGE (Feeds into System Prompt)

### What the Bot Should Know:
1. Business name: Sports Pavilion Rawalpindi
2. Location: Rawalpindi, Pakistan
3. Main offerings: Sports facilities, gym, memberships, day passes
4. Operating hours: *To be set*
5. Pricing: Refer to pricing section (always say "for latest pricing, contact us")
6. Contact: *WhatsApp number, phone, email*
7. Booking: Visit facility or call for booking

### Bot Greeting Templates:
- **English:** "Welcome to Sports Pavilion Rawalpindi! How can I help you today?"
- **Urdu:** "اسپورٹس پیولین راولپنڈی میں خوش آمدید! آج میں آپ کی کیسے مدد کر سکتا ہوں؟"
- **Roman Urdu:** "Sports Pavilion Rawalpindi mein khush amdeed! Aaj mein aap ki kaise madad kar sakta hoon?"

### Response Language Rules:
- If customer writes in Urdu script → respond in Urdu
- If customer writes in Roman Urdu → respond in Roman Urdu
- If customer writes in English → respond in English
- If mixed → match the dominant language

---

## 8. ONBOARDING CHECKLIST (For This Client)

### Phase 1: Data Collection
- [ ] Confirm all facilities and their details
- [ ] Confirm pricing for all plans
- [ ] Confirm operating hours
- [ ] Confirm team members and their roles
- [ ] Confirm business rules and policies
- [ ] Collect facility photos (for Instagram/catalog)
- [ ] Confirm WhatsApp Business phone number

### Phase 2: System Configuration
- [ ] Update this file with confirmed data
- [ ] Configure static FAQs with real answers
- [ ] Set up bot greeting and personality
- [ ] Configure WhatsApp Business API
- [ ] Connect Facebook page
- [ ] Connect Instagram account
- [ ] Set up email templates with real content

### Phase 3: Testing
- [ ] Test WhatsApp bot with real messages
- [ ] Test Facebook Messenger responses
- [ ] Test Instagram DM responses
- [ ] Test email templates
- [ ] Verify workflow triggers
- [ ] Test lead scoring with real data
- [ ] Run full QA pass

### Phase 4: Go Live
- [ ] Deploy to production (Cloudflare)
- [ ] Configure custom domain
- [ ] Migrate to Neon PostgreSQL
- [ ] Train team on CRM usage
- [ ] Monitor first 48 hours
- [ ] Collect feedback and iterate

---

*CLIENT CONTEXT is maintained by the AI assistant with input from the client.*
*Sections marked "To be confirmed" need client input before go-live.*
*Last updated: Session 7 (2026-04-26)*
