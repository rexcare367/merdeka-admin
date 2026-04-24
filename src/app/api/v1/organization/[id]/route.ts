import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const request = _request
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

  const { id } = await context.params
  const org = await prisma.organization.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      isAIEnabled: true,
      created_at: true,
      updated_at: true,
      _count: { select: { Project: true, Membership: true, Team: true } },
      Team: {
        orderBy: { created_at: "desc" },
        select: {
          id: true,
          name: true,
          created_at: true,
          updated_at: true,
          _count: { select: { TeamUser: true, ProjectTeam: true } },
        },
      },
      Membership: {
        orderBy: { User: { created_at: "desc" } },
        select: {
          accepted: true,
          role: true,
          User: {
            select: {
              id: true,
              name: true,
              email: true,
              isActive: true,
              created_at: true,
              updated_at: true,
              lastLoginAt: true,
            },
          },
        },
      },
    },
  })

  if (!org) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  return NextResponse.json({
    id: org.id,
    name: org.name,
    isAIEnabled: org.isAIEnabled,
    created_at: org.created_at,
    updated_at: org.updated_at,
    projectsCount: org._count.Project,
    membersCount: org._count.Membership,
    teamsCount: org._count.Team,
    teams: org.Team.map((t) => ({
      id: t.id,
      name: t.name,
      created_at: t.created_at,
      updated_at: t.updated_at,
      membersCount: t._count.TeamUser,
      projectsCount: t._count.ProjectTeam,
    })),
    members: org.Membership.map((m) => ({
      id: m.User.id,
      name: m.User.name,
      email: m.User.email,
      isActive: m.User.isActive,
      role: m.role,
      accepted: m.accepted,
      lastLoginAt: m.User.lastLoginAt,
      created_at: m.User.created_at,
      updated_at: m.User.updated_at,
    })),
  })
}

