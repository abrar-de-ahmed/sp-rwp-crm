# SP RWP CRM - AI-Powered Customer Relationship Management

Built with Next.js 14, TypeScript, Prisma ORM, and AI-powered features.

## Tech Stack
- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS + shadcn/ui
- **Database**: PostgreSQL / SQLite (Prisma ORM)
- **Auth**: NextAuth.js (JWT)
- **AI**: Custom AI Agents (Lead Scoring, Customer Bot, Call Monitor, Follow-Up, Reporting)
- **Charts**: Recharts

## Setup

1. Clone the repo:
```bash
git clone https://github.com/abrar-de-ahmed/sp-rwp-crm.git
cd sp-rwp-crm
```

2. Install dependencies:
```bash
npm install
```

3. Copy environment file:
```bash
cp .env.example .env
# Edit .env with your actual values
```

4. Setup database:
```bash
npx prisma db push
npx prisma db seed
```

5. Start dev server:
```bash
npm run dev
```

6. Open http://localhost:3000

## Default Login
- **Email**: `admin@spr.com` / **Password**: `admin123`
- **Email**: `manager@spr.com` / **Password**: `manager123`
- **Email**: `rep@spr.com` / **Password**: `rep123`

## Roles
- **SUPER_ADMIN**: Full access to all features
- **ADMIN**: View-only for reports/audit/team/AI
- **SALES_REP**: Own data only, limited sidebar

## Features
- Dashboard with KPIs and analytics
- Lead management with pipeline view
- Follow-up tracking with AI suggestions
- Call history and monitoring
- Team management with performance metrics
- Data import/export (CSV)
- AI-powered insights and reporting
- Audit logging and notifications
- RBAC permission system
