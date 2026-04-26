# RAG PLAYBOOK — Client Onboarding Agent

> **Role:** You are the Onboarding Agent. You own the process of taking this CRM and making it work for a NEW client — a different sports facility, gym, or recreation center. You know how to clone, configure, and deploy the system for any organization. When anyone asks "how do we set this up for Client X?" or "what do we need to onboard a new facility?" — you answer.
>
> **Last Updated:** 2026-04-27

---

## 1. ONBOARDING OVERVIEW

The SP RWP CRM is designed to be **cloneable** for any sports facility, gym, or recreation center. The core CRM code is generic — client-specific data lives in:

1. **CLIENT_CONTEXT.md** (this agent's sibling) — Business rules, FAQs, pricing
2. **CRM_BRAIN.md** (this agent's sibling) — AI behavior, objection handling
3. **Database seed data** — Initial users, sample leads
4. **Theme configuration** — Colors, logo, branding
5. **AI system prompts** — Bot personality, knowledge base

### What's Generic (Works for Any Client)
- Lead management (CRUD, pipeline, Kanban)
- Follow-up system
- Call history and recording
- Team management and RBAC
- AI agents (scoring, bot, call monitor, etc.)
- Self-learning engine
- Unified Inbox (WhatsApp, Facebook, Instagram)
- Email automation
- Workflow engine
- Dashboard and reports
- Data import/export
- Audit logging

### What's Client-Specific (Needs Configuration)
- Company name, logo, branding
- Facilities and pricing
- FAQs and objection handling
- Bot personality and voice
- Team members and roles
- Meta/WhatsApp/Email credentials
- Membership plans

---

## 2. ONBOARDING CHECKLIST

### Phase 1: Discovery (Day 1-2)
- [ ] Client meeting — understand business model
- [ ] List all facilities and services
- [ ] Get pricing for all membership plans
- [ ] Collect existing customer FAQs (from staff, WhatsApp, FB)
- [ ] Identify common customer objections
- [ ] Get team member list with roles
- [ ] Determine communication channels (WhatsApp, FB, IG)
- [ ] Get brand assets (logo, colors, fonts)

### Phase 2: Configuration (Day 2-3)
- [ ] Clone GitHub repo to new project
- [ ] Update CLIENT_CONTEXT.md with real data
- [ ] Update CRM_BRAIN.md with client-specific objection handling
- [ ] Configure AI bot personality and system prompts
- [ ] Customize theme (colors, logo)
- [ ] Create seed data with real team members
- [ ] Set up Meta Developer App for client
- [ ] Connect WhatsApp Business number
- [ ] Configure email (Resend or other provider)

### Phase 3: Data Load (Day 3-4)
- [ ] Import existing customer data (CSV/XLSX)
- [ ] Map fields to CRM schema
- [ ] Assign leads to team members
- [ ] Verify data integrity

### Phase 4: Testing (Day 4-5)
- [ ] Test all channels (WhatsApp, FB, IG)
- [ ] Verify AI bot responses with real FAQs
- [ ] Test workflow triggers
- [ ] Verify email delivery
- [ ] Test with 5-10 real customer conversations
- [ ] Get feedback from client team

### Phase 5: Training (Day 5-7)
- [ ] Train team on CRM interface
- [ ] Train team on AI bot handoff process
- [ ] Set up monitoring and notifications
- [ ] Document any client-specific procedures

### Phase 6: Go Live (Day 7+)
- [ ] Deploy to production (Cloudflare Pages)
- [ ] Migrate database to Neon PostgreSQL
- [ ] Set up custom domain
- [ ] Monitor first week closely
- [ ] Collect feedback and iterate

---

## 3. CLONING THE CRM FOR A NEW CLIENT

### Step 1: Fork/Clone
```bash
# Option A: Fork on GitHub (recommended)
# Go to repo → Fork → New repo for client

# Option B: Clone and create new repo
git clone https://github.com/abrar-de-ahmed/sp-rwp-crm.git new-client-crm
cd new-client-crm
# Remove old git history
rm -rf .git
git init
git add .
git commit -m "initial: clone from SP RWP CRM"
```

### Step 2: Rebrand
```bash
# Update package.json
# - name: "new-client-crm"
# - description: "CRM for [Client Name]"

# Update theme in globals.css
# - Change primary hue from 155 to client's brand color
# - Update logo and favicon

# Update .env.example
# - Change database name
# - Update project references
```

### Step 3: Configure Client Data

**Update CLIENT_CONTEXT.md:**
```markdown
| Field | Value |
|-------|-------|
| Client Name | [New Client Name] |
| Industry | Sports / Fitness / Recreation |
| Location | [City, Country] |
| Facilities | [List from discovery] |
| Membership Plans | [Pricing from discovery] |
| FAQs | [Collected FAQs] |
```

**Update CRM_BRAIN.md:**
- Bot personality and voice
- Objection handling patterns
- Follow-up timing rules (may differ by business)
- Conversion strategy

**Update seed data:**
```typescript
// prisma/seed.ts
// Replace with new client's team members
const users = [
  { name: "Admin Name", email: "admin@client.com", role: "SUPER_ADMIN" },
  // ...
];
```

### Step 4: Set Up Infrastructure
```bash
# Create new GitHub repo (private)
# Create Cloudflare Pages project
# Create Neon PostgreSQL database
# Create Resend account or domain
# Create Meta Developer App for client
# Set up WhatsApp Business number
```

---

## 4. CLIENT-SPECIFIC CONFIGURATION GUIDE

### Theme Customization
The theme uses oklch color system. Primary hue is the main brand color.

```css
/* In globals.css — change these values */
:root {
  --primary: oklch(0.7 0.15 155);  /* Hue 155 = emerald/teal */
  /* Change 155 to any hue:
     0 = red, 30 = orange, 60 = yellow,
     120 = green, 155 = teal, 240 = blue,
     270 = purple, 330 = pink */
}
```

### Bot Personality Configuration
Edit the system prompt in `src/lib/ai-agent.ts`:
```typescript
// Customer bot system prompt
const systemPrompt = `
You are the AI assistant for [CLIENT_NAME].

Tone: [professional/warm/casual]
Language: [supported languages]
Special instructions:
- [Client-specific greeting style]
- [Client-specific pricing approach]
- [Client-specific booking process]
- [Client-specific unique selling points]
`;
```

### Membership Plans Configuration
The CRM supports flexible plan types. Configure in CLIENT_CONTEXT.md and the plan options will appear in the UI:
- ANNUAL — 12-month commitment
- BI_ANNUAL — 6-month commitment
- MONTHLY_INSTALLMENT — Monthly recurring
- CORPORATE — Custom corporate packages

### Workflow Customization
Edit `src/lib/workflow-engine.ts` to adjust:
- Trigger conditions
- Action sequences
- Notification rules
- Escalation timing

---

## 5. MULTI-TENANT CONSIDERATIONS (Future)

Currently the CRM is **single-tenant** — one deployment per client. Future multi-tenant support would require:

### Database Changes
- Add `organizationId` to all tables
- Filter all queries by organization
- Separate user pools per organization

### App Changes
- Organization selection/login
- Organization-scoped data
- Shared infrastructure, isolated data

### NOT YET IMPLEMENTED — each client gets their own:
- GitHub repo (fork)
- Database (Neon)
- Cloudflare Pages deployment
- Meta Developer App
- WhatsApp Business account
- Resend domain

This is actually BETTER for now because:
- Complete data isolation (no data leaks between clients)
- Independent scaling per client
- Client-specific customizations don't affect others
- Simpler architecture, easier to maintain

---

## 6. DATA MIGRATION FOR NEW CLIENTS

### Import Format
The CRM supports CSV and XLSX import. Required fields for leads:

| Field | Required | Format |
|-------|----------|--------|
| firstName | Yes | Text |
| lastName | Yes | Text |
| phone | Yes | +92XXXXXXXXXX |
| email | No | valid@email.com |
| source | No | One of: META_AD, WHATSAPP, WALK_IN, etc. |
| leadType | No | One of: MEMBERSHIP, DAY_PASS, CORPORATE, etc. |
| budgetRange | No | One of: UNDER_10K, 10K_15K, etc. |
| remarks | No | Free text |
| tags | No | Comma-separated |

### Bulk Import Process
1. Prepare CSV/XLSX with headers matching above
2. Login as SUPER_ADMIN
3. Go to Data Import
4. Upload file
5. Map columns (auto-detected, manual override available)
6. Preview import (shows first 10 rows)
7. Confirm import
8. Leads created with MANUAL_IMPORT source by default

---

## 7. PRICING THE CRM FOR CLIENTS

### Cost Structure (per client)
| Item | Cost to Us | What We Charge |
|------|-----------|---------------|
| Cloudflare Pages | FREE | Included |
| Neon PostgreSQL | FREE (0.5GB) | Included |
| Meta WhatsApp | FREE (1000 convos) | After 1000, client pays |
| Resend Email | FREE (3000/mo) | After 3000, client pays |
| GLM-4 Plus AI | FREE tier | After free tier, client pays |
| Domain | ~$10/year | Client pays |

### Suggested Pricing Model
- **Setup Fee:** [To be determined by client/owner]
- **Monthly Fee:** [To be determined]
- **WhatsApp overage:** Pass-through cost
- **AI overage:** Pass-through cost

> **NOTE:** Pricing strategy is a business decision for Abrar Ahmed. The CRM is designed to be profitable even at low price points because infrastructure costs are near-zero.

---

## 8. REUSABLE ASSETS

### What Gets Copied for Each Client
1. Full codebase (GitHub fork)
2. Agent files (adapted for new client)
3. Deployment scripts
4. Testing procedures

### What Gets Created Fresh
1. CLIENT_CONTEXT.md (client-specific data)
2. Seed data (client's team members)
3. Theme customization (client's branding)
4. Infrastructure accounts (Meta, WhatsApp, Resend, Neon, Cloudflare)
5. Domain and SSL

---

*RAG Playbook is maintained by the AI assistant. Updated with every onboarding lesson learned.*
