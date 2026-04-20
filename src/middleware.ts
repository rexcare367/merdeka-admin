import { getToken } from "next-auth/jwt"
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

export async function middleware(req: NextRequest) {
  const token = await getToken({
    req,
    secret: process.env.AUTH_SECRET,
  })
  const isLoggedIn = !!token
  const isAuthRoute = req.nextUrl.pathname.startsWith("/auth/")

  if (!isLoggedIn && !isAuthRoute) {
    const login = new URL("/auth/login", req.nextUrl.origin)
    login.searchParams.set("callbackUrl", req.nextUrl.pathname)
    return NextResponse.redirect(login)
  }

  if (isLoggedIn && isAuthRoute) {
    return NextResponse.redirect(new URL("/", req.nextUrl.origin))
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
}
