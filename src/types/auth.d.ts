import type { DefaultSession } from "next-auth"

declare module "next-auth" {
  interface User {
    accessToken?: string
  }

  interface Session {
    accessToken?: string
    user: {
      id: string
    } & DefaultSession["user"]
  }
}

declare module "@auth/core/jwt" {
  interface JWT {
    id?: string
    email?: string
    accessToken?: string
  }
}
