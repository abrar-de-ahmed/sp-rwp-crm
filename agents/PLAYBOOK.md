# PLAYBOOK — Operations Agent

> **Role:** You are the Operations Agent. You own every procedure, setup guide, troubleshooting step, and deployment instruction. When anyone asks "how do I do X?" or "something broke, how do I fix it?" — you answer.
>
> **Last Updated:** 2026-04-27

---

## 1. RECOVERY PLAYBOOK (If Everything Breaks)

### Full Rebuild from Scratch
```bash
# 1. Clone the repo
git clone https://github.com/abrar-de-ahmed/sp-rwp-crm.git
cd sp-rwp-crm

# 2. Install dependencies
npm install
# OR: bun install

# 3. Setup environment
cp .env.example .env
# Edit .env — add NEXTAUTH_SECRET, DATABASE_URL

# 4. Setup database
npx prisma db push
npx prisma db seed

# 5. Start dev server
npm run dev
# OR: bun dev

# 6. Open browser
# http://localhost:3000

# 7. Login
# admin@spcrm.com / admin123
```

### If Only Database is Lost
```bash
npx prisma db push --force-reset
npx prisma db seed
```

### If Only node_modules are Lost
```bash
rm -rf node_modules .next
npm install
npm run dev
```

### If Login Stops Working
1. Check `.env` has `NEXTAUTH_SECRET`
2. Check `.env` has `NEXTAUTH_URL=http://localhost:3000`
3. Delete `.next` folder and restart: `rm -rf .next && npm run dev`
4. If still broken, re-seed: `npx prisma db seed`
5. Default admin: `admin@spcrm.com` / `admin123`

### If API Routes Return 500
1. Check database exists: `ls db/custom.db`
2. Run `npx prisma db push` to sync schema
3. Check `.env` DATABASE_URL is correct
4. Check server console for specific error

### If WhatsApp/Meta Webhooks Not Receiving
1. Verify webhook URL is publicly accessible (use ngrok for local dev)
2. Verify app secret matches in Meta Developer dashboard
3. Check `/api/webhooks/meta` returns challenge response on GET
4. Check `/api/webhooks/whatsapp` returns challenge response on GET
5. Verify token in Meta dashboard matches NEXTAUTH_SECRET or configured verify token

---

## 2. LOCAL DEVELOPMENT SETUP

### Prerequisites
- Node.js 18+ or Bun
- Git
- A terminal

### Step-by-Step
```bash
# Clone
git clone https://github.com/abrar-de-ahmed/sp-rwp-crm.git
cd sp-rwp-crm

# Install
npm install

# Environment
cp .env.example .env
# Required vars:
# DATABASE_URL=file:./db/custom.db
# NEXTAUTH_SECRET=any-random-string
# NEXTAUTH_URL=http://localhost:3000

# Database
npx prisma db push
npx prisma db seed

# Run
npm run dev
```

### Port 3000 in Use?
```bash
# Kill process on port 3000
lsof -ti:3000 | xargs kill -9
# Or use a different port
PORT=3001 npm run dev
```

### Database Browser
Use DB Browser for SQLite to inspect `db/custom.db`:
```bash
# Install
sudo apt install sqlitebrowser
# Or use Prisma Studio
npx prisma studio
```

---

## 3. ADDING A NEW PAGE (Step-by-Step)

**There are exactly 5 steps. Do ALL 5 or the page won't work.**

### Step 1: Create Component
Create `src/components/your-new-page.tsx`:
```tsx
"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function YourNewPage() {
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Your New Page</h2>
      <Card>
        <CardHeader>
          <CardTitle>Content</CardTitle>
        </CardHeader>
        <CardContent>
          {/* Your content here */}
        </CardContent>
      </Card>
    </div>
  );
}
```

### Step 2: Add PageId
In `src/components/sidebar.tsx`, add to the `PageId` type:
```tsx
export type PageId =
  | "dashboard"
  | "leads"
  // ... existing pages
  | "your-new-page";  // ADD HERE
```

### Step 3: Add to Menu Arrays
In `src/components/sidebar.tsx`, add to the appropriate role menu:
```tsx
const superAdminMenu = [
  // ... existing items
  { id: "your-new-page", label: "Your New Page", icon: IconName },
];
```

### Step 4: Add to Switch Statement
In `src/components/crm-layout.tsx`, add the case:
```tsx
switch (currentPage) {
  // ... existing cases
  case "your-new-page":
    return <YourNewPage />;
}
```

### Step 5: Add Page Title
In `src/components/sidebar.tsx`, add to `pageTitles`:
```tsx
const pageTitles: Record<PageId, string> = {
  // ... existing titles
  "your-new-page": "Your New Page",
};
```

---

## 4. ADDING A NEW API ROUTE

### Standard Route Pattern
Create `src/app/api/your-route/route.ts`:
```typescript
import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-helpers";
import { prisma } from "@/lib/db";
import { createAuditLog } from "@/lib/audit";

export async function GET(req: NextRequest) {
  try {
    const session = await requireAuth();

    // Role check (optional)
    // const allowed = await requireRole(session, ["ADMIN", "SUPER_ADMIN"]);

    const data = await prisma.yourModel.findMany();

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: error.status || 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireAuth();
    const body = await req.json();

    // Create, update, etc.
    const record = await prisma.yourModel.create({ data: body });

    // Audit log
    await createAuditLog({
      actorType: session.user.role as any,
      actorId: session.user.id,
      actorName: session.user.name || "Unknown",
      entityType: "YourModel",
      entityId: record.id,
      action: "CREATE",
    });

    return NextResponse.json({ success: true, data: record });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: error.status || 500 }
    );
  }
}
```

### Route with Path Parameter
Create `src/app/api/your-route/[id]/route.ts`:
```typescript
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const record = await prisma.yourModel.findUnique({
    where: { id: params.id },
  });
  // ...
}
```

---

## 5. GIT OPERATIONS

### Daily Workflow
```bash
# Check status
git status

# Add changes
git add .

# Commit
git commit -m "scope: description"
# Examples:
# "leads: add export to CSV feature"
# "auth: fix RBAC on settings page"
# "ai: improve lead scoring algorithm"

# Push
git push origin main
```

### Commit Message Format
```
scope: description

Examples:
leads: add bulk status update
auth: fix session timeout issue
ai: improve customer bot responses
ui: responsive sidebar for mobile
db: add new fields to Lead model
```

### Branching (when needed)
```bash
# Create feature branch
git checkout -b feature/your-feature

# Work, commit, then:
git push origin feature/your-feature

# Merge back
git checkout main
git merge feature/your-feature
git push origin main
```

---

## 6. ENVIRONMENT VARIABLES

### Required (app won't run without these)
```env
DATABASE_URL=file:./db/custom.db
NEXTAUTH_SECRET=sp-rwp-crm-secret-key-2024
NEXTAUTH_URL=http://localhost:3000
```

### Optional (for AI features)
```env
# AI — z-ai-web-dev-sdk (auto-configured in this environment)
# Meta API — set in Channel Setup page UI (stored in DB)
# WhatsApp — set in Channel Setup page UI (stored in DB)
# Resend — set in Settings page UI (stored in DB)
```

### Infrastructure (not read by app)
```env
GITHUB_TOKEN=[user's GitHub PAT]
GITHUB_REPO_OWNER=abrar-de-ahmed
GITHUB_REPO_NAME=sp-rwp-crm
CLOUDFLARE_API_TOKEN=[user's CF token]
CLOUDFLARE_ACCOUNT_ID=a9183b9558532b0f2e8ef6e577ea8aa5
```

### NEVER commit `.env` to git. Use `.env.example` as template.

---

## 7. DATABASE OPERATIONS

### Schema Changes
```bash
# After editing prisma/schema.prisma:
npx prisma db push
# This applies schema changes without dropping data

# WARNING: If you need to reset:
npx prisma db push --force-reset
npx prisma db seed
```

### Seed Data
```bash
# Reset and re-seed
npx prisma db push --force-reset
npx prisma db seed

# Seed script location: prisma/seed.ts
# Contains: 7 users, 5 leads, sample audit logs
```

### Querying with Prisma
```typescript
import { prisma } from "@/lib/db";

// Find all leads for a rep
const leads = await prisma.lead.findMany({
  where: { assignedRepId: session.user.id },
  include: { assignedRep: true },
  orderBy: { createdAt: "desc" },
});

// Count by status
const counts = await prisma.lead.groupBy({
  by: ["status"],
  _count: true,
});
```

---

## 8. DEPLOYMENT CHECKLIST (Phase 4 — Not Yet Active)

### Pre-Deployment
- [ ] All tests passing
- [ ] Environment variables set for production
- [ ] `.env.production` configured
- [ ] Database migrated to PostgreSQL (Neon)
- [ ] SSL certificate configured
- [ ] Domain DNS pointing to Cloudflare
- [ ] CI/CD pipeline tested

### Cloudflare Pages Deployment
1. Connect GitHub repo to Cloudflare Pages
2. Build command: `npm run build`
3. Output directory: `.next`
4. Environment variables set in Cloudflare dashboard
5. Note: Will need `@cloudflare/next-on-pages` or standalone output

### SQLite → Neon PostgreSQL Migration
1. Create Neon free tier account
2. Get connection string (postgresql://...)
3. Update `DATABASE_URL` in `.env.production`
4. Change `provider = "sqlite"` to `provider = "postgresql"` in `schema.prisma`
5. Remove `*.db` file references
6. Run `npx prisma db push`
7. Run `npx prisma db seed`

### Domain Setup
1. Add domain in Cloudflare dashboard
2. Update CLOUDFLARE_ZONE_ID
3. Configure DNS A/CNAME records
4. SSL auto-enabled via Cloudflare

---

## 9. COMMON TASKS

### How to Add a New User
1. Login as SUPER_ADMIN
2. Go to Team Management
3. Click "Add Team Member"
4. Fill in name, email, role, phone
5. Default password: `password123`
6. User changes password on first login

### How to Connect WhatsApp
1. Login as SUPER_ADMIN
2. Go to Channel Setup
3. Click "Connect WhatsApp"
4. Enter: Phone Number ID, Access Token, App Secret
5. Click "Test Connection"
6. Set up webhook in Meta Developer dashboard pointing to `/api/webhooks/whatsapp`

### How to Connect Facebook/Instagram
1. Login as SUPER_ADMIN
2. Go to Channel Setup
3. Click "Connect Facebook" or "Connect Instagram"
4. Enter Page Access Token and App Secret
5. Test connection
6. Set up webhook in Meta Developer dashboard pointing to `/api/webhooks/meta`

### How to Import Leads
1. Login as SUPER_ADMIN
2. Go to Data Import
3. Upload CSV or XLSX file
4. Map columns to CRM fields
5. Review and confirm import
6. Leads created with MANUAL_IMPORT source

### How to Export Data
1. Login as SUPER_ADMIN
2. Go to Data Export
3. Select data type (leads, calls, follow-ups, memberships)
4. Choose date range and filters
5. Download CSV

---

## 10. TROUBLESHOOTING GUIDE

| Problem | Check | Fix |
|---------|-------|-----|
| App won't start | Terminal error | Check node_modules exist, run `npm install` |
| Login fails | .env file | Verify NEXTAUTH_SECRET exists |
| White screen | Browser console | Check for JS errors, clear .next cache |
| API returns 401 | Auth token | Re-login, check session expiry (24h) |
| API returns 403 | User role | Check RBAC permissions for your role |
| Leads not showing | Database | Check data in Prisma Studio: `npx prisma studio` |
| WhatsApp not working | Webhook setup | Verify webhook URL is public, test in Meta dashboard |
| AI not responding | z-ai-web-dev-sdk | Check network, verify API key (auto in this env) |
| Slow performance | Database size | Check db/custom.db size, consider PostgreSQL |
| Mobile layout broken | Viewport | Check responsive classes, test in dev tools |

---

*Playbook is maintained by the AI assistant. Updated with every new procedure discovered.*
