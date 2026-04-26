import { PrismaClient } from '@prisma/client'
import path from 'path';

// Resolve DATABASE_URL relative to project root for deployed environments
// In dev: process.cwd() = /home/z/my-project → file:./db/custom.db resolves correctly
// In deployed standalone: process.cwd() = wherever server.js runs → same resolution
function resolveDatabaseUrl(): string {
  const envUrl = process.env.DATABASE_URL;
  if (!envUrl) {
    throw new Error('DATABASE_URL environment variable is not set');
  }
  
  // If it's already an absolute path, return as-is
  if (envUrl.startsWith('file:/') && !envUrl.startsWith('file:./') && !envUrl.startsWith('file:../')) {
    return envUrl;
  }
  
  // For relative paths (file:./db/custom.db), resolve from project root
  if (envUrl.startsWith('file:./') || envUrl.startsWith('file:')) {
    // Prisma handles file:./ paths relative to process.cwd()
    // In standalone build, server.js runs from standalone/ dir, so we need
    // to resolve relative to the correct location
    const relativePath = envUrl.replace('file:', '');
    const absolutePath = path.resolve(process.cwd(), relativePath);
    return `file:${absolutePath}`;
  }
  
  // For postgresql:// URLs, pass through
  return envUrl;
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

const databaseUrl = resolveDatabaseUrl();

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    datasourceUrl: databaseUrl,
    log: process.env.NODE_ENV === 'development' ? ['query'] : [],
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db
