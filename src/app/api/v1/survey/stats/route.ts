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

  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)

  const [
    total,
    inProgress,
    draft,
    paused,
    completed,
    createdLast30Days,
    totalResponses,
    completeResponses,
    notCompleteResponses,
    disqualifiedResponseRows,
    answeredSurveyGroups,
    displaysTotal,
    linkSurveysTotal,
    appSurveysTotal,
    responsesWithTtc,
    responsesMetaSample,
  ] = await Promise.all([
    prisma.survey.count(),
    prisma.survey.count({ where: { status: "inProgress" } }),
    prisma.survey.count({ where: { status: "draft" } }),
    prisma.survey.count({ where: { status: "paused" } }),
    prisma.survey.count({ where: { status: "completed" } }),
    prisma.survey.count({ where: { created_at: { gte: since } } }),
    prisma.response.count(),
    prisma.response.count({ where: { finished: true } }),
    prisma.response.count({ where: { finished: false } }),
    prisma.responseQuotaLink.findMany({
      where: { status: "screenedOut" },
      select: { responseId: true },
      distinct: ["responseId"],
    }),
    prisma.response.groupBy({
      by: ["surveyId"],
      _count: { _all: true },
    }),
    prisma.display.count(),
    prisma.survey.count({ where: { type: "link" } }),
    prisma.survey.count({ where: { type: "app" } }),
    prisma.response.findMany({
      select: { ttc: true },
      take: 5000,
      orderBy: { created_at: "desc" },
    }),
    prisma.response.findMany({
      select: { meta: true },
      take: 5000,
      orderBy: { created_at: "desc" },
    }),
  ])

  const disqualifiedCount = disqualifiedResponseRows.length
  const surveysAnswered = answeredSurveyGroups.length

  // Adjust complete count so we don't double-count disqualified ones.
  // Disqualified responses are typically marked finished too, so subtract.
  const completeAdjusted = Math.max(0, completeResponses - disqualifiedCount)

  let durationSumMs = 0
  let durationCount = 0
  for (const r of responsesWithTtc) {
    const v = sumTtc(r.ttc)
    if (v > 0) {
      durationSumMs += v
      durationCount += 1
    }
  }
  const averageDurationMs =
    durationCount > 0 ? Math.round(durationSumMs / durationCount) : 0

  let offlineResponses = 0
  for (const r of responsesMetaSample) {
    if (isOfflineMeta(r.meta)) offlineResponses += 1
  }
  const sampledMetaCount = responsesMetaSample.length
  // Scale the sample to estimate online/offline counts across totalResponses.
  const offlineRatio = sampledMetaCount > 0 ? offlineResponses / sampledMetaCount : 0
  const offlineResponsesEstimated = Math.round(totalResponses * offlineRatio)
  const onlineResponsesEstimated = Math.max(
    0,
    totalResponses - offlineResponsesEstimated
  )

  return NextResponse.json({
    total,
    inProgress,
    draft,
    paused,
    completed,
    createdLast30Days,
    totalResponses,
    surveysAnswered,
    responseStatus: {
      complete: completeAdjusted,
      notComplete: notCompleteResponses,
      disqualified: disqualifiedCount,
    },
    duration: {
      averageMs: averageDurationMs,
      sampleSize: durationCount,
    },
    delivery: {
      online: onlineResponsesEstimated,
      offline: offlineResponsesEstimated,
      sampleSize: sampledMetaCount,
    },
    links: {
      surveysWithLinks: linkSurveysTotal,
      appSurveys: appSurveysTotal,
      displaysTotal,
      responsesTotal: totalResponses,
    },
  })
}

