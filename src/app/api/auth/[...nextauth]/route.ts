import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import { compare } from "bcrypt";
import type { NextAuthOptions } from "next-auth";

import { prisma } from "@/lib/prisma";

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/login",
  },
  providers: [
    Credentials({
      name: "Credentials",
      credentials: {
        email: { label: "E-mail", type: "email" },
        password: { label: "Senha", type: "password" },
      },
      async authorize(credentials) {
        // #region agent log
        fetch("http://127.0.0.1:7890/ingest/61bd3893-904e-42a5-a9f0-b0555de820c3", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Debug-Session-Id": "93a528",
          },
          body: JSON.stringify({
            sessionId: "93a528",
            runId: "pre-fix",
            hypothesisId: "H1",
            location: "api/auth/[...nextauth]/route.ts:authorize:start",
            message: "authorize called",
            data: {
              hasEmail: Boolean(credentials?.email),
              hasPassword: Boolean(credentials?.password),
            },
            timestamp: Date.now(),
          }),
        }).catch(() => {});
        // #endregion agent log

        if (!credentials?.email || !credentials.password) {
          // #region agent log
          fetch("http://127.0.0.1:7890/ingest/61bd3893-904e-42a5-a9f0-b0555de820c3", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "X-Debug-Session-Id": "93a528",
            },
            body: JSON.stringify({
              sessionId: "93a528",
              runId: "pre-fix",
              hypothesisId: "H2",
              location: "api/auth/[...nextauth]/route.ts:authorize:missing-credentials",
              message: "Missing credentials in authorize",
              data: {
                email: credentials?.email ?? null,
              },
              timestamp: Date.now(),
            }),
          }).catch(() => {});
          // #endregion agent log
          return null;
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
        });

        if (!user || !user.password) {
          // #region agent log
          fetch("http://127.0.0.1:7890/ingest/61bd3893-904e-42a5-a9f0-b0555de820c3", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "X-Debug-Session-Id": "93a528",
            },
            body: JSON.stringify({
              sessionId: "93a528",
              runId: "pre-fix",
              hypothesisId: "H3",
              location: "api/auth/[...nextauth]/route.ts:authorize:user-not-found",
              message: "User not found or missing password",
              data: {
                email: credentials.email,
                hasUser: Boolean(user),
                hasPassword: Boolean(user?.password),
              },
              timestamp: Date.now(),
            }),
          }).catch(() => {});
          // #endregion agent log
          return null;
        }

        const isValid = await compare(credentials.password, user.password);
        if (!isValid) {
          // #region agent log
          fetch("http://127.0.0.1:7890/ingest/61bd3893-904e-42a5-a9f0-b0555de820c3", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "X-Debug-Session-Id": "93a528",
            },
            body: JSON.stringify({
              sessionId: "93a528",
              runId: "pre-fix",
              hypothesisId: "H4",
              location: "api/auth/[...nextauth]/route.ts:authorize:invalid-password",
              message: "Invalid password in authorize",
              data: {
                email: credentials.email,
              },
              timestamp: Date.now(),
            }),
          }).catch(() => {});
          // #endregion agent log
          return null;
        }

        // #region agent log
        fetch("http://127.0.0.1:7890/ingest/61bd3893-904e-42a5-a9f0-b0555de820c3", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Debug-Session-Id": "93a528",
          },
          body: JSON.stringify({
            sessionId: "93a528",
            runId: "pre-fix",
            hypothesisId: "H5",
            location: "api/auth/[...nextauth]/route.ts:authorize:success",
            message: "Authorize succeeded",
            data: {
              email: user.email,
              role: user.role,
            },
            timestamp: Date.now(),
          }),
        }).catch(() => {});
        // #endregion agent log

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const u = user as any;
        return {
          id: u.id,
          email: u.email,
          name: u.name ?? undefined,
          role: u.role,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        token.id = (user as any).id;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        token.role = (user as any).role;
      }
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (session.user as any).id = token.id;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (session.user as any).role = token.role;
      }
      return session;
    },
  },
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };

