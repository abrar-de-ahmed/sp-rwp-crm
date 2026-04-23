import type { NextAuthOptions, User, Session } from "next-auth";
import type { JWT } from "next-auth/jwt";
import CredentialsProvider from "next-auth/providers/credentials";
import { db } from "@/lib/db";
import { verifyPassword } from "./auth-helpers";

// ──────────────────────────────────────
// Type augmentation
// ──────────────────────────────────────

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      name: string;
      email: string;
      role: string;
      image?: string | null;
    };
  }

  interface User {
    role?: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: string;
  }
}

// ──────────────────────────────────────
// NextAuth Configuration
// ──────────────────────────────────────

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Email and password are required");
        }

        const user = await db.user.findUnique({
          where: { email: credentials.email },
        });

        if (!user) {
          throw new Error("No account found with this email");
        }

        if (!user.isActive) {
          throw new Error("This account has been deactivated");
        }

        const isValid = await verifyPassword(
          credentials.password,
          user.passwordHash,
        );

        if (!isValid) {
          throw new Error("Invalid password");
        }

        // Update last login timestamp
        await db.user.update({
          where: { id: user.id },
          data: { lastLogin: new Date() },
        });

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          image: user.avatarUrl,
        };
      },
    }),
  ],

  pages: {
    signIn: "/login",
  },

  session: {
    strategy: "jwt",
    maxAge: 24 * 60 * 60, // 24 hours
  },

  callbacks: {
    // Store user id & role in the JWT token
    async jwt({ token, user }: { token: JWT; user?: User }) {
      if (user) {
        token.id = user.id!;
        token.role = (user.role as string) ?? "SALES_REP";
      }
      return token;
    },

    // Expose id & role on the client session object
    async session({
      session,
      token,
    }: {
      session: Session;
      token: JWT;
    }) {
      if (session.user) {
        session.user.id = token.id;
        session.user.role = token.role;
      }
      return session;
    },
  },

  secret: process.env.NEXTAUTH_SECRET,
};
