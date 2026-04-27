import { PrismaClient } from '@prisma/client'

declare global {
  var __spCrmPrisma: PrismaClient | undefined
}

const databaseUrl = process.env.DATABASE_URL || 'file:./db/custom.db'

export const db = globalThis.__spCrmPrisma ?? new PrismaClient({
  datasourceUrl: databaseUrl,
  log: process.env.NODE_ENV === 'development' ? ['query'] : [],
})

if (process.env.NODE_ENV !== 'production') globalThis.__spCrmPrisma = db
