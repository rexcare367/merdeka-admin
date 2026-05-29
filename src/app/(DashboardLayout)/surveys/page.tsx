"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import BreadcrumbComp from "../layout/shared/breadcrumb/BreadcrumbComp"
import CardBox from "@/app/components/shared/CardBox"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { format } from "date-fns"
import { api } from "@/lib/api-client"

type SurveyRow = {
  id: string
  name: string
  status: "draft" | "inProgress" | "paused" | "completed"
  type: "link" | "app"
  environmentId: string
  created_at: string
  updated_at: string
  responsesCount: number
  displaysCount: number
  complete: number
  notComplete: number
  disqualified: number
  averageDurationMs: number
  durationSampleSize: number
  onlineCount: number
  offlineCount: number
  linkUsageRatio: number | null
}

type Pagination = {
  page: number
  pageSize: number
  total: number
  totalPages: number
}

type Stats = {
  total: number
  inProgress: number
  draft: number
  paused: number
  completed: number
  createdLast30Days: number
  totalResponses: number
  surveysAnswered: number
  responseStatus: {
    complete: number
    notComplete: number
    disqualified: number
  }
  duration: {
    averageMs: number
    sampleSize: number
  }
  delivery: {
    online: number
    offline: number
    sampleSize: number
  }
  links: {
    surveysWithLinks: number
    appSurveys: number
    displaysTotal: number
    responsesTotal: number
  }
}

function statusBadgeVariant(status: SurveyRow["status"]) {
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

function statusLabel(status: SurveyRow["status"]) {
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

function formatDurationMs(ms: number): string {
  if (!Number.isFinite(ms) || ms <= 0) return "—"
  const totalSeconds = Math.round(ms / 1000)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  if (minutes <= 0) return `${seconds}s`
  return `${minutes}m ${seconds.toString().padStart(2, "0")}s`
}

export default function SurveysPage() {
  const router = useRouter()
  const [stats, setStats] = useState<Stats | null>(null)
  const [rows, setRows] = useState<SurveyRow[]>([])
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    pageSize: 10,
    total: 0,
    totalPages: 1,
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const token = useMemo(() => {
    try {
      return sessionStorage.getItem("adminAccessToken")
    } catch {
      return null
    }
  }, [])

  async function fetchStats() {
    if (!token) return
    const { data } = await api.get<Stats>("/api/v1/survey/stats")
    setStats(data)
  }

  async function fetchPage(nextPage: number, pageSize: number) {
    if (!token) return
    const { data } = await api.get<{
      surveys: SurveyRow[]
      pagination: Pagination
    }>("/api/v1/survey", { params: { page: nextPage, pageSize } })
    setRows(data.surveys)
    setPagination(data.pagination)
  }

  useEffect(() => {
    let cancelled = false
    async function run() {
      if (!token) {
        setError("Missing access token. Please sign in again.")
        return
      }
      setLoading(true)
      setError(null)
      try {
        await Promise.all([fetchStats(), fetchPage(1, pagination.pageSize)])
        if (cancelled) return
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
  }, [token])

  const canPrev = pagination.page > 1 && !loading
  const canNext = pagination.page < pagination.totalPages && !loading

  return (
    <>
      <BreadcrumbComp title="Surveys" items={[]} />

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
          <div className="grid grid-cols-12 gap-30">
            <div className="md:col-span-3 col-span-12">
              <CardBox className="p-6">
                <p className="text-sm text-muted-foreground">Total surveys</p>
                <p className="text-2xl font-semibold">
                  {stats ? stats.total : loading ? "…" : "—"}
                </p>
              </CardBox>
            </div>
            <div className="md:col-span-3 col-span-12">
              <CardBox className="p-6">
                <p className="text-sm text-muted-foreground">Surveys answered</p>
                <p className="text-2xl font-semibold">
                  {stats ? stats.surveysAnswered : loading ? "…" : "—"}
                </p>
              </CardBox>
            </div>
            <div className="md:col-span-3 col-span-12">
              <CardBox className="p-6">
                <p className="text-sm text-muted-foreground">Total responses</p>
                <p className="text-2xl font-semibold">
                  {stats ? stats.totalResponses : loading ? "…" : "—"}
                </p>
              </CardBox>
            </div>
            <div className="md:col-span-3 col-span-12">
              <CardBox className="p-6">
                <p className="text-sm text-muted-foreground">Avg duration</p>
                <p className="text-2xl font-semibold">
                  {stats ? formatDurationMs(stats.duration.averageMs) : loading ? "…" : "—"}
                </p>
              </CardBox>
            </div>
          </div>
        </div>

        <div className="col-span-12">
          <div className="grid grid-cols-12 gap-30">
            <div className="md:col-span-4 col-span-12">
              <CardBox className="p-6">
                <p className="text-sm text-muted-foreground mb-3">Response status</p>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span>Complete</span>
                    <span className="font-medium">
                      {stats ? stats.responseStatus.complete : "—"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Not complete</span>
                    <span className="font-medium">
                      {stats ? stats.responseStatus.notComplete : "—"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Disqualified</span>
                    <span className="font-medium">
                      {stats ? stats.responseStatus.disqualified : "—"}
                    </span>
                  </div>
                </div>
              </CardBox>
            </div>
            <div className="md:col-span-4 col-span-12">
              <CardBox className="p-6">
                <p className="text-sm text-muted-foreground mb-3">Online vs offline</p>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span>Online</span>
                    <span className="font-medium">
                      {stats ? stats.delivery.online : "—"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Offline</span>
                    <span className="font-medium">
                      {stats ? stats.delivery.offline : "—"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>Sample size</span>
                    <span>{stats ? stats.delivery.sampleSize : "—"}</span>
                  </div>
                </div>
              </CardBox>
            </div>
            <div className="md:col-span-4 col-span-12">
              <CardBox className="p-6">
                <p className="text-sm text-muted-foreground mb-3">Links shared / used</p>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span>Displays (shared)</span>
                    <span className="font-medium">
                      {stats ? stats.links.displaysTotal : "—"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Responses (used)</span>
                    <span className="font-medium">
                      {stats ? stats.links.responsesTotal : "—"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>Link surveys</span>
                    <span>{stats ? stats.links.surveysWithLinks : "—"}</span>
                  </div>
                </div>
              </CardBox>
            </div>
          </div>
        </div>

        <div className="col-span-12">
          <CardBox className="p-6">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div>
                <h5 className="card-title">Surveys</h5>
                <p className="text-sm text-muted-foreground">{pagination.total} total</p>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  disabled={!canPrev}
                  onClick={() => fetchPage(pagination.page - 1, pagination.pageSize)}
                >
                  Prev
                </Button>
                <Button
                  variant="outline"
                  disabled={!canNext}
                  onClick={() => fetchPage(pagination.page + 1, pagination.pageSize)}
                >
                  Next
                </Button>
              </div>
            </div>

            <div className="mt-4 overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead className="text-right">Resp.</TableHead>
                    <TableHead className="text-right">Complete</TableHead>
                    <TableHead className="text-right">Not Complete</TableHead>
                    <TableHead className="text-right">Disq.</TableHead>
                    <TableHead className="text-right">Avg Dur.</TableHead>
                    <TableHead className="text-right">Online / Offline</TableHead>
                    <TableHead className="text-right">Shared / Used</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={12} className="text-sm text-muted-foreground">
                        {loading ? "Loading…" : "No surveys found."}
                      </TableCell>
                    </TableRow>
                  ) : (
                    rows.map((s) => (
                      <TableRow key={s.id}>
                        <TableCell className="max-w-md">
                          <span className="truncate block font-medium">{s.name}</span>
                          <span className="text-xs text-muted-foreground">{s.id}</span>
                        </TableCell>
                        <TableCell>
                          <Badge variant={statusBadgeVariant(s.status)}>
                            {statusLabel(s.status)}
                          </Badge>
                        </TableCell>
                        <TableCell className="whitespace-nowrap">{s.type}</TableCell>
                        <TableCell className="text-right whitespace-nowrap">
                          {s.responsesCount}
                        </TableCell>
                        <TableCell className="text-right whitespace-nowrap">
                          <span className="text-success font-medium">{s.complete}</span>
                        </TableCell>
                        <TableCell className="text-right whitespace-nowrap">
                          <span className="text-warning font-medium">{s.notComplete}</span>
                        </TableCell>
                        <TableCell className="text-right whitespace-nowrap">
                          <span className="text-error font-medium">{s.disqualified}</span>
                        </TableCell>
                        <TableCell className="text-right whitespace-nowrap text-sm">
                          {formatDurationMs(s.averageDurationMs)}
                        </TableCell>
                        <TableCell className="text-right whitespace-nowrap text-sm">
                          {s.onlineCount} / {s.offlineCount}
                        </TableCell>
                        <TableCell className="text-right whitespace-nowrap text-sm">
                          {s.displaysCount} / {s.responsesCount}
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                          {format(new Date(s.created_at), "yyyy-MM-dd")}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => router.push(`/surveys/${s.id}`)}
                          >
                            Detail
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>

            <div className="mt-4 flex items-center justify-between text-sm text-muted-foreground">
              <span>
                Page {pagination.page} / {pagination.totalPages}
              </span>
              <span>Page size: {pagination.pageSize}</span>
            </div>
          </CardBox>
        </div>
      </div>
    </>
  )
}

