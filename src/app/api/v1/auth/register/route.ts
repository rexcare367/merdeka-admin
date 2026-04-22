import { NextResponse } from "next/server"
import { hash } from "bcryptjs"
import { randomUUID } from "crypto"
import { prisma } from "@/lib/prisma"

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      email?: unknown
      name?: unknown
      password?: unknown
      confirmPassword?: unknown
    }

    const email =
      typeof body.email === "string" ? body.email.trim().toLowerCase() : ""
    const name = typeof body.name === "string" ? body.name.trim() : ""
    const password = typeof body.password === "string" ? body.password : ""
    const confirmPassword =
      typeof body.confirmPassword === "string" ? body.confirmPassword : ""

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required." },
        { status: 400 }
      )
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters." },
        { status: 400 }
      )
    }

    if (password !== confirmPassword) {
      return NextResponse.json(
        { error: "Passwords do not match." },
        { status: 400 }
      )
    }

    const existing = await prisma.admin.findUnique({ where: { email } })
    if (existing) {
      return NextResponse.json(
        { error: "An account with this email already exists." },
        { status: 409 }
      )
    }

    const now = new Date()
    const password_hash = await hash(password, 10)

    await prisma.admin.create({
      data: {
        id: randomUUID(),
        email,
        name: name || null,
        password_hash: password_hash,
        updated_at: now,
      },
    })

    return NextResponse.json({
      message: "Registration successful. You can sign in now.",
    })
  } catch (e) {
    console.error("[register]", e)
    return NextResponse.json(
      { error: "Registration failed. Please try again later." },
      { status: 500 }
    )
  }
}
