import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials"
import authConfig from "@/auth.config"

const nextAuth = NextAuth({
  ...authConfig,
  trustHost: true,
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const email = credentials?.email
        const password = credentials?.password
        if (typeof email !== "string" || typeof password !== "string") {
          return null
        }

        const { prisma } = await import("@/lib/prisma")
        const { compare } = await import("bcryptjs")

        const admin = await prisma.admin.findUnique({ where: { email } })
        if (!admin) {
          return null
        }

        const valid = await compare(password, admin.password)
        if (!valid) {
          return null
        }

        return {
          id: admin.id,
          email: admin.email,
          name: admin.name ?? undefined,
        }
      },
    }),
  ],
})

export const { handlers, auth, signIn, signOut } = nextAuth
export const { GET, POST } = nextAuth.handlers
