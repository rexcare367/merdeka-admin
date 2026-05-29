import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

function sumTtc(ttc: unknown): number {
  if (!ttc || typeof ttc !== "object") return 0
  let total = 0
  for (const v of Object.values(ttc as Record<string, unknown>)) {
    if (typeof v === "number" && Number.isFinite(v)) {
      total += v
    }
  }
  return total
}

function isOfflineMeta(meta: unknown): boolean {
  if (!meta || typeof meta !== "object") return false
  const m = meta as Record<string, unknown>
  if (m.offline === true) return true
  if (typeof m.source === "string" && m.source.toLowerCase().includes("offline")) return true
  if (typeof m.connection === "string" && m.connection.toLowerCase() === "offline") return true
  return false
}

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
        _count: { select: { Response: true, Display: true } },
      },
    }),
  ])

  const surveyIds = surveys.map((s) => s.id)

  const [
    finishedGroups,
    notFinishedGroups,
    disqualifiedLinks,
    responsesForSurveys,
  ] = await Promise.all([
    prisma.response.groupBy({
      by: ["surveyId"],
      where: { surveyId: { in: surveyIds }, finished: true },
      _count: { _all: true },
    }),
    prisma.response.groupBy({
      by: ["surveyId"],
      where: { surveyId: { in: surveyIds }, finished: false },
      _count: { _all: true },
    }),
    prisma.responseQuotaLink.findMany({
      where: {
        status: "screenedOut",
        Response: { surveyId: { in: surveyIds } },
      },
      select: {
        responseId: true,
        Response: { select: { surveyId: true } },
      },
    }),
    prisma.response.findMany({
      where: { surveyId: { in: surveyIds } },
      select: { surveyId: true, ttc: true, meta: true },
      take: 5000,
      orderBy: { created_at: "desc" },
    }),
  ])

  const finishedBySurvey = new Map<string, number>()
  for (const g of finishedGroups) {
    finishedBySurvey.set(g.surveyId, g._count._all)
  }
  const notFinishedBySurvey = new Map<string, number>()
  for (const g of notFinishedGroups) {
    notFinishedBySurvey.set(g.surveyId, g._count._all)
  }

  const disqualifiedBySurvey = new Map<string, Set<string>>()
  for (const link of disqualifiedLinks) {
    const sid = link.Response?.surveyId
    if (!sid) continue
    if (!disqualifiedBySurvey.has(sid)) {
      disqualifiedBySurvey.set(sid, new Set())
    }
    disqualifiedBySurvey.get(sid)!.add(link.responseId)
  }

  const durationStats = new Map<
    string,
    { sumMs: number; count: number; online: number; offline: number; sampled: number }
  >()
  for (const r of responsesForSurveys) {
    const entry =
      durationStats.get(r.surveyId) ?? {
        sumMs: 0,
        count: 0,
        online: 0,
        offline: 0,
        sampled: 0,
      }
    const v = sumTtc(r.ttc)
    if (v > 0) {
      entry.sumMs += v
      entry.count += 1
    }
    if (isOfflineMeta(r.meta)) {
      entry.offline += 1
    } else {
      entry.online += 1
    }
    entry.sampled += 1
    durationStats.set(r.surveyId, entry)
  }

  const totalPages = Math.max(1, Math.ceil(total / pageSize))

  return NextResponse.json({
    surveys: surveys.map((s) => {
      const totalResp = s._count.Response
      const finished = finishedBySurvey.get(s.id) ?? 0
      const notFinished = notFinishedBySurvey.get(s.id) ?? 0
      const disqualified = disqualifiedBySurvey.get(s.id)?.size ?? 0
      const completeAdjusted = Math.max(0, finished - disqualified)
      const stats = durationStats.get(s.id)
      const averageDurationMs =
        stats && stats.count > 0 ? Math.round(stats.sumMs / stats.count) : 0
      const offlineRatio =
        stats && stats.sampled > 0 ? stats.offline / stats.sampled : 0
      const offlineEst = Math.round(totalResp * offlineRatio)
      const onlineEst = Math.max(0, totalResp - offlineEst)

      return {
        id: s.id,
        name: s.name,
        status: s.status,
        type: s.type,
        environmentId: s.environmentId,
        created_at: s.created_at,
        updated_at: s.updated_at,
        responsesCount: totalResp,
        displaysCount: s._count.Display,
        complete: completeAdjusted,
        notComplete: notFinished,
        disqualified,
        averageDurationMs,
        durationSampleSize: stats?.count ?? 0,
        onlineCount: onlineEst,
        offlineCount: offlineEst,
        linkUsageRatio:
          s._count.Display > 0 ? totalResp / s._count.Display : null,
      }
    }),
    pagination: {
      page,
      pageSize,
      total,
      totalPages,
    },
  })
}

