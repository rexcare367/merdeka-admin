import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET(request: Request) {
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

  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)

  const [total, aiEnabled, createdLast30Days] = await Promise.all([
    prisma.organization.count(),
    prisma.organization.count({ where: { isAIEnabled: true } }),
    prisma.organization.count({ where: { created_at: { gte: since } } }),
  ])

  return NextResponse.json({
    total,
    aiEnabled,
    createdLast30Days,
  })
}

