"use client"

import { useEffect, useMemo, useState } from "react"
import { useParams } from "next/navigation"
import BreadcrumbComp from "../../layout/shared/breadcrumb/BreadcrumbComp"
import CardBox from "@/app/components/shared/CardBox"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { api } from "@/lib/api-client"
import { format } from "date-fns"

type AuditLogRow = {
  id: string
  action: string
  created_at: string
  targetType: string
  targetId: string | null
  metadata: unknown
  ip: string | null
  user_agent: string | null
  admin: { id: string; name: string | null; email: string } | null
}

type RecentResponseRow = {
  id: string
  created_at: string
  updated_at: string
  finished: boolean
  durationMs: number
  offline: boolean
  source: string | null
  endingId: string | null
  disqualified: boolean
}

type SurveyDetail = {
  id: string
  name: string
  status: "draft" | "inProgress" | "paused" | "completed"
  type: "link" | "app"
  environmentId: string
  created_at: string
  updated_at: string
  createdBy: {
    id: string
    name: string | null
    email: string
    isActive: boolean
  } | null
  counts: {
    responses: number
    displays: number
    followUps: number
  }
  responseStatus: {
    complete: number
    notComplete: number
    disqualified: number
  }
  duration: {
    averageMs: number
    longestMs: number
    shortestMs: number
    sampleSize: number
  }
  delivery: {
    online: number
    offline: number
    sampleSize: number
  }
  links: {
    shared: number
    used: number
    usageRatio: number | null
  }
  auditLog: AuditLogRow[]
  recentResponses: RecentResponseRow[]
}

function formatDurationMs(ms: number): string {
  if (!Number.isFinite(ms) || ms <= 0) return "—"
  const totalSeconds = Math.round(ms / 1000)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  if (minutes <= 0) return `${seconds}s`
  return `${minutes}m ${seconds.toString().padStart(2, "0")}s`
}

function statusBadgeVariant(status: SurveyDetail["status"]) {
  switch (status) {
    case "inProgress":
      return "lightSuccess" as const
    case "paused":
      return "lightWarning" as const
    case "completed":
      return "secondary" as const
    case "draft":
    default:
      return "outline" as const
  }
}

function statusLabel(status: SurveyDetail["status"]) {
  switch (status) {
    case "inProgress":
      return "In progress"
    case "paused":
      return "Paused"
    case "completed":
      return "Completed"
    case "draft":
    default:
      return "Draft"
  }
}

function metadataPreview(metadata: unknown): string {
  if (!metadata || typeof metadata !== "object") return ""
  try {
    const json = JSON.stringify(metadata)
    if (json === "{}" || json === "null") return ""
    return json.length > 160 ? `${json.slice(0, 157)}…` : json
  } catch {
    return ""
  }
}

export default function SurveyDetailPage() {
  const params = useParams<{ id: string }>()
  const id = params?.id

  const [detail, setDetail] = useState<SurveyDetail | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const token = useMemo(() => {
    try {
      return sessionStorage.getItem("adminAccessToken")
    } catch {
      return null
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    async function run() {
      if (!token) {
        setError("Missing access token. Please sign in again.")
        return
      }
      if (!id) return
      setLoading(true)
      setError(null)
      try {
        const { data } = await api.get<SurveyDetail>(`/api/v1/survey/${id}`)
        if (cancelled) return
        setDetail(data)
      } catch (e) {
        if (cancelled) return
        setError(e instanceof Error ? e.message : "Something went wrong.")
      } finally {
        if (cancelled) return
        setLoading(false)
      }
    }
    run()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, id])

  const totalAttempted =
    (detail?.responseStatus.complete ?? 0) +
    (detail?.responseStatus.notComplete ?? 0) +
    (detail?.responseStatus.disqualified ?? 0)

  return (
    <>
      <BreadcrumbComp
        title="Survey detail"
        items={[
          { to: "/surveys", title: "Surveys" },
          { title: detail?.name ?? (typeof id === "string" ? id : "Detail") },
        ]}
      />

      <div className="grid grid-cols-12 gap-30">
        <div className="col-span-12">
          {error ? (
            <CardBox className="p-6">
              <p className="text-sm text-red-600" role="alert">
                {error}
              </p>
            </CardBox>
          ) : null}
        </div>

        <div className="col-span-12">
          <CardBox className="p-6">
            <div className="flex items-start justify-between gap-6 flex-wrap">
              <div className="min-w-[240px]">
                <p className="text-sm text-muted-foreground">Survey</p>
                <p className="text-2xl font-semibold">
                  {detail ? detail.name : loading ? "…" : "—"}
                </p>
                <div className="mt-2 flex items-center gap-2 flex-wrap">
                  {detail ? (
                    <>
                      <Badge variant={statusBadgeVariant(detail.status)}>
                        {statusLabel(detail.status)}
                      </Badge>
                      <Badge variant="lightPrimary">{detail.type}</Badge>
                    </>
                  ) : null}
                </div>
              </div>

              <div className="grid grid-cols-12 gap-4 flex-1">
                <div className="col-span-6 md:col-span-3">
                  <p className="text-sm text-muted-foreground">Responses</p>
                  <p className="text-xl font-semibold">
                    {detail?.counts.responses ?? (loading ? "…" : "—")}
                  </p>
                </div>
                <div className="col-span-6 md:col-span-3">
                  <p className="text-sm text-muted-foreground">Displays</p>
                  <p className="text-xl font-semibold">
                    {detail?.counts.displays ?? (loading ? "…" : "—")}
                  </p>
                </div>
                <div className="col-span-6 md:col-span-3">
                  <p className="text-sm text-muted-foreground">Follow-ups</p>
                  <p className="text-xl font-semibold">
                    {detail?.counts.followUps ?? (loading ? "…" : "—")}
                  </p>
                </div>
                <div className="col-span-6 md:col-span-3">
                  <p className="text-sm text-muted-foreground">Avg duration</p>
                  <p className="text-xl font-semibold">
                    {detail
                      ? formatDurationMs(detail.duration.averageMs)
                      : loading
                        ? "…"
                        : "—"}
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-6 grid grid-cols-12 gap-4 text-sm text-muted-foreground">
              <div className="col-span-12 md:col-span-4">
                <p>Survey ID</p>
                <p className="mt-1 font-mono text-foreground break-all">
                  {detail?.id ?? "—"}
                </p>
              </div>
              <div className="col-span-12 md:col-span-4">
                <p>Created</p>
                <p className="mt-1 text-foreground">
                  {detail
                    ? format(new Date(detail.created_at), "yyyy-MM-dd HH:mm")
                    : "—"}
                </p>
              </div>
              <div className="col-span-12 md:col-span-4">
                <p>Updated</p>
                <p className="mt-1 text-foreground">
                  {detail
                    ? format(new Date(detail.updated_at), "yyyy-MM-dd HH:mm")
                    : "—"}
                </p>
              </div>
              <div className="col-span-12 md:col-span-4">
                <p>Created by</p>
                <div className="mt-1 text-foreground flex items-center gap-2 flex-wrap">
                  {detail?.createdBy ? (
                    <>
                      <span>
                        {detail.createdBy.name ?? detail.createdBy.email}
                      </span>
                      <Badge
                        variant={
                          detail.createdBy.isActive ? "lightSuccess" : "secondary"
                        }
                      >
                        {detail.createdBy.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </>
                  ) : (
                    <span>—</span>
                  )}
                </div>
              </div>
              <div className="col-span-12 md:col-span-4">
                <p>Environment</p>
                <p className="mt-1 font-mono text-foreground break-all">
                  {detail?.environmentId ?? "—"}
                </p>
              </div>
              <div className="col-span-12 md:col-span-4">
                <p>Link usage</p>
                <p className="mt-1 text-foreground">
                  {detail?.links.usageRatio !== null && detail?.links.usageRatio !== undefined
                    ? `${(detail.links.usageRatio * 100).toFixed(1)}%`
                    : "—"}
                  {detail
                    ? ` · ${detail.links.shared} shared · ${detail.links.used} used`
                    : ""}
                </p>
              </div>
            </div>
          </CardBox>
        </div>

        <div className="md:col-span-4 col-span-12">
          <CardBox className="p-6 h-full">
            <h5 className="card-title mb-4">Response status</h5>
            <div className="space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Complete</span>
                <span className="text-success font-semibold">
                  {detail?.responseStatus.complete ?? "—"}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Not complete</span>
                <span className="text-warning font-semibold">
                  {detail?.responseStatus.notComplete ?? "—"}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Disqualified</span>
                <span className="text-error font-semibold">
                  {detail?.responseStatus.disqualified ?? "—"}
                </span>
              </div>
              <div className="flex items-center justify-between border-t pt-3">
                <span className="text-muted-foreground">Total attempted</span>
                <span className="font-semibold">{detail ? totalAttempted : "—"}</span>
              </div>
            </div>
          </CardBox>
        </div>

        <div className="md:col-span-4 col-span-12">
          <CardBox className="p-6 h-full">
            <h5 className="card-title mb-4">Duration</h5>
            <div className="space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Average</span>
                <span className="font-semibold">
                  {detail ? formatDurationMs(detail.duration.averageMs) : "—"}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Longest</span>
                <span className="font-semibold">
                  {detail ? formatDurationMs(detail.duration.longestMs) : "—"}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Shortest</span>
                <span className="font-semibold">
                  {detail ? formatDurationMs(detail.duration.shortestMs) : "—"}
                </span>
              </div>
              <div className="flex items-center justify-between border-t pt-3 text-xs text-muted-foreground">
                <span>Sample size</span>
                <span>{detail?.duration.sampleSize ?? "—"}</span>
              </div>
            </div>
          </CardBox>
        </div>

        <div className="md:col-span-4 col-span-12">
          <CardBox className="p-6 h-full">
            <h5 className="card-title mb-4">Online vs offline</h5>
            <div className="space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Online</span>
                <span className="font-semibold">{detail?.delivery.online ?? "—"}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Offline</span>
                <span className="font-semibold">{detail?.delivery.offline ?? "—"}</span>
              </div>
              <div className="flex items-center justify-between border-t pt-3 text-xs text-muted-foreground">
                <span>Sample size</span>
                <span>{detail?.delivery.sampleSize ?? "—"}</span>
              </div>
            </div>
          </CardBox>
        </div>

        <div className="col-span-12">
          <CardBox className="p-6">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div>
                <h5 className="card-title">Activity log</h5>
                <p className="text-sm text-muted-foreground">
                  Latest {detail?.auditLog.length ?? 0} actions for this survey
                </p>
              </div>
            </div>

            <div className="mt-4 overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>When</TableHead>
                    <TableHead>Admin</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>Target</TableHead>
                    <TableHead>Metadata</TableHead>
                    <TableHead>IP</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {!detail || detail.auditLog.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-sm text-muted-foreground">
                        {loading ? "Loading…" : "No activity recorded yet."}
                      </TableCell>
                    </TableRow>
                  ) : (
                    detail.auditLog.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                          {format(new Date(log.created_at), "yyyy-MM-dd HH:mm")}
                        </TableCell>
                        <TableCell className="whitespace-nowrap">
                          {log.admin ? (
                            <span>
                              {log.admin.name ?? log.admin.email}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">system</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant="lightPrimary">{log.action}</Badge>
                        </TableCell>
                        <TableCell className="whitespace-nowrap">
                          <span className="text-sm">{log.targetType}</span>
                          {log.targetId ? (
                            <span className="block text-xs text-muted-foreground font-mono">
                              {log.targetId}
                            </span>
                          ) : null}
                        </TableCell>
                        <TableCell className="max-w-md">
                          <code className="text-xs break-all">
                            {metadataPreview(log.metadata)}
                          </code>
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                          {log.ip ?? "—"}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardBox>
        </div>

        <div className="col-span-12">
          <CardBox className="p-6">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div>
                <h5 className="card-title">Recent responses</h5>
                <p className="text-sm text-muted-foreground">
                  Latest {detail?.recentResponses.length ?? 0} responses with duration and source
                </p>
              </div>
            </div>

            <div className="mt-4 overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Response ID</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Duration</TableHead>
                    <TableHead>Source</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Updated</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {!detail || detail.recentResponses.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-sm text-muted-foreground">
                        {loading ? "Loading…" : "No responses yet."}
                      </TableCell>
                    </TableRow>
                  ) : (
                    detail.recentResponses.map((r) => {
                      let statusVariant: "lightSuccess" | "lightWarning" | "lightError" =
                        "lightWarning"
                      let statusText = "Not complete"
                      if (r.disqualified) {
                        statusVariant = "lightError"
                        statusText = "Disqualified"
                      } else if (r.finished) {
                        statusVariant = "lightSuccess"
                        statusText = "Complete"
                      }
                      return (
                        <TableRow key={r.id}>
                          <TableCell className="whitespace-nowrap text-xs font-mono">
                            {r.id}
                          </TableCell>
                          <TableCell>
                            <Badge variant={statusVariant}>{statusText}</Badge>
                          </TableCell>
                          <TableCell className="text-right whitespace-nowrap text-sm">
                            {formatDurationMs(r.durationMs)}
                          </TableCell>
                          <TableCell className="whitespace-nowrap text-sm">
                            <Badge
                              variant={r.offline ? "lightWarning" : "lightSuccess"}
                            >
                              {r.offline ? "Offline" : "Online"}
                            </Badge>
                            {r.source ? (
                              <span className="ml-2 text-xs text-muted-foreground">
                                {r.source}
                              </span>
                            ) : null}
                          </TableCell>
                          <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                            {format(new Date(r.created_at), "yyyy-MM-dd HH:mm")}
                          </TableCell>
                          <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                            {format(new Date(r.updated_at), "yyyy-MM-dd HH:mm")}
                          </TableCell>
                        </TableRow>
                      )
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </CardBox>
        </div>
      </div>
    </>
  )
}

