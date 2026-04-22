import type { NextAuthConfig } from "next-auth"

export default {
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60,
  },
  pages: {
    signIn: "/auth/login",
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
        if (user.email) {
          token.email = user.email
        }
        const u = user as { accessToken?: string }
        if (typeof u.accessToken === "string") {
          token.accessToken = u.accessToken
        }
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string
        if (token.email) {
          session.user.email = token.email as string
        }
      }
      if (typeof token.accessToken === "string") {
        session.accessToken = token.accessToken
      }
      return session
    },
  },
} satisfies Omit<NextAuthConfig, "providers">
