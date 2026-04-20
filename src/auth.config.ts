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
        token.email = user.email
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
      return session
    },
  },
} satisfies Omit<NextAuthConfig, "providers">
