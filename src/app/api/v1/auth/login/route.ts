import { NextResponse } from "next/server"
import { compare } from "bcryptjs"
import { prisma } from "@/lib/prisma"
import { signAccessToken } from "@/lib/auth-token"

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      email?: unknown
      password?: unknown
    }

    const email =
      typeof body.email === "string" ? body.email.trim().toLowerCase() : ""
    const password = typeof body.password === "string" ? body.password : ""

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required." },
        { status: 400 }
      )
    }

    const admin = await prisma.admin.findUnique({ where: { email } })
    if (!admin || !admin.password_hash) {
      return NextResponse.json(
        { error: "Invalid email or password." },
        { status: 401 }
      )
    }

    const valid = await compare(password, admin.password_hash)
    if (!valid) {
      return NextResponse.json(
        { error: "Invalid email or password." },
        { status: 401 }
      )
    }

    const accessToken = await signAccessToken({
      sub: admin.id,
      email: admin.email,
    })

    await prisma.admin.update({
      where: { id: admin.id },
      data: { updated_at: new Date() },
    })

    return NextResponse.json({
      accessToken,
      tokenType: "Bearer",
      expiresIn: 7 * 24 * 60 * 60,
      admin: {
        id: admin.id,
        email: admin.email,
        name: admin.name,
      },
    })
  } catch (e) {
    console.error("[login]", e)
    return NextResponse.json(
      { error: "Login failed. Please try again later." },
      { status: 500 }
    )
  }
}
