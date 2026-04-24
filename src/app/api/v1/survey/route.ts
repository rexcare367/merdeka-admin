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

  const url = new URL(request.url)
  const pageRaw = url.searchParams.get("page")
  const pageSizeRaw = url.searchParams.get("pageSize")
  const page = Math.max(1, Number.isFinite(Number(pageRaw)) ? Number(pageRaw) : 1)
  const pageSize = Math.min(
    100,
    Math.max(1, Number.isFinite(Number(pageSizeRaw)) ? Number(pageSizeRaw) : 10)
  )

  const [total, surveys] = await Promise.all([
    prisma.survey.count(),
    prisma.survey.findMany({
      orderBy: { created_at: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: {
        id: true,
        name: true,
        status: true,
        type: true,
        environmentId: true,
        created_at: true,
        updated_at: true,
        _count: { select: { Response: true } },
      },
    }),
  ])

  const totalPages = Math.max(1, Math.ceil(total / pageSize))

  return NextResponse.json({
    surveys: surveys.map((s) => ({
      id: s.id,
      name: s.name,
      status: s.status,
      type: s.type,
      environmentId: s.environmentId,
      created_at: s.created_at,
      updated_at: s.updated_at,
      responsesCount: s._count.Response,
    })),
    pagination: {
      page,
      pageSize,
      total,
      totalPages,
    },
  })
}

