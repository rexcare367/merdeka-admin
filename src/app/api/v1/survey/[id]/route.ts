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

function metaSource(meta: unknown): string | null {
  if (!meta || typeof meta !== "object") return null
  const m = meta as Record<string, unknown>
  if (typeof m.source === "string") return m.source
  return null
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
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

  const survey = await prisma.survey.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      status: true,
      type: true,
      environmentId: true,
      created_at: true,
      updated_at: true,
      createdBy: true,
      User: { select: { id: true, name: true, email: true, isActive: true } },
      _count: { select: { Response: true, Display: true, SurveyFollowUp: true } },
    },
  })

  if (!survey) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  const [
    finishedCount,
    notFinishedCount,
    disqualifiedRows,
    responses,
    auditLogs,
    recentResponses,
  ] = await Promise.all([
    prisma.response.count({ where: { surveyId: id, finished: true } }),
    prisma.response.count({ where: { surveyId: id, finished: false } }),
    prisma.responseQuotaLink.findMany({
      where: { status: "screenedOut", Response: { surveyId: id } },
      select: { responseId: true },
      distinct: ["responseId"],
    }),
    prisma.response.findMany({
      where: { surveyId: id },
      select: { ttc: true, meta: true, created_at: true, updated_at: true },
      take: 5000,
      orderBy: { created_at: "desc" },
    }),
    prisma.adminAuditLog.findMany({
      where: {
        OR: [
          { targetType: "survey", targetId: id },
          { targetType: "response", metadata: { path: ["surveyId"], equals: id } },
        ],
      },
      orderBy: { created_at: "desc" },
      take: 100,
      select: {
        id: true,
        action: true,
        created_at: true,
        targetType: true,
        targetId: true,
        metadata: true,
        ip: true,
        user_agent: true,
        Admin: { select: { id: true, name: true, email: true } },
      },
    }),
    prisma.response.findMany({
      where: { surveyId: id },
      orderBy: { created_at: "desc" },
      take: 25,
      select: {
        id: true,
        created_at: true,
        updated_at: true,
        finished: true,
        ttc: true,
        meta: true,
        endingId: true,
        ResponseQuotaLink: {
          select: { status: true },
        },
      },
    }),
  ])

  const disqualifiedIds = new Set(disqualifiedRows.map((r) => r.responseId))
  const disqualifiedCount = disqualifiedIds.size
  const completeAdjusted = Math.max(0, finishedCount - disqualifiedCount)

  let durationSumMs = 0
  let durationCount = 0
  let longestMs = 0
  let shortestMs = Number.POSITIVE_INFINITY
  let online = 0
  let offline = 0
  for (const r of responses) {
    const v = sumTtc(r.ttc)
    if (v > 0) {
      durationSumMs += v
      durationCount += 1
      if (v > longestMs) longestMs = v
      if (v < shortestMs) shortestMs = v
    }
    if (isOfflineMeta(r.meta)) {
      offline += 1
    } else {
      online += 1
    }
  }
  if (!Number.isFinite(shortestMs)) shortestMs = 0
  const averageDurationMs =
    durationCount > 0 ? Math.round(durationSumMs / durationCount) : 0
  const sampledCount = responses.length
  const offlineRatio = sampledCount > 0 ? offline / sampledCount : 0
  const onlineRatio = sampledCount > 0 ? online / sampledCount : 0
  const totalResp = survey._count.Response
  const onlineEstimated = Math.round(totalResp * onlineRatio)
  const offlineEstimated = Math.max(0, totalResp - onlineEstimated)

  return NextResponse.json({
    id: survey.id,
    name: survey.name,
    status: survey.status,
    type: survey.type,
    environmentId: survey.environmentId,
    created_at: survey.created_at,
    updated_at: survey.updated_at,
    createdBy: survey.User
      ? {
          id: survey.User.id,
          name: survey.User.name,
          email: survey.User.email,
          isActive: survey.User.isActive,
        }
      : null,
    counts: {
      responses: totalResp,
      displays: survey._count.Display,
      followUps: survey._count.SurveyFollowUp,
    },
    responseStatus: {
      complete: completeAdjusted,
      notComplete: notFinishedCount,
      disqualified: disqualifiedCount,
    },
    duration: {
      averageMs: averageDurationMs,
      longestMs,
      shortestMs,
      sampleSize: durationCount,
    },
    delivery: {
      online: onlineEstimated,
      offline: offlineEstimated,
      sampleSize: sampledCount,
    },
    links: {
      shared: survey._count.Display,
      used: totalResp,
      usageRatio: survey._count.Display > 0 ? totalResp / survey._count.Display : null,
    },
    auditLog: auditLogs.map((l) => ({
      id: l.id,
      action: l.action,
      created_at: l.created_at,
      targetType: l.targetType,
      targetId: l.targetId,
      metadata: l.metadata,
      ip: l.ip,
      user_agent: l.user_agent,
      admin: l.Admin
        ? { id: l.Admin.id, name: l.Admin.name, email: l.Admin.email }
        : null,
    })),
    recentResponses: recentResponses.map((r) => {
      const isDisqualified = r.ResponseQuotaLink.some(
        (link) => link.status === "screenedOut"
      )
      return {
        id: r.id,
        created_at: r.created_at,
        updated_at: r.updated_at,
        finished: r.finished,
        durationMs: sumTtc(r.ttc),
        offline: isOfflineMeta(r.meta),
        source: metaSource(r.meta),
        endingId: r.endingId,
        disqualified: isDisqualified,
      }
    }),
  })
}

