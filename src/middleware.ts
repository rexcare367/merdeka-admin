import { getToken } from "next-auth/jwt"
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { verifyAccessToken } from "@/lib/auth-token"

const PUBLIC_API_V1_PREFIXES = [
  "/api/v1/auth/register",
  "/api/v1/auth/login",
] as const

function isPublicApiV1(pathname: string): boolean {
  return PUBLIC_API_V1_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`)
  )
}

export async function middleware(req: NextRequest) {
  const pathname = req.nextUrl.pathname

  if (pathname.startsWith("/api/auth")) {
    return NextResponse.next()
  }

  if (pathname.startsWith("/api/v1/")) {
    if (isPublicApiV1(pathname)) {
      return NextResponse.next()
    }

    const authHeader = req.headers.get("authorization")
    const bearer =
      authHeader?.startsWith("Bearer ") ? authHeader.slice(7).trim() : null

    if (!bearer) {
      return NextResponse.json(
        { error: "Missing Authorization Bearer token." },
        { status: 401 }
      )
    }

    const payload = await verifyAccessToken(bearer)
    if (!payload) {
      return NextResponse.json(
        { error: "Invalid or expired access token." },
        { status: 401 }
      )
    }

    const requestHeaders = new Headers(req.headers)
    requestHeaders.delete("x-user-id")
    requestHeaders.set("x-user-id", payload.sub)

    return NextResponse.next({
      request: { headers: requestHeaders },
    })
  }

  if (pathname.startsWith("/api")) {
    return NextResponse.next()
  }

  const token = await getToken({
    req,
    secret: process.env.AUTH_SECRET,
  })
  const isLoggedIn = !!token
  const isAuthRoute = pathname.startsWith("/auth/")

  if (!isLoggedIn && !isAuthRoute) {
    const login = new URL("/auth/login", req.nextUrl.origin)
    login.searchParams.set("callbackUrl", pathname)
    return NextResponse.redirect(login)
  }

  if (isLoggedIn && isAuthRoute) {
    return NextResponse.redirect(new URL("/", req.nextUrl.origin))
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
}
