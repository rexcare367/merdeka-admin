import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET(request: Request) {
  const userId = request.headers.get("x-user-id")
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true },
  })

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const organizations = await prisma.team.findMany({
    orderBy: { created_at: "desc" },
    select: { id: true, name: true, created_at: true, updated_at: true, plan: true },
  })

  return NextResponse.json({ organizations })
}
