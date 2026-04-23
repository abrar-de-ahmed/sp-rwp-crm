import bcrypt from "bcryptjs";
import { getServerSession } from "next-auth";
import { authOptions } from "./auth";

// ──────────────────────────────────────
// Password Hashing
// ──────────────────────────────────────

/** Hash a plain-text password with bcrypt (12 salt rounds). */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

/** Verify a plain-text password against a stored bcrypt hash. */
export async function verifyPassword(
  password: string,
  hashedPassword: string,
): Promise<boolean> {
  return bcrypt.compare(password, hashedPassword);
}

// ──────────────────────────────────────
// Session Helpers (Server-side only)
// ──────────────────────────────────────

/**
 * Get the current NextAuth session.
 * Works in Server Components, Route Handlers, and Server Actions.
 */
export async function getSession() {
  return getServerSession(authOptions);
}

/**
 * Require authentication — throws a redirect / error if no session exists.
 * Returns the session when valid.
 *
 * Usage in Route Handlers:
 *   const session = await requireAuth(req);
 *   // → session.user.id, session.user.role, etc.
 */
export async function requireAuth(
  request?: Request,
): Promise<{
  user: { id: string; name: string; email: string; role: string };
}> {
  const session = await getSession();

  if (!session?.user) {
    throw new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  return session as unknown as {
    user: { id: string; name: string; email: string; role: string };
  };
}

// ──────────────────────────────────────
// Role Checking Helpers
// ──────────────────────────────────────

export type UserRole = "SUPER_ADMIN" | "ADMIN" | "SALES_REP";

/** Check if the session user is a SUPER_ADMIN. */
export async function isSuperAdmin(): Promise<boolean> {
  const session = await getSession();
  return session?.user?.role === "SUPER_ADMIN";
}

/** Check if the session user is an ADMIN or SUPER_ADMIN. */
export async function isAdmin(): Promise<boolean> {
  const session = await getSession();
  return (
    session?.user?.role === "ADMIN" || session?.user?.role === "SUPER_ADMIN"
  );
}

/** Check if the session user is a SALES_REP. */
export async function isSalesRep(): Promise<boolean> {
  const session = await getSession();
  return session?.user?.role === "SALES_REP";
}

/**
 * Assert the session user has at least the given role level.
 * Throws a 403 if the check fails.
 *
 * Role hierarchy: SUPER_ADMIN > ADMIN > SALES_REP
 */
export async function requireRole(minRole: UserRole): Promise<void> {
  const session = await getSession();
  const role = session?.user?.role as UserRole | undefined;

  const hierarchy: Record<UserRole, number> = {
    SALES_REP: 1,
    ADMIN: 2,
    SUPER_ADMIN: 3,
  };

  if (!role || (hierarchy[role] ?? 0) < (hierarchy[minRole] ?? 0)) {
    throw new Response(JSON.stringify({ error: "Forbidden" }), {
      status: 403,
      headers: { "Content-Type": "application/json" },
    });
  }
}
