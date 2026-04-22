import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials"
import authConfig from "@/auth.config"

function getAppBaseUrl(): string {
  const nextAuthUrl = process.env.NEXTAUTH_URL
  if (typeof nextAuthUrl === "string" && nextAuthUrl.length > 0) {
    return nextAuthUrl.replace(/\/+$/, "")
  }

  const vercelUrl = process.env.VERCEL_URL
  if (typeof vercelUrl === "string" && vercelUrl.length > 0) {
    const withProtocol = vercelUrl.startsWith("http")
      ? vercelUrl
      : `https://${vercelUrl}`
    return withProtocol.replace(/\/+$/, "")
  }

  return "http://localhost:3000"
}

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
        const emailRaw = credentials?.email
        const password = credentials?.password
        if (typeof emailRaw !== "string" || typeof password !== "string") {
          return null
        }

        const email = emailRaw.trim().toLowerCase()
        const baseUrl = getAppBaseUrl()

        try {
          const res = await fetch(`${baseUrl}/api/v1/auth/login`, {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ email, password }),
          })

          if (!res.ok) {
            return null
          }

          const data = (await res.json()) as {
            accessToken?: unknown
            admin?: { id?: unknown; email?: unknown; name?: unknown }
          }

          const accessToken =
            typeof data.accessToken === "string" ? data.accessToken : null
          const adminId =
            typeof data.admin?.id === "string" ? data.admin.id : null
          const adminEmail =
            typeof data.admin?.email === "string" ? data.admin.email : null
          const adminName =
            typeof data.admin?.name === "string" ? data.admin.name : null

          if (!accessToken || !adminId || !adminEmail) {
            return null
          }

          return {
            id: adminId,
            email: adminEmail,
            name: adminName ?? undefined,
            accessToken,
          }
        } catch {
          return null
        }
      },
    }),
  ],
})

export const { handlers, auth, signIn, signOut } = nextAuth
export const { GET, POST } = nextAuth.handlers
