# SPORTS PAVILION RAWALPINDI — CRM MASTER PROMPT v1.0
# Complete Build Specification for AI-Powered CRM System

## DOCUMENT PURPOSE
This is the SINGLE SOURCE OF TRUTH for building the Sports Pavilion Rawalpindi CRM.
Every developer, agent, and module must reference this document. Nothing outside this
document should be assumed or added without explicit approval from the Super Admin.

---

## ═══════════════════════════════════════════════════════════════
## SECTION 1: BUSINESS CONTEXT
## ═══════════════════════════════════════════════════════════════

### 1.1 About the Business
- **Name:** Sports Pavilion Rawalpindi (Sports Pavilion RWP)
- **Location:** Inside Joyland Park, Lane 09, Gulistan Colony, National Park Road, Rawalpindi 46000, Punjab, Pakistan
- **Type:** Family recreation & fitness club with 25+ facilities under one roof
- **Parent Brand:** Joyland Ltd.
- **Website:** www.sportspavilionrwp.com
- **Social Media:**
  - Facebook: facebook.com/citywalkfoodpark (~17,950 likes)
  - Instagram: @sportspavilion_rwp (~21,000 followers)
  - LinkedIn: Sports Pavilion Rawalpindi (851 followers)
- **Timings:** Mon-Thu 2PM-10PM, Fri 3PM-10PM, Sat-Sun 12PM-10PM

### 1.2 Facilities Offered
**Sports & Courts:** Indoor Cricket, Badminton, Tennis, Paddle Tennis, Basketball, Volleyball, Futsal, Squash, Pickleball
**Fitness & Wellness:** Separate Gyms (Gents & Ladies), Zumba, MMA, Self-Defense, Steam Room, Sauna, Jacuzzi, Swimming Pool
**Gaming & Entertainment:** Bowling, Trampoline, Virtual Cricket, Archery, Rope Course, Table Tennis, Snooker, Foosball, PC/PS4/Xbox, Soft Play, Kids Zone
**Other:** Skating Area, Jogging Track, Ladies Salon (Peek A Bear), Café Beans (on-site restaurant), Lounge, Event/Banquet Hall

### 1.3 Revenue Streams (Lead Types in CRM)
| Revenue Stream | Lead Type in CRM | Pricing |
|---|---|---|
| Family Memberships | Membership Lead | PKR 10K-15K/month, Annual PKR 100K-150K |
| Day Passes | Day Pass Lead | Weekday PKR 750, Weekend PKR 999 |
| Corporate Packages | Corporate Lead | 15-30% group discount, min 3 members |
| Birthday Parties | Event Lead | Custom pricing |
| Corporate Events | Corporate Event Lead | Custom pricing |
| Sports Tournaments | Tournament Lead | Entry fee ~PKR 1,000 |
| Summer Camps | Camp Lead | Periodic programs |

### 1.4 Membership Plans
| Plan | Price (PKR) | Family Members | Notes |
|---|---|---|---|
| Annual (Standard) | 120,000/year | Up to 5 | — |
| Bi-Annual (Standard) | 70,000/6 months | Up to 5 | — |
| Annual (Early Bird) | 100,000/year | Up to 7 | Best value |
| Bi-Annual (Early Bird) | 60,000/6 months | Up to 7 | Best value |
| Annual Installment | 150,000/year | Up to 5 | Down payment PKR 40K + 10K/month |
| Annual Installment (Early Bird) | 135,000/year | Up to 7 | Down payment PKR 25K + 10K/month |
| Corporate Package | 15-30% discount | Min 3 members | Group discount |

### 1.5 The Problem This CRM Solves
- Digital leads from Meta Ads are being wasted — no tracking, no accountability
- Sales reps claim "digital leads are not useful" but there's no data to prove either way
- No unified system — leads come via WhatsApp, FB, IG, phone calls — all scattered
- No follow-up system — cold leads die silently
- No accountability — no record of who called whom, when, and what happened
- Manual record keeping in physical registers and Excel sheets
- No data-driven insights into what's working and what's not

---

## ═══════════════════════════════════════════════════════════════
## SECTION 2: DESIGN PHILOSOPHY — PLUG & PLAY
## ═══════════════════════════════════════════════════════════════

### 2.1 Core Principle
**"Less difficulties, more empowering."**

The CRM must feel like a consumer app, not enterprise software. Every interaction
should be intuitive, fast, and require zero technical knowledge.

### 2.2 Five Design Rules

**RULE 1: ZERO TECHNICAL KNOWLEDGE NEEDED**
- No API keys visible to anyone except Super Admin (and even then, minimal)
- No console logins, terminal commands, or .env file editing for end users
- Everything is buttons, toggles, dropdowns, and forms
- Error messages are human-readable, not stack traces

**RULE 2: SETUP = CONNECT 3 THINGS**
- Connect Facebook → 1 click + Facebook OAuth login → Select page → Done
- Connect Instagram → Same Facebook login → Select account → Done
- Connect WhatsApp → Click "Connect" → QR code appears → Scan from phone → Done
- Meta Ads webhook → One-time guided setup with step-by-step wizard
- Twilio → Super Admin configures once in settings (hidden from other roles)

**RULE 3: EMPOWER, NOT OVERWHELM**
- Sales rep logs in → immediately sees TODAY'S actionable tasks
- Clear primary CTAs: "Call this lead", "View follow-up", "Reply to message"
- AI does the heavy work (qualify, score, summarize, remind), human makes decisions
- One-click actions everywhere — no multi-step wizards for common tasks
- Mobile-first responsive design — reps will use phones in the field
- Clean, minimal UI with adequate white space
- No clutter — show relevant info, hide complexity

**RULE 4: SELF-HEALING SYSTEM**
- WhatsApp disconnects → CRM shows red banner alert + "Re-scan QR" button
- FB/IG token expires → CRM shows "Reconnect" button with one-click re-auth
- Lead not contacted within SLA → Auto-escalate to manager
- Follow-up missed by rep → Auto-remind, then escalate
- AI agent error → Log it, show admin, auto-retry with fallback
- The system should NEVER silently break

**RULE 5: AI IS CO-PILOT, NOT BOSS**
- AI suggests → Human confirms before any customer-facing action
- AI drafts messages → Human reviews before sending (for sales reps)
- AI monitors calls → Human makes the actual sales decisions
- AI reminds → Human acts
- AI recommends improvements → Super Admin approves/rejects
- The 80/20 rule: AI handles 80% of customer conversations, 20% escalated to human

---

## ═══════════════════════════════════════════════════════════════
## SECTION 3: USER ROLES & PERMISSIONS
## ═══════════════════════════════════════════════════════════════

### 3.1 Role Hierarchy
```
Super Admin (1 person — the owner)
    └── Admin / Manager (1 person)
            └── Sales Reps (5 people, add/remove capability)
```

### 3.2 Super Admin Permissions (FULL ACCESS — GOD MODE)
- ✅ Full system access to every feature, setting, and data
- ✅ Add / Edit / Delete Sales Reps (default 5, can add more or remove)
- ✅ Add / Edit / Delete Admins
- ✅ Download & export ALL data (daily/weekly/monthly/quarterly) — CSV, Excel, PDF
- ✅ Grant or revoke data download rights to specific Admins
- ✅ View ALL call recordings & AI transcripts across all reps
- ✅ View ALL change logs / audit trail (who changed what, when)
- ✅ Configure AI agent behavior, prompts, and rules
- ✅ View all AI agent conversations, decisions, and self-improvement suggestions
- ✅ Approve or reject AI self-improvement changes
- ✅ Manage membership plans & pricing in CRM
- ✅ System settings, webhooks, integration configuration
- ✅ Escalation rules & SLA configuration
- ✅ Data import (migrate existing Excel/register data)
- ✅ Twilio configuration (phone numbers, call settings)
- ✅ Meta Ads webhook setup

### 3.3 Admin / Manager Permissions (TEAM MANAGEMENT)
- ✅ View all leads across the team (not just own)
- ✅ Assign leads to reps manually or change assignments
- ✅ View call recordings & transcripts for all team reps
- ✅ View reports & analytics dashboard for the team
- ✅ Download data ONLY if Super Admin has granted permission
- ✅ Configure follow-up rules & reminder schedules
- ✅ Manage memberships — update status, process renewals
- ✅ View change log for their team members
- ✅ Escalate leads, re-assign reps
- ✅ Handle missed follow-up escalations
- ✅ Access onboarding tour for manager role
- ❌ CANNOT add/delete reps or admins
- ❌ CANNOT change system settings or AI configuration
- ❌ CANNOT modify AI agent prompts
- ❌ CANNOT access Twilio or integration settings

### 3.4 Sales Rep Permissions (OWN LEADS ONLY)
- ✅ View only THEIR assigned leads
- ✅ Click-to-call leads directly from CRM (via Twilio)
- ✅ Update lead status (New → Contacted → Interested → Negotiation → Booked → Lost)
- ✅ Add remarks / notes to leads
- ✅ Select call outcome after each call (Answered / Hung Up / Unanswered / Busy)
- ✅ View own call history & AI-generated call transcripts/summaries
- ✅ View AI-generated call insights (customer interest, objections, budget)
- ✅ See follow-up reminders & schedules assigned to them
- ✅ Mark follow-ups as completed
- ✅ Send WhatsApp messages from CRM (messages are logged)
- ✅ View unified conversation history per lead (WhatsApp + IG + FB in one timeline)
- ✅ Update membership status for their converted leads
- ✅ Access onboarding tour for sales rep role
- ❌ CANNOT view OTHER reps' leads or data
- ❌ CANNOT download/export ANY data
- ❌ CANNOT change system settings
- ❌ CANNOT delete leads (only mark as "Lost" with reason)
- ❌ CANNOT modify AI agent configuration

### 3.5 Role-Based Onboarding Tours
- Each role gets a DIFFERENT onboarding tour on first login
- Sales Rep: 8 steps (Dashboard → Leads → Call → Remarks → Follow-ups → Pipeline → Help)
- Manager: 10 steps (includes team overview, assignments, recordings, escalations, reports)
- Super Admin: 14 steps (includes everything + channel setup, AI config, data export, audit log, settings)
- All tours: Back / Next / Skip buttons, progress bar, highlight + darken UI, re-playable from Help menu

---

## ═══════════════════════════════════════════════════════════════
## SECTION 4: CHANNEL INTEGRATIONS
## ═══════════════════════════════════════════════════════════════

### 4.1 Facebook Page
- **Connection Method:** OAuth Login (user clicks "Connect with Facebook" → Facebook login popup → Select page → Done)
- **Uses:** Facebook Graph API with Page Access Token
- **Capabilities:**
  - Receive Facebook Messenger inbox messages in real-time via webhooks
  - Send replies from CRM (logged in conversation history)
  - Pull page mentions, comments (if configured)
  - AI Agent 2 can auto-reply to common queries
- **Reconnection:** If token expires, show "Reconnect Facebook" button → one-click re-auth

### 4.2 Instagram
- **Connection Method:** Same Facebook OAuth login → Select Instagram account linked to page
- **Uses:** Instagram Graph API
- **Capabilities:**
  - Receive Instagram DMs in real-time via webhooks
  - Send replies from CRM
  - AI Agent 2 can auto-reply to FAQs
- **Reconnection:** Same as Facebook — one-click re-auth

### 4.3 WhatsApp
- **Connection Method:** QR Code Scan (click "Connect WhatsApp" → QR code appears → open WhatsApp on phone → Linked Devices → Link a Device → Scan QR → Connected)
- **Uses:** Baileys / Evolution API (WhatsApp Web protocol)
- **Capabilities:**
  - Send and receive WhatsApp messages from CRM
  - AI Agent 2 handles 80% of conversations automatically
  - Customer-facing bot with smart language detection
  - All messages logged in unified conversation timeline
- **Reconnection:** Session may expire every ~30 days → CRM detects disconnection → shows red alert banner → "Re-scan QR Code" button
- **Fallback Plan:** If number gets banned, architecture supports switching to Official WhatsApp Business API (WABA)

### 4.4 Meta Ads (Lead Forms)
- **Connection Method:** Webhook setup — one-time guided wizard in CRM settings
- **Uses:** Meta Conversions API
- **Capabilities:**
  - Real-time lead capture from Facebook/Instagram lead form submissions
  - Lead form data (name, phone, email, interests) auto-populates CRM
  - Source tracking: which ad campaign, which creative, which audience
  - Auto-assigns to sales rep via round-robin or skill-based routing

### 4.5 Phone Calling (Telephony)
- **Provider:** Twilio (direct, NOT through CloserX)
- **Setup:** Super Admin configures Twilio credentials in settings (hidden from other roles)
- **Capabilities:**
  - Outbound calls: Sales rep clicks "Call Lead" in CRM → Twilio dials customer
  - Inbound calls: Customer calls business number → CRM logs incoming call → route to rep or AI
  - Call recording: All calls recorded automatically (with consent disclosure)
  - Call status webhooks: Real-time events for Answered / Hung Up / Unanswered / Busy
  - Call duration tracking
  - Pakistani virtual phone numbers (+92)
  - Call transcription (post-call, AI-powered)
- **Why Twilio Direct (Not CloserX):**
  - CloserX lacks public API/webhooks → can't get real-time call status into CRM
  - CloserX doesn't support WhatsApp, IG, FB
  - Pakistan (+92) support unconfirmed on CloserX
  - Twilio provides everything we need directly at lower cost
  - Full programmatic control over call flow

### 4.6 Unified Inbox
All channel messages (WhatsApp, Instagram DMs, Facebook Messenger) appear in ONE unified
conversation timeline per lead. Reps see a single chat view with channel badges indicating
source of each message.

---

## ═══════════════════════════════════════════════════════════════
## SECTION 5: AI AGENTS (5 DEPLOYED)
## ═══════════════════════════════════════════════════════════════

### 5.1 AI Agent 1: Lead Capture & Routing Agent

**Purpose:** Be the first point of contact for every incoming lead — capture, qualify, score, and route.

**Trigger Points:**
- Meta Ads lead form submitted (webhook)
- WhatsApp message from new number (not in CRM)
- Instagram DM from new user
- Facebook Messenger message from new user
- Manual lead entry by Admin/Super Admin

**Workflow:**
1. Receive lead data (name, phone, source, any form fields)
2. Check if lead already exists in CRM (deduplicate by phone number)
3. If new lead:
   a. Create lead record in database
   b. If from WhatsApp/IG/FB: AI Agent 2 takes over for initial conversation
   c. If from Meta Ads: Extract available info, proceed to qualification
4. Qualify the lead (via AI Agent 2 conversation or form data):
   - What facility/service are they interested in?
   - Budget range?
   - Family size (for memberships)?
   - Urgency (immediate / this week / this month / just browsing)?
5. Assign Lead Score:
   - HOT (80-100): Immediate interest, clear budget, wants to visit/join
   - WARM (50-79): Interested but needs info, comparing options
   - COLD (0-49): Casual inquiry, no clear intent
6. Assign to Sales Rep:
   - Round-robin distribution (default)
   - Skill-based routing (optional — e.g., corporate leads to specific rep)
   - Load balancing — assign to rep with fewest active leads
7. Route to correct category:
   - Membership Lead → Sales Rep
   - Corporate Lead → Admin/Manager
   - Event/Birthday Lead → Admin/Manager
   - Day Pass Inquiry → AI Agent 2 handles (no rep needed)
8. Send notification to assigned rep:
   - WhatsApp message: "New Lead: [Name] | [Interest] | [Score: Hot/Warm/Cold] | Call: [Phone]"
   - In-app notification badge
   - Optional: Push notification (if mobile app in future)

**Lead Scoring Criteria:**
| Factor | Points | Notes |
|---|---|---|
| Mentions specific facility | +15 | Shows genuine interest |
| States budget | +20 | Sales-ready signal |
| Wants family membership | +15 | Higher value lead |
| Immediate urgency ("today/now") | +25 | Hot lead |
| Corporate inquiry | +20 | High value |
| From paid Meta Ad | +10 | Already invested interest |
| Referred by existing member | +15 | Warm introduction |
| Asked about pricing | +10 | Active consideration |
| Multiple messages (engaged) | +5 per msg | High engagement |
| Weekend/day pass only | -10 | Lower conversion likelihood |

### 5.2 AI Agent 2: Customer-Facing Bot (The Heavy Lifter — 80% Coverage)

**Purpose:** Handle 80% of customer conversations automatically across WhatsApp, Instagram, and Facebook. Only escalate the complex 20% to human reps.

**Channels:** WhatsApp (primary), Instagram DMs, Facebook Messenger

**Capabilities:**

**A. First Response (within 30 seconds):**
- Auto-respond to every new message immediately
- Detect customer's language (Urdu/English/Roman Urdu/Mixed) → reply in same language
- Acknowledge and greet

**B. Smart Language Detection:**
- Customer types in Urdu (Roman) → Bot replies in Roman Urdu
  - Example: "mujhe membership ki info chahiye" → "Ji g! Humari family membership PKR 10,000/month se start hoti hai..."
- Customer types in English → Bot replies in English
  - Example: "I want to know about cricket booking" → "Great! Our indoor cricket is available daily..."
- Customer types mixed → Bot matches dominant language
- Language detection runs on EVERY incoming message, not just the first

**C. Automated Q&A (FAQs the bot handles without human):**
- Timings: "Mon-Thu 2-10PM, Fri 3-10PM, Sat-Sun 12-10PM"
- Location: "Inside Joyland Park, Rawalpindi"
- Day pass pricing: "Weekday PKR 750, Weekend PKR 999"
- Membership plans: Full plan details with pricing
- Facility list: All 25+ facilities
- Booking process: "Visit us or call 0341-8092114"
- Parking: "Free parking available"
- Age restrictions: (any applicable)
- Group/corporate packages: Direct to Admin

**D. Lead Qualification Conversation Flow:**
```
Customer: "Hi, I want to know about membership"
Bot: Greets → Asks what they're interested in
  [1] Family Membership  [2] Individual  [3] Corporate  [4] Day Pass

Based on selection → Asks follow-up questions:
- Family size? → Which facilities interest you most?
- Budget range? → When would you like to start?

Based on responses → Determines lead score → Assigns to rep
```

**E. Handoff to Human Rep (the 20%):**
Triggers for handoff:
- Customer asks to speak to someone / "call me"
- Customer mentions negotiation / custom pricing
- Customer has a complaint
- Customer asks complex questions bot can't answer
- Customer explicitly requests human
- Customer shows high buying intent (bot qualifies → transfers to close)

Handoff process:
1. Bot says: "Let me connect you with our team member who can help you better. They'll reach out shortly!"
2. Lead is assigned to next available rep with FULL conversation history
3. Rep sees everything the bot discussed — no customer repeats themselves
4. Rep takes over from where bot left off

**F. Important Rules for Agent 2:**
- NEVER make up information or prices not in the CRM knowledge base
- NEVER promise discounts or custom deals (only share listed plans)
- ALWAYS maintain professional, friendly tone
- ALWAYS identify as Sports Pavilion RWP representative
- NEVER share internal data (lead scores, rep names, system details)

### 5.3 AI Agent 3: Call Monitoring & Quality Assurance Agent

**Purpose:** Track every sales call, record it, transcribe it, extract insights, and flag quality issues.

**Trigger Points:**
- Sales rep clicks "Call Lead" in CRM
- Customer calls business number (inbound)

**Outbound Call Workflow:**
1. Rep opens lead detail → clicks "Call Lead" button
2. CRM initiates call via Twilio → dials customer number
3. Call begins → recording starts automatically
4. During call:
   - CRM tracks duration in real-time
   - Rep's screen shows live call timer
5. Call ends (either party hangs up):
   a. Twilio sends call status webhook → CRM receives instantly
   b. Status detected:
      - ANSWERED: Call was picked up and conversation happened
      - HUNG UP BY CUSTOMER: Customer disconnected (check if before/after greeting)
      - HUNG UP BY REP: Rep disconnected (check if appropriate)
      - UNANSWERED: Customer didn't pick up
      - BUSY: Customer's line was busy
      - FAILED: Technical issue (Twilio error)
   c. Rep must select call outcome in CRM:
      - 🟢 Interested — Customer showed interest, follow-up needed
      - 🟢 Converted — Customer agreed to membership/booking
      - 🟡 Callback Requested — Customer asked to be called back
      - 🟡 Thinking — Customer needs time to decide
      - 🔴 Not Interested — Customer declined
      - 🔴 Wrong Number — Invalid contact
      - ⚪ Unanswered — Couldn't reach (auto-schedules retry)
   d. Rep can add remarks/notes about the call
6. Post-Call AI Processing:
   a. AI transcribes the call recording (Speech-to-Text)
   b. AI analyzes transcript and extracts:
      - Customer's primary interest (which facilities)
      - Budget mentioned or discussed
      - Objections raised (price, distance, timing, etc.)
      - Timeline (when they want to join/visit)
      - Competitor mentions
      - Key discussion points
      - Overall sentiment (positive/neutral/negative)
   c. AI generates call summary (auto-saved in lead remarks):
      - "Customer interested in family membership for 5 members. Primary interest: cricket and swimming pool. Budget discussed: PKR 10-15K/month range. Wife also interested in ladies gym. Objection: distance from home. Rep offered facility tour. Follow-up: Call back on Friday after 3PM."
   d. AI updates lead score based on call outcome
   e. AI flags if rep missed key talking points or handled call poorly (for coaching)
   f. All stored in lead's call history timeline

**Inbound Call Workflow:**
1. Customer calls business number
2. CRM detects incoming call → looks up number in database
3. If matched to existing lead → Show lead info to receiving rep
4. If new number → Create new lead → assign to available rep
5. Same recording, transcription, and AI processing as outbound

**Unanswered Call Handling:**
1. First attempt unanswered → Auto-schedule retry after 30 minutes
2. Second attempt unanswered → Auto-schedule retry after 2 hours
3. Third attempt unanswered → Mark as "3 Attempts Failed" → Escalate to Manager
4. Manager decides: re-assign to different rep, try different time, or mark as Lost

### 5.4 AI Agent 4: Follow-Up & Reminder Agent

**Purpose:** Ensure no lead ever falls through the cracks. Manage follow-up schedules, send reminders, and escalate when SLAs are breached.

**Smart Follow-Up Rules:**

**Based on Lead Score:**
| Score | First Contact SLA | Follow-Up Cadence | Escalation |
|---|---|---|---|
| HOT (80-100) | Call within 5 minutes | Follow up every 2 hours if no answer | After 15 min SLA breach → Manager |
| WARM (50-79) | Call within 2 hours | Follow up every 24 hours | After 4 hour SLA breach → Manager |
| COLD (0-49) | WhatsApp nurture within 1 hour | Follow up every 3 days | After 48 hour SLA breach → Manager |

**Based on Customer Request:**
- Customer says "Call me on Friday at 3PM" → Exact scheduled reminder for rep
- Customer says "Follow up next week" → Reminder set for Monday 10AM
- Customer says "I'll think about it" → Reminder in 48 hours
- Customer says "Too expensive" → Flag for Manager (pricing negotiation)

**Reminder System:**
1. **15 minutes before follow-up due:**
   - WhatsApp message to sales rep:
     "⏰ Reminder: Follow up with [Lead Name] in 15 min
      📞 [Phone Number]
      📝 Last call summary: [AI-generated summary]
      💡 Suggested talking points: [Based on last conversation]"
   - In-app notification badge

2. **At follow-up deadline:**
   - In-app notification: "Follow-up due NOW: [Lead Name]"
   - If rep hasn't acted within 10 minutes → reminder escalates

3. **After SLA breach:**
   - Manager notified: "⚠️ [Rep Name] missed follow-up for [Lead Name] (Hot Lead, 15 min SLA)"
   - If Manager doesn't act within 1 hour → Super Admin notified

**Automated Customer Nurturing (for cold/warm leads):**
- Day 1: Welcome message (if not already sent)
- Day 3: Special offer or facility highlight
- Day 7: Customer testimonial or success story
- Day 14: Last chance offer / limited time incentive
- All messages sent via WhatsApp by AI Agent 2, logged in CRM
- Stop nurturing if customer responds or asks to stop

### 5.5 AI Agent 5: Reporting & Analytics Agent

**Purpose:** Generate actionable business intelligence from all CRM data. Track performance, identify trends, and enable data-driven decisions.

**Report Types:**

**A. Daily Report:**
- New leads received (by source: Meta Ads, WhatsApp, IG, FB)
- Leads contacted vs. leads pending
- Call outcomes breakdown (answered, unanswered, hung up, converted)
- Conversions today
- Revenue booked today (memberships, events)
- AI bot resolution rate (% handled without human)
- Alerts: SLA breaches, missed follow-ups, hot leads not contacted

**B. Weekly Report:**
- All daily metrics aggregated for the week
- Per-rep performance:
  - Calls made
  - Calls answered
  - Conversion rate
  - Average response time
  - Follow-ups completed vs missed
  - Revenue generated
- Lead source ROI: Which channel/campaign produces best leads
- Pipeline movement: How many leads moved through stages
- Top performing Meta Ad campaigns

**C. Monthly Report:**
- All weekly metrics aggregated
- Conversion funnel visualization:
  New Leads → Contacted → Interested → Negotiation → Booked/Lost
- Membership renewals this month
- New memberships vs. renewals vs. cancellations
- Revenue: MRR (Monthly Recurring Revenue), total bookings
- AI bot performance: Resolution rate, handoff accuracy, customer satisfaction
- Recommendations: AI-generated insights on what to improve

**D. Quarterly Report:**
- All monthly metrics aggregated
- Quarter-over-quarter growth trends
- Revenue growth trajectory
- Team performance trends
- AI self-improvement results (how AI accuracy improved over quarter)
- Business review deck format
- Forecasting: projected leads, conversions, revenue for next quarter

**Export Capabilities:**
- Format: CSV, Excel (.xlsx), PDF
- Custom date range selection
- ONLY accessible by Super Admin (or Admin if explicitly granted permission by Super Admin)
- One-click download from reports dashboard
- File naming: "SP_RWP_Daily_Report_2025-01-15.pdf" etc.

**Key Metrics Dashboard (Real-time):**
- Total leads today / this week / this month
- Hot leads right now (need immediate attention)
- Calls made today
- Conversion rate
- Revenue this month
- Active memberships count
- Expiring memberships (next 30 days)
- AI bot messages handled today
- Average response time

---

## ═══════════════════════════════════════════════════════════════
## SECTION 6: AI SELF-IMPROVEMENT LOOP
## ═══════════════════════════════════════════════════════════════

### 6.1 Purpose
Use real call recordings and conversation data to continuously improve AI agent performance.
This was specifically requested by the Super Admin to enhance AI capabilities over time.

### 6.2 How It Works

**Step 1 — RECORD:** Every sales call and AI bot conversation is stored.

**Step 2 — TRANSCRIBE:** AI converts speech to text (calls) and preserves text (chats).

**Step 3 — ANALYZE & CATEGORIZE:**
- Each call/chat tagged by outcome:
  - Converted (sale made) ✅
  - Interested (follow up needed) 🟡
  - Not interested (objection) 🔴
  - No answer ⚪

**Step 4 — LEARN (Pattern Recognition):**
- AI compares successful outcomes vs. failed outcomes
- Identifies patterns:
  - "Reps who mention family pool access close 40% more deals"
  - "Customers who ask about ladies gym convert 3x more when offered facility tour"
  - "Best opening: mentioning 25+ facilities under one roof"
  - "Price objection best handled by: breaking down per-person cost for families"
  - "Evening callers convert 20% more than morning callers"

**Step 5 — IMPROVE (Apply Learning):**
- Agent 2 (WhatsApp Bot): Starts mentioning successful talking points
- Agent 4 (Follow-ups): Crafts better reminder messages with context
- Agent 1 (Routing): Improves lead scoring based on real conversion data
- Sales coaching: Identifies what successful reps do differently

**Step 6 — REVIEW (Human-in-the-Loop):**
- Super Admin sees AI's proposed improvements in a dedicated "AI Insights" panel
- Each suggestion shows: What the AI wants to change, Why (data-backed), Expected impact
- Super Admin can: Approve, Reject, or Modify each suggestion
- Only approved changes are deployed
- This ensures AI never goes rogue or hallucinates improvements

**Timeline:**
- After 100 calls: AI has initial patterns
- After 500 calls: AI becomes meaningfully personalized
- After 1000 calls: AI significantly outperforms generic scripts

---

## ═══════════════════════════════════════════════════════════════
## SECTION 7: DATABASE SCHEMA
## ═══════════════════════════════════════════════════════════════

### 7.1 Users Table
```
id: UUID (primary key)
name: String
email: String (unique)
phone: String
password_hash: String
role: Enum (SUPER_ADMIN, ADMIN, SALES_REP)
avatar_url: String (optional)
is_active: Boolean (default true)
last_login: DateTime
created_at: DateTime
updated_at: DateTime
```

### 7.2 Leads Table
```
id: UUID (primary key)
first_name: String
last_name: String
phone: String (indexed, used for deduplication)
email: String (optional)
whatsapp_number: String (optional, may differ from phone)
source: Enum (META_AD, WHATSAPP, INSTAGRAM, FACEBOOK, WEBSITE, WALK_IN, REFERRAL, MANUAL_IMPORT)
lead_type: Enum (MEMBERSHIP, DAY_PASS, CORPORATE, EVENT, CORPORATE_EVENT, TOURNAMENT, CAMP, OTHER)
interested_facilities: String[] (multi-select from facility list)
lead_score: Integer (0-100)
temperature: Enum (HOT, WARM, COLD) (derived from score)
status: Enum (NEW, CONTACTED, INTERESTED, NEGOTIATION, BOOKED, LOST, RECOVERED)
assigned_rep_id: UUID (foreign key → Users)
family_size: Integer (optional)
budget_range: Enum (UNDER_10K, 10K_15K, 15K_25K, 25K_50K, 50K_PLUS, NOT_DISCLOSED)
lost_reason: Enum (NOT_INTERESTED, WRONG_NUMBER, UNREACHABLE, WENT_COMPETITOR, BUDGET, OTHER) (if status = LOST)
meta_ad_campaign: String (optional — which ad campaign)
meta_ad_creative: String (optional — which ad creative)
remarks: Text (free text, AI + human entries combined)
tags: String[] (custom tags for categorization)
created_at: DateTime
updated_at: DateTime
```

### 7.3 Calls Table
```
id: UUID (primary key)
lead_id: UUID (foreign key → Leads)
rep_id: UUID (foreign key → Users)
direction: Enum (OUTBOUND, INBOUND)
call_timestamp: DateTime
duration_seconds: Integer
status: Enum (COMPLETED, NO_ANSWER, BUSY, FAILED, CANCELLED)
outcome: Enum (ANSWERED, HUNG_UP_BY_CUSTOMER, HUNG_UP_BY_REP, UNANSWERED, BUSY, WRONG_NUMBER, VOICEMAIL)
recording_url: String (Twilio recording URL)
transcript_text: Text (AI-generated)
ai_summary: Text (AI-generated call summary)
ai_extracted_interest: String[] (facilities/interests detected)
ai_extracted_budget: String
ai_extracted_objections: String[]
ai_extracted_timeline: String
ai_sentiment: Enum (POSITIVE, NEUTRAL, NEGATIVE)
ai_coaching_flag: Boolean (true if rep needs coaching)
ai_coaching_note: Text (what rep did wrong/good)
rep_remarks: Text (manual remarks by rep after call)
created_at: DateTime
```

### 7.4 Conversations Table
```
id: UUID (primary key)
lead_id: UUID (foreign key → Leads)
channel: Enum (WHATSAPP, INSTAGRAM, FACEBOOK, SMS)
direction: Enum (INBOUND, OUTBOUND)
message_text: Text
media_url: String (optional — images, videos)
sent_by: Enum (AI_AGENT, SALES_REP, CUSTOMER)
sender_id: UUID (foreign key → Users, null if customer or AI)
ai_agent_id: Integer (which AI agent sent this: 1-5)
is_read: Boolean
timestamp: DateTime
```

### 7.5 FollowUps Table
```
id: UUID (primary key)
lead_id: UUID (foreign key → Leads)
assigned_to_id: UUID (foreign key → Users)
due_datetime: DateTime
priority: Enum (URGENT, HIGH, NORMAL, LOW)
status: Enum (PENDING, COMPLETED, MISSED, ESCALATED)
reason: Text (why follow-up needed)
last_call_summary: Text (AI-generated context for rep)
reminder_sent_at: DateTime
reminder_sent_via: Enum (WHATSAPP, IN_APP, BOTH)
escalated_to_id: UUID (foreign key → Users, null if not escalated)
escalated_at: DateTime
completed_at: DateTime
completion_notes: Text
created_at: DateTime
```

### 7.6 Memberships Table
```
id: UUID (primary key)
lead_id: UUID (foreign key → Leads, linked after conversion)
plan_type: Enum (ANNUAL, BI_ANNUAL, MONTHLY_INSTALLMENT, CORPORATE)
plan_name: String
start_date: Date
end_date: Date
family_members_count: Integer
family_member_names: String[]
status: Enum (ACTIVE, EXPIRING, EXPIRED, RENEWED, CANCELLED)
renewal_reminder_sent: Boolean
renewal_reminder_sent_at: DateTime
renewal_date: Date (when renewal is due)
amount_paid: Decimal
payment_method: String (CASH, BANK_TRANSFER, OTHER)
created_at: DateTime
updated_at: DateTime
```

### 7.7 AuditLog Table
```
id: UUID (primary key)
actor_type: Enum (SUPER_ADMIN, ADMIN, SALES_REP, AI_AGENT, SYSTEM)
actor_id: UUID (foreign key → Users, null for AI/SYSTEM)
actor_name: String
entity_type: Enum (LEAD, CALL, CONVERSATION, FOLLOW_UP, MEMBERSHIP, USER, SETTING)
entity_id: UUID
action: Enum (CREATE, UPDATE, DELETE, ASSIGN, ESCALATE, STATUS_CHANGE)
field_changed: String (which field was modified)
old_value: Text
new_value: Text
remarks: Text (optional context)
ip_address: String (optional)
created_at: DateTime
```

### 7.8 ChannelConnections Table
```
id: UUID (primary key)
channel: Enum (FACEBOOK, INSTAGRAM, WHATSAPP)
status: Enum (CONNECTED, DISCONNECTED, EXPIRED)
connected_at: DateTime
last_heartbeat_at: DateTime
access_token: Text (encrypted — Facebook/Instagram)
session_data: JSON (encrypted — WhatsApp session)
metadata: JSON (page ID, account ID, phone number, etc.)
created_at: DateTime
updated_at: DateTime
```

### 7.9 AIInsights Table (Self-Improvement)
```
id: UUID (primary key)
agent_id: Integer (which AI agent: 1-5)
insight_type: Enum (PATTERN, SUGGESTION, COACHING, IMPROVEMENT)
description: Text (what the AI found/proposes)
data_points: Integer (how many calls/conversations this is based on)
confidence_score: Float (0-1)
proposed_change: Text (what to change)
expected_impact: Text (why this helps)
status: Enum (PENDING_REVIEW, APPROVED, REJECTED, DEPLOYED)
reviewed_by: UUID (foreign key → Users)
reviewed_at: DateTime
review_notes: Text
created_at: DateTime
```

### 7.10 Notifications Table
```
id: UUID (primary key)
user_id: UUID (foreign key → Users)
type: Enum (NEW_LEAD, FOLLOW_UP_REMINDER, ESCALATION, CALL_OUTCOME, SYSTEM_ALERT, AI_INSIGHT)
title: String
message: Text
link: String (URL to relevant CRM page)
is_read: Boolean
sent_via: Enum (IN_APP, WHATSAPP, BOTH)
created_at: DateTime
```

---

## ═══════════════════════════════════════════════════════════════
## SECTION 8: CRM UI/UX SPECIFICATION
## ═══════════════════════════════════════════════════════════════

### 8.1 Design System
- **Framework:** Next.js + Tailwind CSS + shadcn/ui components
- **Theme:** Clean, modern, professional
- **Colors:** Sports Pavilion brand colors (to be confirmed) + clean whites/grays
- **Typography:** Clean sans-serif (Inter or similar)
- **Layout:** Sidebar navigation (collapsible) + top header bar
- **Responsive:** Desktop-first, fully mobile-responsive (reps will use phones)
- **Dark Mode:** Optional, not required for v1

### 8.2 Navigation Structure

**Sales Rep Sidebar:**
- Dashboard
- My Leads
- Pipeline (Kanban)
- Follow-Ups
- Messages (Unified Inbox)
- Call History
- Help

**Admin/Manager Sidebar:**
- Dashboard (Team Overview)
- All Leads
- Pipeline (Kanban)
- Team (Rep Performance)
- Follow-Ups (All)
- Messages (Unified Inbox)
- Call Recordings
- Reports
- Memberships
- Help

**Super Admin Sidebar:**
- Dashboard (Full System)
- All Leads
- Pipeline (Kanban)
- Team Management (Add/Remove Users)
- Follow-Ups (All)
- Messages (Unified Inbox)
- Call Recordings
- AI Agents (Status & Config)
- AI Insights (Self-Improvement)
- Memberships
- Channel Setup (FB, IG, WhatsApp, Meta Ads)
- Reports & Exports
- Audit Log
- Data Import
- Settings (Twilio, System, SLA Rules)
- Help

### 8.3 Dashboard Layout

**Sales Rep Dashboard:**
```
┌─────────────────────────────────────────────────────────┐
│  Good Morning, Ali! 👋                    🔔 3 alerts   │
├─────────────────────────────────────────────────────────┤
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐  │
│  │ 🆕 New   │ │ 📞 Calls │ │ ✅ Conv.  │ │ ⏰ Follow │  │
│  │ Leads: 5 │ │ Today: 3 │ │ Today: 1 │ │ Ups: 2   │  │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘  │
├─────────────────────────────────────────────────────────┤
│  🔥 HOT LEADS (Need Immediate Action)                   │
│  ┌─────────────────────────────────────────────────┐   │
│  │ Ahmed Khan | Membership | Score: 85 | 📞 Call    │   │
│  │ Sara Ali   | Event      | Score: 90 | 📞 Call    │   │
│  └─────────────────────────────────────────────────┘   │
├─────────────────────────────────────────────────────────┤
│  ⏰ UPCOMING FOLLOW-UPS                                 │
│  ┌─────────────────────────────────────────────────┐   │
│  │ 3:00 PM — Bilal Ahmed | "Call back about gym"    │   │
│  │ 5:30 PM — Omar Farooq | "Membership pricing"     │   │
│  └─────────────────────────────────────────────────┘   │
├─────────────────────────────────────────────────────────┤
│  📊 YOUR PERFORMANCE THIS WEEK                          │
│  Calls: 18 | Answered: 14 | Converted: 4              │
│  Response Time Avg: 3 min | Follow-ups: 6/8 done      │
└─────────────────────────────────────────────────────────┘
```

### 8.4 Lead Detail Page
```
┌─────────────────────────────────────────────────────────┐
│  ← Back to Leads                                        │
├─────────────────────────────────────────────────────────┤
│  Ahmed Khan                              Score: 🔥 85  │
│  📞 0321-XXXXXXX  |  📧 ahmed@email.com                │
│  Source: Meta Ad — "Family Membership Campaign"        │
│  Type: Membership | Status: Interested                 │
│  Assigned: Ali (Sales Rep)                             │
├─────────────────────────────────────────────────────────┤
│  ┌───────────────────┐ ┌────────────────────────────┐  │
│  │ LEAD INFO         │ │ CONVERSATION TIMELINE      │  │
│  │                   │ │                            │  │
│  │ Family: 5 members │ │ 💬 WhatsApp — Today 2:30PM │  │
│  │ Budget: 10-15K    │ │ Customer: "Hi, membership" │  │
│  │ Facilities:       │ │ 🤖 Bot: "Ji g! Plans are.."│  │
│  │ ☑ Cricket         │ │ Customer: "Ok call me"     │  │
│  │ ☑ Swimming Pool   │ │ 🤖 Bot: "Connecting you.."│  │
│  │ ☑ Gym             │ │                            │  │
│  │ ☐ Badminton       │ │ 📞 Call — Today 3:00 PM   │  │
│  │                   │ │ Duration: 4:32 | Answered   │  │
│  │ Tags: hot, family │ │ 🤖 AI Summary: Interested  │  │
│  │                   │ │ in family membership. Wife  │  │
│  │                   │ │ also wants gym. Budget 10K. │  │
│  │ [📞 Call Lead]    │ │                            │  │
│  │ [💬 Send Message] │ │ 📝 Remark — Today 3:05 PM  │  │
│  │                   │ │ Ali: "Will follow up Fri"  │  │
│  └───────────────────┘ └────────────────────────────┘  │
├─────────────────────────────────────────────────────────┤
│  CALL HISTORY                                            │
│  ┌─────────────────────────────────────────────────┐   │
│  │ Jan 15 3:00PM | Outbound | 4:32min | Answered  │   │
│  │ Jan 14 11:00AM | Outbound | 0:00 | Unanswered   │   │
│  └─────────────────────────────────────────────────┘   │
├─────────────────────────────────────────────────────────┤
│  FOLLOW-UPS                                              │
│  ┌─────────────────────────────────────────────────┐   │
│  │ 📅 Jan 17 3:00 PM | Urgent | Call back          │   │
│  │ "Customer asked to call Friday after 3PM"       │   │
│  └─────────────────────────────────────────────────┘   │
├─────────────────────────────────────────────────────────┤
│  MEMBERSHIP (if converted)                               │
│  Plan: Annual Family | Start: Jan 20 | End: Jan 2026   │
│  Members: 5 | Amount: PKR 100,000 | Status: Active      │
└─────────────────────────────────────────────────────────┘
```

### 8.5 Pipeline (Kanban Board)
Columns: New → Contacted → Interested → Negotiation → Booked → Lost
Each card shows: Lead name, score, source, last activity time
Cards are draggable between columns (updates status automatically)

### 8.6 Onboarding Tour Specification
- Library: React Joyride (or Shepherd.js)
- Triggers: First login only per user
- Features:
  - Step-by-step tooltip popups with highlight + backdrop
  - Progress indicator (Step 3 of 8)
  - Back / Next / Skip buttons
  - Contextual descriptions for each UI element
  - Role-specific tours (different steps per role)
  - Re-playable from Help menu
- Empty State Help Bubbles:
  - When a section has no data, show helpful message
  - "No leads yet. New leads from Meta Ads will appear here automatically."
  - "No follow-ups pending. Great job staying on top of things!"

---

## ═══════════════════════════════════════════════════════════════
## SECTION 9: LANGUAGE STRATEGY
## ═══════════════════════════════════════════════════════════════

| Context | Language | Notes |
|---|---|---|
| CRM Dashboard & UI | English | All labels, buttons, menus in English |
| CRM Reports & Exports | English | Professional reporting language |
| AI Agent → Sales Rep | English | Internal communications |
| Notifications to Reps | English | In-app + WhatsApp notifications |
| AI Bot → Customer (WhatsApp/IG/FB) | Smart Detection | See below |
| AI Voice Calls | Both Urdu & English | Detect customer's language |
| Call Transcripts | Original preserved | Whatever was spoken |
| Audit Logs | English | Original values preserved |

### Smart Language Detection (AI Agent 2 → Customer):
- Runs on EVERY incoming customer message
- Classification: Urdu (Roman) / English / Mixed / Other
- Thresholds: If >60% Roman Urdu words → respond in Roman Urdu
- Matching: Bot always matches customer's language and tone
- Falls back to English if language unclear
- Never mixes languages awkwardly — if customer switches language mid-conversation, bot follows

### Roman Urdu Examples:
- Greeting: "Assalam o Alaikum! Sports Pavilion RWP mein khush aamdeed! 🏟️"
- Membership info: "Ji g, humari family membership PKR 10,000/month se start hoti hai. 25+ facilities ka maza aapke pariwar ko milega."
- Follow-up: "Ahmed bhai, aapki membership ki baat humne kal ki thi. Kya aapne decide kar liya?"
- Price objection: "Samjhein, lekin agar per person calculate karein toh ye sirf PKR 1,400/month banta hai — 25+ sab facilities ke saath. Koi aur jagah aisi facility nahi milegi."

---

## ═══════════════════════════════════════════════════════════════
## SECTION 10: DATA MIGRATION
## ═══════════════════════════════════════════════════════════════

### 10.1 Existing Data Sources
- Physical registers (handwritten customer entries)
- Excel sheets (any format)

### 10.2 Import Tool
- Built into CRM → Super Admin → Data Import section
- Supports CSV and Excel (.xlsx) file uploads
- Step-by-step mapping wizard:
  1. Upload file
  2. CRM auto-detects column headers
  3. Map columns to CRM fields (name → first_name, phone → phone, etc.)
  4. Preview data before importing
  5. Import → Auto-deduplicate by phone number
  6. All imported leads tagged as "Legacy Import" with source = MANUAL_IMPORT
- Import history log (who imported, when, how many records, any errors)

### 10.3 Data Separation
- Legacy imported data is clearly tagged and separated from new CRM leads
- Can be used for reporting but doesn't trigger AI follow-up automation
- New leads (from Meta Ads, WhatsApp, etc.) are the primary focus

---

## ═══════════════════════════════════════════════════════════════
## SECTION 11: TECH STACK
## ═══════════════════════════════════════════════════════════════

| Layer | Technology | Purpose |
|---|---|---|
| Frontend | Next.js 14+ (App Router) | Full-stack React framework |
| UI Components | Tailwind CSS + shadcn/ui | Styling & component library |
| Backend | Next.js API Routes + Node.js | Server-side logic & APIs |
| ORM | Prisma | Database management |
| Database | PostgreSQL | Primary data store |
| Authentication | NextAuth.js | Secure login with role-based access |
| AI / LLM | OpenAI GPT-4o or Google Gemini | Powers all 5 AI agents |
| AI Voice (STT) | OpenAI Whisper or Google STT | Speech-to-text for call transcription |
| AI Voice (TTS) | OpenAI TTS or Google TTS | Text-to-speech for AI voice calls |
| AI Realtime | OpenAI Realtime API | Real-time voice AI for phone calls |
| Telephony | Twilio | Phone calls, recording, webhooks, numbers |
| WhatsApp | Baileys or Evolution API | WhatsApp Web protocol (QR code connection) |
| Facebook | Meta Graph API | Page messages, OAuth login |
| Instagram | Instagram Graph API | DMs, via same Facebook OAuth |
| Meta Ads | Meta Conversions API | Real-time lead form capture |
| Onboarding | React Joyride or Shepherd.js | Interactive tour system |
| File Storage | Cloudflare R2 or AWS S3 | Call recordings, media files |
| Hosting | Vercel | Frontend & API hosting |
| Database Hosting | Supabase or Neon | Managed PostgreSQL |

---

## ═══════════════════════════════════════════════════════════════
## SECTION 12: DEVELOPMENT PHASES
## ═══════════════════════════════════════════════════════════════

### Phase 1: Core CRM Foundation (Week 1-3)
**Priority: HIGH — Everything else depends on this**

- [ ] Project setup (Next.js, Tailwind, Prisma, PostgreSQL)
- [ ] Authentication system (NextAuth.js)
- [ ] Role-based access control (Super Admin, Admin, Sales Rep)
- [ ] User management (CRUD — add/remove reps and admins)
- [ ] Lead management (CRUD — create, view, update, list, filter, search)
- [ ] Lead detail page (info, timeline, call history)
- [ ] Lead scoring system (automatic score calculation)
- [ ] Pipeline / Kanban board (drag-and-drop stages)
- [ ] Status workflow (New → Contacted → Interested → Negotiation → Booked → Lost)
- [ ] Audit log system (track every change by every user)
- [ ] Data import tool (CSV/Excel upload, mapping, deduplication)
- [ ] Basic dashboard (stats cards, recent leads, quick actions)
- [ ] Notification system (in-app)
- [ ] Responsive design (mobile-friendly)
- [ ] Onboarding tour system (React Joyride, role-specific)

### Phase 2: AI Agents (Week 3-6)
**Priority: HIGH — The intelligence layer**

- [ ] AI Agent 1: Lead capture webhook receiver + qualification logic + auto-routing
- [ ] AI Agent 2: Customer-facing bot (WhatsApp)
  - Smart language detection (Urdu/English)
  - FAQ handling (timings, pricing, facilities, location)
  - Lead qualification conversation flow
  - Human handoff logic
- [ ] AI Agent 3: Call monitoring system
  - Twilio integration (outbound click-to-call)
  - Call recording
  - Call status webhook handling
  - Post-call AI transcription
  - AI call summary generation
  - AI insight extraction (interest, budget, objections)
- [ ] AI Agent 4: Follow-up & reminder system
  - SLA-based reminder rules
  - WhatsApp notification to reps
  - Escalation chain (Rep → Manager → Super Admin)
  - Automated customer nurturing sequences
- [ ] AI Agent 5: Reporting system
  - Daily/weekly/monthly/quarterly report generation
  - Export to CSV/Excel/PDF
  - Key metrics dashboard

### Phase 3: Omni-Channel Integration (Week 6-8)
**Priority: HIGH — Unified communication**

- [ ] WhatsApp connection (QR code scan via Baileys/Evolution API)
- [ ] WhatsApp message send/receive in CRM
- [ ] Facebook Page OAuth connection
- [ ] Facebook Messenger integration (receive + send)
- [ ] Instagram OAuth connection
- [ ] Instagram DM integration (receive + send)
- [ ] Unified inbox (all channels in one timeline per lead)
- [ ] Channel health monitoring (connection status, reconnection flow)
- [ ] Meta Ads webhook setup (lead form capture)

### Phase 4: Advanced Features (Week 8-11)
**Priority: MEDIUM — Enhancement layer**

- [ ] Membership management module
  - Create/update membership records
  - Track plan type, dates, family members
  - Expiry tracking & renewal reminders
- [ ] AI voice calling (outbound AI calls to leads)
- [ ] AI inbound call handling
- [ ] AI self-improvement loop
  - Pattern analysis from call data
  - Improvement suggestions panel
  - Approve/reject workflow for Super Admin
- [ ] AI coaching flags (for rep performance improvement)
- [ ] Advanced reporting & analytics dashboard
- [ ] Rep performance scorecards & leaderboards
- [ ] Help bubbles on empty states
- [ ] Context-sensitive help system

### Phase 5: Polish & Launch (Week 11-13)
**Priority: MEDIUM — Production readiness**

- [ ] End-to-end testing (all user flows)
- [ ] Performance optimization
- [ ] Security audit (input validation, XSS, CSRF, SQL injection)
- [ ] Error handling & self-healing mechanisms
- [ ] Mobile responsiveness final pass
- [ ] Super Admin configuration wizard polish
- [ ] Final onboarding tour content & testing
- [ ] Documentation (internal — for the team)
- [ ] Deployment to production (Vercel)
- [ ] WhatsApp reconnection monitoring
- [ ] Facebook/Instagram token expiry handling
- [ ] User acceptance testing with actual team

---

## ═══════════════════════════════════════════════════════════════
## SECTION 13: NOTIFICATION SPECIFICATION
## ═══════════════════════════════════════════════════════════════

### 13.1 Notification Types & Channels

| Event | Recipient | Channel | Message Example |
|---|---|---|---|
| New lead assigned | Sales Rep | In-App + WhatsApp | "🆕 New Lead: Ahmed Khan \| Cricket \| Hot \| 📞 0321-XXX" |
| Follow-up due (15 min before) | Sales Rep | In-App + WhatsApp | "⏰ Follow up Ahmed in 15 min \| 📝 Last call: interested..." |
| Follow-up SLA breached | Manager | In-App + WhatsApp | "⚠️ Ali missed follow-up for Ahmed Khan (Hot Lead)" |
| Follow-up SLA breached (Manager) | Super Admin | In-App + WhatsApp | "🚨 Manager didn't act on escalation for Ahmed Khan" |
| Hot lead not contacted (5 min) | Manager | In-App | "🔥 Hot lead Ahmed Khan not contacted in 5 min" |
| Call outcome logged | Sales Rep | In-App only | Call logged: Ahmed Khan — Answered, 4:32min |
| AI insight ready | Super Admin | In-App | "💡 New AI insight: Reps mentioning pool convert 40% more" |
| WhatsApp disconnected | Super Admin | In-App + WhatsApp | "📱 WhatsApp disconnected — Re-scan QR code" |
| FB/IG token expired | Super Admin | In-App | "🔗 Facebook connection expired — Reconnect" |
| Membership expiring (30 days) | Admin | In-App | "📋 Ahmed Khan's membership expires in 30 days" |
| New member converted | Sales Rep + Admin | In-App | "🎉 Ahmed Khan converted to Annual Family Membership!" |

### 13.2 Notification UI
- Bell icon in header with unread count badge
- Click → dropdown list of recent notifications
- Each notification has: icon, title, message, timestamp, "View" link
- Mark as read individually or "Mark all as read"
- Notification preferences per user (optional, v2)

---

## ═══════════════════════════════════════════════════════════════
## SECTION 14: SECURITY REQUIREMENTS
## ═══════════════════════════════════════════════════════════════

- Authentication: NextAuth.js with secure password hashing (bcrypt)
- Session management: Secure HTTP-only cookies
- Role-based access: Server-side middleware on every API route
- Input validation: Zod schemas on all API endpoints
- CSRF protection: Built into Next.js
- SQL injection: Prevented by Prisma ORM (parameterized queries)
- XSS prevention: Input sanitization, output encoding
- Rate limiting: API rate limiting to prevent abuse
- WhatsApp session data: Encrypted at rest
- Facebook access tokens: Encrypted at rest
- Call recordings: Stored in private cloud storage (not publicly accessible)
- Audit trail: Immutable log — cannot be edited or deleted by anyone
- Password policy: Min 8 characters, enforced on user creation

---

## ═══════════════════════════════════════════════════════════════
## SECTION 15: WHAT THIS CRM IS NOT
## ═══════════════════════════════════════════════════════════════

To prevent scope creep, explicitly OUT of scope for v1:
- ❌ Payment collection / online payment gateway (JazzCash, EasyPaisa, Stripe)
- ❌ Mobile app (native iOS/Android) — CRM is web-responsive
- ❌ n8n workflow automation (may add in v2 if needed)
- ❌ CloserX integration (rejected — building AI voice natively)
- ❌ Email marketing campaigns (may add in v2)
- ❌ Customer-facing public website / booking page
- ❌ Inventory or stock management
- ❌ Employee attendance / payroll
- ❌ Multi-location support (single location: Joyland Park)

---

## ═══════════════════════════════════════════════════════════════
## SECTION 16: SUCCESS METRICS (How We Know It Works)
## ═══════════════════════════════════════════════════════════════

After 30 days of CRM launch, we should see:
- 100% of leads from Meta Ads are captured in CRM (zero leakage)
- 80%+ of leads contacted within SLA (5 min for hot, 2 hrs for warm)
- 3+ call attempts for every lead before marking as lost
- Full conversation history available for every lead
- Sales reps can prove they contacted leads (audit trail)
- Manager can see exactly who's performing and who's not
- AI bot handles 80%+ of basic customer queries without human
- Super Admin can download reports in 1 click

After 90 days:
- Clear data on lead conversion rate (Meta Ads ROI)
- AI self-improvement loop producing actionable insights
- Reps using CRM daily without reminders
- Membership renewal tracking automated
- Significant increase in lead-to-customer conversion

---

## ═══════════════════════════════════════════════════════════════
## SECTION 17: QA CHECKLIST (Self-Verification)
## ═══════════════════════════════════════════════════════════════

### Requirements Coverage Check:
- [x] Meta Ads lead capture → CRM ✅ (Section 4.4, Agent 1)
- [x] WhatsApp integration (QR code) ✅ (Section 4.3)
- [x] Instagram DMs integration ✅ (Section 4.2)
- [x] Facebook Inbox integration ✅ (Section 4.1)
- [x] All channels unified in one place ✅ (Section 4.6)
- [x] AI agent transfers leads to sales reps ✅ (Section 5.1)
- [x] AI agent monitors if rep called ✅ (Section 5.3)
- [x] AI agent checks call outcome (answered/hung up/unanswered) ✅ (Section 5.3)
- [x] AI agent updates CRM with call results ✅ (Section 5.3)
- [x] AI agent reminds reps about follow-ups ✅ (Section 5.4)
- [x] AI agent includes call summary in reminder ✅ (Section 5.4)
- [x] AI agent handles follow-up scheduling ✅ (Section 5.4)
- [x] Data export daily/weekly/monthly/quarterly ✅ (Section 5.5)
- [x] Super Admin only downloads (or authorized Admin) ✅ (Section 3.2, 3.3)
- [x] 5 AI agents deployed ✅ (Section 5)
- [x] 80% AI / 20% human split ✅ (Section 5.2)
- [x] Call recording for new agents ✅ (Section 5.3)
- [x] AI improvement from call recordings ✅ (Section 6)
- [x] Customer-facing WhatsApp bot ✅ (Section 5.2)
- [x] Three panels: Super Admin, Admin, Sales Rep ✅ (Section 3)
- [x] Changes by sales rep or AI are recorded ✅ (Section 3.5, Section 7.7)
- [x] Add new / delete old sales reps ✅ (Section 3.2)
- [x] No payment collection ✅ (Section 15)
- [x] Membership tracking (not payments) ✅ (Section 7.6, Phase 4)
- [x] Plug & Play (FB/IG login, WhatsApp QR) ✅ (Section 2, Section 4)
- [x] Language: CRM English, Bot smart Urdu/English ✅ (Section 9)
- [x] Data import (Excel/registers) ✅ (Section 10)
- [x] Onboarding tour ✅ (Section 8.6)
- [x] Twilio for calling (not CloserX) ✅ (Section 4.5)
- [x] Self-healing system ✅ (Section 2, Rule 4)
- [x] AI voice calls (Urdu + English) ✅ (Section 5.3, Section 9)
- [x] Audit trail ✅ (Section 7.7)
- [x] Pipeline/Kanban ✅ (Section 8.5)
- [x] Lead scoring ✅ (Section 5.1)
- [x] Escalation chain ✅ (Section 5.4)
- [x] Notification system ✅ (Section 13)

### Potential Gaps Identified & Addressed:
- [x] WhatsApp reconnection flow (session expiry) → Added in Section 2, Rule 4
- [x] FB/IG token refresh → Added in Section 4.1/4.2
- [x] Call recording consent → Added in Section 5.3 (disclosure on call start)
- [x] AI hallucination prevention → Added in Section 6 (human approval) + Section 5.2 (knowledge base only)
- [x] Deduplication → Added in Section 5.1 (phone number matching)
- [x] N/A: n8n not needed for v1 → Documented in Section 15
- [x] Mobile responsiveness → Added in Section 2, Rule 3 + Section 12
- [x] Customer asks to call back → Added in Section 5.4 (exact scheduling)

---

## END OF MASTER PROMPT v1.0

This document is the complete and final specification for the Sports Pavilion
Rawalpindi CRM system. All development must reference this document as the
single source of truth. Any deviations require explicit approval from the
Super Admin.

Last Updated: 2026-04-23
Version: 1.0
Status: READY FOR EXECUTION
