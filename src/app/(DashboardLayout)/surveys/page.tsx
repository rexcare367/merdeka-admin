"use client"

import { useEffect, useMemo, useState } from "react"
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

type SurveyRow = {
  id: string
  name: string
  status: "draft" | "inProgress" | "paused" | "completed"
  type: "link" | "app"
  environmentId: string
  created_at: string
  updated_at: string
  responsesCount: number
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

export default function SurveysPage() {
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
    const res = await fetch("/api/v1/survey/stats", {
      headers: { authorization: `Bearer ${token}` },
    })
    if (!res.ok) throw new Error("Failed to load survey statistics.")
    setStats((await res.json()) as Stats)
  }

  async function fetchPage(nextPage: number, pageSize: number) {
    if (!token) return
    const url = new URL("/api/v1/survey", window.location.origin)
    url.searchParams.set("page", String(nextPage))
    url.searchParams.set("pageSize", String(pageSize))

    const res = await fetch(url.pathname + url.search, {
      headers: { authorization: `Bearer ${token}` },
    })
    if (!res.ok) throw new Error("Failed to load surveys.")

    const data = (await res.json()) as {
      surveys: SurveyRow[]
      pagination: Pagination
    }
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
                <p className="text-sm text-muted-foreground">In progress</p>
                <p className="text-2xl font-semibold">
                  {stats ? stats.inProgress : loading ? "…" : "—"}
                </p>
              </CardBox>
            </div>
            <div className="md:col-span-3 col-span-12">
              <CardBox className="p-6">
                <p className="text-sm text-muted-foreground">Responses (all)</p>
                <p className="text-2xl font-semibold">
                  {stats ? stats.totalResponses : loading ? "…" : "—"}
                </p>
              </CardBox>
            </div>
            <div className="md:col-span-3 col-span-12">
              <CardBox className="p-6">
                <p className="text-sm text-muted-foreground">Created (30d)</p>
                <p className="text-2xl font-semibold">
                  {stats ? stats.createdLast30Days : loading ? "…" : "—"}
                </p>
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
                    <TableHead>ID</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead className="text-right">Responses</TableHead>
                    <TableHead>Environment</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Updated</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-sm text-muted-foreground">
                        {loading ? "Loading…" : "No surveys found."}
                      </TableCell>
                    </TableRow>
                  ) : (
                    rows.map((s) => (
                      <TableRow key={s.id}>
                        <TableCell className="whitespace-nowrap">{s.id}</TableCell>
                        <TableCell className="max-w-md">
                          <span className="truncate block">{s.name}</span>
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
                        <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                          {s.environmentId}
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                          {format(new Date(s.created_at), "yyyy-MM-dd")}
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                          {format(new Date(s.updated_at), "yyyy-MM-dd")}
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

