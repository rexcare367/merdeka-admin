import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import type { Prisma } from "@/generated/prisma/client"

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
  const statusFilter = url.searchParams.get("status")
  const search = url.searchParams.get("q")?.trim() ?? ""

  const page = Math.max(1, Number.isFinite(Number(pageRaw)) ? Number(pageRaw) : 1)
  const pageSize = Math.min(
    100,
    Math.max(1, Number.isFinite(Number(pageSizeRaw)) ? Number(pageSizeRaw) : 20)
  )

  // Treat "active in the last 30 days" as a softer activity signal in addition
  // to the explicit isActive flag.
  const recentSince = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)

  const where: Prisma.UserWhereInput = {}

  if (statusFilter === "active") {
    where.isActive = true
  } else if (statusFilter === "inactive") {
    where.isActive = false
  }

  if (search.length > 0) {
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { email: { contains: search, mode: "insensitive" } },
    ]
  }

  const [
    total,
    activeTotal,
    inactiveTotal,
    recentlyActiveTotal,
    filteredTotal,
    users,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { isActive: true } }),
    prisma.user.count({ where: { isActive: false } }),
    prisma.user.count({ where: { lastLoginAt: { gte: recentSince } } }),
    prisma.user.count({ where }),
    prisma.user.findMany({
      where,
      orderBy: [{ isActive: "desc" }, { lastLoginAt: "desc" }, { created_at: "desc" }],
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: {
        id: true,
        name: true,
        email: true,
        isActive: true,
        lastLoginAt: true,
        created_at: true,
        updated_at: true,
        twoFactorEnabled: true,
        _count: { select: { Survey: true, Membership: true, TeamUser: true } },
      },
    }),
  ])

  return NextResponse.json({
    summary: {
      total,
      active: activeTotal,
      inactive: inactiveTotal,
      activeLast30Days: recentlyActiveTotal,
    },
    enumerators: users.map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      isActive: u.isActive,
      lastLoginAt: u.lastLoginAt,
      created_at: u.created_at,
      updated_at: u.updated_at,
      twoFactorEnabled: u.twoFactorEnabled,
      surveysCreated: u._count.Survey,
      memberships: u._count.Membership,
      teamMemberships: u._count.TeamUser,
    })),
    pagination: {
      page,
      pageSize,
      total: filteredTotal,
      totalPages: Math.max(1, Math.ceil(filteredTotal / pageSize)),
    },
  })
}

