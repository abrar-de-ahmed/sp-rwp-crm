# PLAYBOOK — Operations Agent | SP RWP CRM

> **Role:** Operations — step-by-step procedures for every task
> **Updated:** 2026-04-26
> **Reports to:** CHAMP (Supervisor)

## PURPOSE
I am the Operations Agent. I contain step-by-step procedures for EVERY task
in this project — from setting up a new channel to deploying to production
to onboarding a new client. No one should guess how to do anything —
read me first, then execute.

---

## 1. PROJECT SETUP (From Scratch)

### Step 1: Clone & Install
```bash
git clone https://github.com/abrar-de-ahmed/sp-rwp-crm.git
cd sp-rwp-crm
npm install
```

### Step 2: Environment Setup
```bash
cp .env.example .env
# Edit .env — add NEXTAUTH_SECRET, DATABASE_URL
```

### Step 3: Database
```bash
npx prisma db push
npx prisma db seed
```

### Step 4: Start
```bash
npm run dev
# Open http://localhost:3000
# Login: admin@spcrm.com / admin123
```

### Step 5: Verify
- [ ] Login works with admin123
- [ ] Dashboard loads with KPI cards
- [ ] Leads page shows sample data
- [ ] Pipeline shows Kanban board
- [ ] AI Agents page shows 6 agents

---

## 2. ADDING A NEW PAGE

### Mandatory 5-Step Process:
1. **Create component:** `src/components/[name]-page.tsx`
   - Use existing pages as templates
   - Accept `{ user: UserProps }` prop
   - Add RBAC check at top: `if (user.role !== 'SUPER_ADMIN') return <AccessDenied />`

2. **Register PageId:** Edit `src/components/sidebar.tsx`
   - Add to `PageId` type union
   - Add display name to `pageTitles` record

3. **Add to Navigation:** Edit `src/components/sidebar.tsx`
   - Add to `adminItems` (ADMIN+ pages)
   - Add to `superAdminItems` (SA-only pages)
   - Or add to `commonItems` (all roles)

4. **Wire into Router:** Edit `src/components/crm-layout.tsx`
   - Add case to switch statement: `case 'new-page': return <NewPage />`

5. **Test:** Verify it appears in sidebar, loads correctly, RBAC works

### Common Mistakes:
- Forgetting step 2 — page has no title
- Forgetting step 3 — page doesn't appear in sidebar
- Forgetting step 4 — clicking sidebar item shows blank
- Forgetting RBAC — lower roles can access admin pages

---

## 3. ADDING A NEW API ROUTE

### Route File Location:
```
src/app/api/[route-name]/route.ts
```

### For nested routes (with ID parameter):
```
src/app/api/[route-name]/[id]/route.ts
```

### Standard Route Template:
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, requireRole } from '@/lib/auth-helpers';
import { db } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const session = await requireAuth();
    // ... business logic
    return NextResponse.json({ data });
  } catch (error) {
    if (error instanceof Response) return error;
    console.error('[route-name] Error:', error);
    return NextResponse.json({ error: 'Description' }, { status: 500 });
  }
}
```

### RBAC Levels:
- `requireAuth()` — Any authenticated user
- `requireRole('ADMIN')` — ADMIN or SUPER_ADMIN
- `requireRole('SUPER_ADMIN')` — SUPER_ADMIN only

### After Creating:
- [ ] Test with each role (SA, ADMIN, REP)
- [ ] Verify 401 for unauthenticated
- [ ] Verify 403 for unauthorized roles
- [ ] Add to CHAMP.md API routes table

---

## 4. CONNECTING META (FACEBOOK/INSTAGRAM)

### Prerequisites:
- Meta Developer Account (developers.facebook.com)
- Meta App with Messenger product added
- Facebook Page linked to the app
- Instagram Business Account linked to Facebook Page

### Step-by-Step:

#### 4.1 Create Meta App
1. Go to https://developers.facebook.com/apps/
2. Click "Create App" → "Business" type
3. Fill in app name, contact email, business account
4. In App Dashboard → Add Products → Messenger
5. Add Products → Instagram Graph API

#### 4.2 Get Credentials
1. Settings → Basic → Copy **App ID** and **App Secret**
2. Go to Tools → Graph API Explorer
3. Select your app and page
4. Grant permissions: `pages_messaging`, `instagram_basic`, `instagram_manage_messages`
5. Generate **Page Access Token** (use long-lived token)

#### 4.3 Configure Webhook
1. In Messenger settings → Webhooks → Setup
2. Callback URL: `https://[your-domain]/api/webhooks/meta`
3. Verify Token: `sp-rwp-crm-meta-verify` (or env WHATSAPP_VERIFY_TOKEN)
4. Subscribe to: `messages`, `messaging_postbacks`

#### 4.4 Connect in CRM
1. Login as SUPER_ADMIN
2. Go to Channel Setup page
3. Click Connect on Facebook/Instagram
4. Enter App ID, App Secret, Page Access Token
5. Click "Test Connection" — verify token is valid
6. Click "Connect" — saves to database

---

## 5. CONNECTING WHATSAPP

### Prerequisites:
- Meta Business Account
- WhatsApp Business API approved (may require business verification)
- Phone number to use for WhatsApp Business

### Step-by-Step:

#### 5.1 Enable WhatsApp Business API
1. Go to https://business.facebook.com/settings/whatsapp-business-api
2. Add WhatsApp to your Meta App
3. Add or verify a phone number
4. Copy the **Phone Number ID** from the phone numbers list

#### 5.2 Get Access Token
1. In WhatsApp settings → API Setup
2. Generate a **Permanent Access Token**
3. Note: Token needs `whatsapp_business_messaging` permission
4. Copy the **App Secret** from Meta App → Settings → Basic

#### 5.3 Configure Webhook
1. In WhatsApp settings → Webhooks → Setup
2. Callback URL: `https://[your-domain]/api/webhooks/whatsapp`
3. Verify Token: Same as Meta verify token
4. Subscribe to: `messages`

#### 5.4 Connect in CRM
1. Login as SUPER_ADMIN
2. Go to Channel Setup → Connect WhatsApp
3. Enter Phone Number ID, Access Token, App Secret
4. Click "Test Connection" — verifies via Graph API
5. Click "Connect"

---

## 6. DATABASE OPERATIONS

### Reset Database (Development Only):
```bash
npx prisma db push --force-reset
npx prisma db seed
```

### Add a New Table:
1. Add model to `prisma/schema.prisma`
2. Run `npx prisma db push`
3. Update CHAMP.md schema section
4. Create API routes if needed
5. Add seed data if needed

### Add a New Column:
1. Add field to model in `prisma/schema.prisma`
2. Run `npx prisma db push`
3. Update any API routes that use this model
4. Update any page components that display this data

### Migrate SQLite → Neon PostgreSQL:
1. Create Neon account at https://neon.tech
2. Create project, copy connection string
3. Update .env: `DATABASE_URL=postgresql://...`
4. In schema.prisma: change `provider = "sqlite"` to `provider = "postgresql"`
5. Run `npx prisma db push`
6. Run `npx prisma db seed`
7. Test thoroughly

---

## 7. AI CONFIGURATION

### Changing AI Model:
- ALL AI calls go through `callLLM()` in `src/lib/ai-agent.ts`
- Change model in ONE place: line ~398 `model: 'glm-4-plus'`
- No other files need changes

### Adding a New AI Agent:
1. Add agent config to `agents` array in `src/lib/ai-agent.ts`
2. Create system prompt for the agent
3. Create API route in `src/app/api/ai/[agent-name]/route.ts`
4. Add to AI Agents page UI in `src/components/ai-agents-page.tsx`
5. Update CHAMP.md agents section

### Managing FAQ:
- Static FAQs are in `src/lib/ai-agent.ts` (matchFAQ function)
- Dynamic FAQs are auto-discovered by the learning system
- Review FAQ candidates at AI Learning page → FAQ Candidates tab
- Approved FAQs are added to the dynamic knowledge base

### Managing Learning:
- View patterns: AI Learning page → Patterns tab
- Approve/reject: Individual learning records
- Trigger analysis: POST /api/ai/learning/analyze
- View stats: AI Learning page → Stats tab

---

## 8. DEPLOYMENT

### Cloudflare Pages (Planned):
1. Connect GitHub repo to Cloudflare Pages
2. Build command: `npm run build`
3. Output directory: `.next`
4. Environment variables: Set all .env vars in Cloudflare
5. Note: Need `output: 'standalone'` or Cloudflare adapter

### Domain Setup:
1. Add domain in Cloudflare dashboard
2. Update CLOUDFLARE_ZONE_ID in environment
3. Configure DNS records (A/CNAME)
4. SSL is automatic via Cloudflare
5. Update NEXTAUTH_URL to production URL

### CI/CD Pipeline (Planned):
1. Create `.github/workflows/deploy.yml`
2. Trigger on push to main
3. Run tests, build, deploy to Cloudflare

---

## 9. TROUBLESHOOTING

### Login Doesn't Work:
- Check NEXTAUTH_SECRET exists in .env
- Check user exists in database: `npx prisma db seed`
- Check password: admin=admin123, reps=password123
- Clear browser cookies and try again

### API Returns 500:
- Check server console for error logs
- Common cause: AuditLog FK violation (fixed in Session 6)
- Common cause: Database corruption (reset with force-reset)

### WhatsApp/Meta Connection Fails:
- Verify token is valid and not expired
- Check permissions on the token
- Verify webhook URL is publicly accessible (use ngrok for dev)
- Check Meta App is in Development mode (no approval needed)

### Build Fails:
- Run `rm -rf node_modules .next && npm install`
- Check for TypeScript errors in new files
- Verify imports use `@/lib/...` alias

### Database Corrupted:
```bash
rm db/custom.db
npx prisma db push
npx prisma db seed
```

---

## 10. GIT WORKFLOW

### Current Setup:
- Single branch: `main`
- Direct push to main (no PR process)
- Private repo

### Before Every Commit:
- [ ] Build passes: `npm run build`
- [ ] No .env committed
- [ ] Update CHAMP.md if significant work done
- [ ] Update relevant agent file (ARCHITECTURE, CRM_BRAIN, etc.)

### Commit Message Format:
```
[scope] Brief description
[scope] Feature: description
[scope] Fix: description
```

---

*PLAYBOOK is maintained by the AI assistant. Updated after every procedure change.*
*Last updated: Session 7 (2026-04-26)*
