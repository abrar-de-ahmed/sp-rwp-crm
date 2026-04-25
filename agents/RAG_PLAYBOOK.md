# RAG PLAYBOOK — Client Onboarding Agent | SP RWP CRM

> **Role:** Client Onboarding Specialist — knows how to deploy for ANY business
> **Updated:** 2026-04-26
> **Reports to:** CHAMP (Supervisor)

## PURPOSE
I am the Client Onboarding Agent. I contain the complete playbook for taking
this CRM system and deploying it for a NEW client organization. I know how to
ingest their data via RAG (Retrieval-Augmented Generation), configure their
AI to be domain-expert from day one, and replicate the intelligence built
for SPR into any new deployment.

When the team says "clone for new client," read me first.

---

## 1. CLONING STRATEGY

### What Gets Cloned:
- [x] Full codebase (git clone or copy)
- [x] Database schema (Prisma — same for all clients)
- [x] AI agent architecture (same 6 agents for all clients)
- [x] Learning engine (same self-improvement system)
- [x] Workflow engine (same 8 workflow types)
- [x] Channel connections (Meta, WhatsApp, Email — per client)
- [x] UI/UX (same CRM interface, can be white-labeled)

### What Does NOT Clone (Client-Specific):
- [ ] Database data (leads, conversations, audit logs)
- [ ] Channel credentials (Meta tokens, WhatsApp numbers)
- [ ] Client context (pricing, facilities, FAQs, business rules)
- [ ] AI learning data (conversation patterns specific to previous client)
- [ ] User accounts (new team per client)
- [ ] Environment variables

### What Partially Clones (Template + Customize):
- [ ] CRM_BRAIN.md → Keep structure, reset conversion data
- [ ] CLIENT_CONTEXT.md → Keep template, fill with new client data
- [ ] Static FAQs → Reset, populate from new client data
- [ ] Email templates → Reset content, keep structure
- [ ] Workflow triggers → Keep logic, adjust timing/rules

---

## 2. NEW CLIENT ONBOARDING PROCESS

### Step 1: Discovery Call
Gather from the client:
- [ ] Business name, type, location
- [ ] Target market and customer demographics
- [ ] Primary communication channels (WhatsApp, FB, IG, email, phone)
- [ ] Current CRM or lead management process
- [ ] Pain points with current system
- [ ] Team size and roles
- [ ] Pricing and service catalog
- [ ] Business hours and operating schedule
- [ ] Existing customer data (can they export?)
- [ ] Brand guidelines (colors, logo, tone of voice)

### Step 2: Data Collection & RAG Ingestion
Collect and ingest into the AI system:

#### 2.1 Structured Data (Manual Entry)
- Business profile → CLIENT_CONTEXT.md
- Facilities/services → CLIENT_CONTEXT.md
- Pricing → CLIENT_CONTEXT.md
- Team members → Create via seed script
- FAQs → Static FAQ system in ai-agent.ts

#### 2.2 Unstructured Data (RAG Ingestion)
Sources to collect from client:
- [ ] **Website text** — scrape homepage, about, services, pricing pages
- [ ] **PDF brochures** — membership plans, facility guides, event packages
- [ ] **Social media bios** — Facebook, Instagram business descriptions
- [ ] **Google Business profile** — reviews, Q&A, business info
- [ ] **Existing customer emails** — common questions, complaint patterns
- [ ] **Sales call transcripts** — if available
- [ ] **Competitor analysis** — pricing comparison, market positioning

#### 2.3 RAG Processing Pipeline
```
Raw Data (PDF, website, social)
  → Clean & Chunk (split into manageable sections)
  → Embed & Store (vector database or structured JSON)
  → Inject into AI Prompts (relevant context per query)
  → Human Review & Refinement
```

#### 2.4 Knowledge Base Files
For each new client, create:
```
agents/
├── CLIENT_CONTEXT.md      ← Their specific business data
├── KNOWLEDGE_BASE.md      ← RAG-extracted insights
└── RESPONSE_TEMPLATES.md  ← Approved response patterns
```

### Step 3: System Configuration
1. **Create new database** (or separate schema in PostgreSQL)
2. **Seed team users** with client's actual team
3. **Configure channels:**
   - Meta Developer App (client's app or shared)
   - WhatsApp Business number
   - Email (Resend or client's SMTP)
4. **Populate static FAQs** from collected data
5. **Configure bot personality** to match client's brand voice
6. **Set up workflows** with client-specific timing
7. **Customize email templates** with client's branding
8. **Set RBAC roles** per client's team structure

### Step 4: Training & Testing
1. Train client's team on CRM usage
2. Test all channels with real messages (sandbox)
3. Verify AI responses match client's brand voice
4. Test lead scoring with client-specific criteria
5. Run full QA using QA_EXPERT.md checklist
6. Get client sign-off on bot responses

### Step 5: Go Live
1. Deploy to production
2. Configure custom domain
3. Connect real channels
4. Monitor first 72 hours closely
5. Daily check-ins with client for first week
6. Weekly review for first month

---

## 3. RAG IMPLEMENTATION (Technical)

### Current Architecture:
- AI system prompts are in `src/lib/ai-agent.ts`
- Learning context is injected via `getLearningContext()` in `src/lib/ai-learning.ts`
- Static FAQs are in `matchFAQ()` function
- Dynamic FAQs come from AILearning table

### RAG Enhancement Plan (Phase 5):
1. **Vector Storage:** Add embeddings storage (could be SQLite with vector extension, or external like Pinecone)
2. **Document Processing:** Ingest PDFs, web pages → chunk → embed → store
3. **Retrieval:** On each AI query, retrieve relevant chunks based on similarity
4. **Context Injection:** Add retrieved chunks to system prompt alongside learning context
5. **Feedback Loop:** Track which retrieved chunks led to positive outcomes

### Simple RAG (No Vector DB — Phase 3C):
```
1. Client provides documents
2. AI extracts key information into structured format
3. Store in CLIENT_CONTEXT.md + KNOWLEDGE_BASE.md
4. On each query, search these files for relevant sections
5. Inject relevant sections into AI prompt
```

---

## 4. WHITE-LABELING

### Branding Customization:
| Element | Location | How to Change |
|---------|----------|---------------|
| App name | sidebar.tsx, login.tsx, page titles | Search and replace |
| Logo | login.tsx, header.tsx | Replace Trophy icon + text |
| Primary color | globals.css (oklch variables) | Change hue value |
| Welcome message | ai-agent.ts (bot greeting) | Update system prompt |
| Email branding | email.ts (templates) | Update template content |

### Custom Domain:
1. Add domain in Cloudflare
2. Build and deploy
3. Configure DNS records
4. Update NEXTAUTH_URL
5. Update webhook URLs in Meta/WhatsApp

---

## 5. PRICING MODEL (For Reselling)

> This section is for the business owner to decide. Not implemented yet.

### Suggested Pricing Tiers:
| Tier | Features | Monthly Price |
|------|----------|--------------|
| Starter | CRM + AI Bot (1 channel) | PKR 10,000-15,000 |
| Professional | CRM + AI Bot (all channels) + Learning | PKR 25,000-35,000 |
| Enterprise | Full system + RAG + White-label + Priority | PKR 50,000+ |

### Revenue Model Options:
- Monthly subscription
- Per-seat pricing
- Setup fee + monthly
- Revenue share on conversions

---

## 6. MULTI-TENANCY (Future Architecture)

> Not implemented yet. This is the technical plan for when we need to
> serve multiple clients from one deployment.

### Database Strategy:
- Option A: Separate databases per client (simplest)
- Option B: Shared database with tenant_id column
- Option C: Shared database with schema-per-tenant

### Recommended: Option A (Separate DBs)
- Easiest to manage
- Full data isolation
- Simple backup/restore
- Scale independently
- Neons free tier = 0.5GB per client

---

*RAG PLAYBOOK is maintained by the AI assistant.*
*This is the blueprint for scaling to multiple clients.*
*Last updated: Session 7 (2026-04-26)*
