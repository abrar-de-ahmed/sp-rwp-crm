FROM node:20-slim AS base

FROM base AS deps
RUN apt-get update && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*
WORKDIR /app

COPY package.json bun.lock* package-lock.json* ./
COPY prisma ./prisma/

RUN npm install --legacy-peer-deps
RUN npx prisma generate
RUN npx prisma db push --skip-generate 2>/dev/null || echo "DB push skipped (no DB at build time)"

# Build
FROM base AS builder
WORKDIR /app

COPY --from=deps --chown=node:node /app/node_modules ./node_modules
COPY --from=deps --chown=node:node /app/prisma ./prisma
COPY --chown=node:node . .

ENV NEXT_TELEMETRY_DISABLED=1
RUN npx next build

# Production
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Copy the full standalone output
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

# Copy Prisma schema + ALL engine files
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=builder /app/node_modules/prisma ./node_modules/prisma

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["sh", "-c", "npx prisma db push --skip-generate --accept-data-loss 2>&1; echo 'Starting server...'; node server.js"]
