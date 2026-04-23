import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function POST(request: Request) {
  try {
    const adminId = request.headers.get("x-user-id")
    if (!adminId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const admin = await prisma.admin.findUnique({
      where: { id: adminId },
      select: { id: true },
    })
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    await prisma.admin.update({
      where: { id: adminId },
      data: { updated_at: new Date() },
    })

    return NextResponse.json({ message: "Logged out." })
  } catch (e) {
    console.error("[logout]", e)
    return NextResponse.json(
      { error: "Logout failed. Please try again later." },
      { status: 500 }
    )
  }
}

