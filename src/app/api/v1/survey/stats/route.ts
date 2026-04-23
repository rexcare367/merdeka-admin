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

  const [
    total,
    inProgress,
    draft,
    paused,
    completed,
    createdLast30Days,
    totalResponses,
  ] = await Promise.all([
    prisma.survey.count(),
    prisma.survey.count({ where: { status: "inProgress" } }),
    prisma.survey.count({ where: { status: "draft" } }),
    prisma.survey.count({ where: { status: "paused" } }),
    prisma.survey.count({ where: { status: "completed" } }),
    prisma.survey.count({ where: { created_at: { gte: since } } }),
    prisma.response.count(),
  ])

  return NextResponse.json({
    total,
    inProgress,
    draft,
    paused,
    completed,
    createdLast30Days,
    totalResponses,
  })
}

