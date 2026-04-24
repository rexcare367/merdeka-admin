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

  const [total, organizations] = await Promise.all([
    prisma.organization.count(),
    prisma.organization.findMany({
      orderBy: { created_at: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: {
        id: true,
        name: true,
        isAIEnabled: true,
        created_at: true,
        updated_at: true,
        _count: { select: { Project: true, Membership: true, Team: true } },
      },
    }),
  ])

  return NextResponse.json({
    organizations: organizations.map((o) => ({
      id: o.id,
      name: o.name,
      isAIEnabled: o.isAIEnabled,
      created_at: o.created_at,
      updated_at: o.updated_at,
      projectsCount: o._count.Project,
      membersCount: o._count.Membership,
      teamsCount: o._count.Team,
    })),
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
    },
  })
}
