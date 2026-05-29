"use client"

import { useEffect, useMemo, useState } from "react"
import BreadcrumbComp from "../layout/shared/breadcrumb/BreadcrumbComp"
import CardBox from "@/app/components/shared/CardBox"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
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

type EnumeratorRow = {
  id: string
  name: string
  email: string
  isActive: boolean
  lastLoginAt: string | null
  created_at: string
  updated_at: string
  twoFactorEnabled: boolean
  surveysCreated: number
  memberships: number
  teamMemberships: number
}

type Pagination = {
  page: number
  pageSize: number
  total: number
  totalPages: number
}

type Summary = {
  total: number
  active: number
  inactive: number
  activeLast30Days: number
}

type StatusFilter = "all" | "active" | "inactive"

export default function EnumeratorsPage() {
  const [summary, setSummary] = useState<Summary | null>(null)
  const [rows, setRows] = useState<EnumeratorRow[]>([])
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    pageSize: 20,
    total: 0,
    totalPages: 1,
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all")

  const token = useMemo(() => {
    try {
      return sessionStorage.getItem("adminAccessToken")
    } catch {
      return null
    }
  }, [])

  async function fetchPage(
    nextPage: number,
    pageSize: number,
    nextStatus: StatusFilter,
    nextSearch: string
  ) {
    if (!token) return
    const params: Record<string, string | number> = {
      page: nextPage,
      pageSize,
    }
    if (nextStatus !== "all") params.status = nextStatus
    if (nextSearch.trim().length > 0) params.q = nextSearch.trim()

    const { data } = await api.get<{
      summary: Summary
      enumerators: EnumeratorRow[]
      pagination: Pagination
    }>("/api/v1/enumerators", { params })
    setRows(data.enumerators)
    setPagination(data.pagination)
    setSummary(data.summary)
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
        await fetchPage(1, pagination.pageSize, statusFilter, search)
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

  async function applyFilters() {
    if (!token) return
    setLoading(true)
    setError(null)
    try {
      await fetchPage(1, pagination.pageSize, statusFilter, search)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.")
    } finally {
      setLoading(false)
    }
  }

  async function gotoPage(nextPage: number) {
    if (!token) return
    setLoading(true)
    setError(null)
    try {
      await fetchPage(nextPage, pagination.pageSize, statusFilter, search)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.")
    } finally {
      setLoading(false)
    }
  }

  const canPrev = pagination.page > 1 && !loading
  const canNext = pagination.page < pagination.totalPages && !loading

  return (
    <>
      <BreadcrumbComp title="Enumerators" items={[]} />

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
                <p className="text-sm text-muted-foreground">Total</p>
                <p className="text-2xl font-semibold">
                  {summary ? summary.total : loading ? "…" : "—"}
                </p>
              </CardBox>
            </div>
            <div className="md:col-span-3 col-span-12">
              <CardBox className="p-6">
                <p className="text-sm text-muted-foreground">Active</p>
                <p className="text-2xl font-semibold text-success">
                  {summary ? summary.active : loading ? "…" : "—"}
                </p>
              </CardBox>
            </div>
            <div className="md:col-span-3 col-span-12">
              <CardBox className="p-6">
                <p className="text-sm text-muted-foreground">Inactive</p>
                <p className="text-2xl font-semibold text-error">
                  {summary ? summary.inactive : loading ? "…" : "—"}
                </p>
              </CardBox>
            </div>
            <div className="md:col-span-3 col-span-12">
              <CardBox className="p-6">
                <p className="text-sm text-muted-foreground">Logged in (30d)</p>
                <p className="text-2xl font-semibold">
                  {summary ? summary.activeLast30Days : loading ? "…" : "—"}
                </p>
              </CardBox>
            </div>
          </div>
        </div>

        <div className="col-span-12">
          <CardBox className="p-6">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div>
                <h5 className="card-title">Enumerators</h5>
                <p className="text-sm text-muted-foreground">
                  {pagination.total} matching
                </p>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <Input
                  className="w-56"
                  placeholder="Search by name or email"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") applyFilters()
                  }}
                />
                <div className="inline-flex items-center gap-1 rounded-md bg-background dark:bg-white/5 p-1">
                  {(["all", "active", "inactive"] as StatusFilter[]).map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => {
                        setStatusFilter(s)
                        setTimeout(() => applyFilters(), 0)
                      }}
                      className={`px-3 py-1.5 rounded-sm text-sm capitalize ${
                        statusFilter === s
                          ? "bg-primary text-white"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
                <Button variant="outline" onClick={applyFilters} disabled={loading}>
                  Apply
                </Button>
              </div>
            </div>

            <div className="mt-4 overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>2FA</TableHead>
                    <TableHead>Last login</TableHead>
                    <TableHead className="text-right">Surveys</TableHead>
                    <TableHead className="text-right">Memberships</TableHead>
                    <TableHead className="text-right">Teams</TableHead>
                    <TableHead>Joined</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} className="text-sm text-muted-foreground">
                        {loading ? "Loading…" : "No enumerators found."}
                      </TableCell>
                    </TableRow>
                  ) : (
                    rows.map((u) => (
                      <TableRow key={u.id}>
                        <TableCell className="max-w-xs">
                          <span className="truncate block font-medium">{u.name}</span>
                          <span className="text-xs text-muted-foreground font-mono">
                            {u.id}
                          </span>
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                          {u.email}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={u.isActive ? "lightSuccess" : "lightError"}
                          >
                            {u.isActive ? "Active" : "Inactive"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={u.twoFactorEnabled ? "lightSuccess" : "secondary"}>
                            {u.twoFactorEnabled ? "On" : "Off"}
                          </Badge>
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                          {u.lastLoginAt
                            ? format(new Date(u.lastLoginAt), "yyyy-MM-dd HH:mm")
                            : "—"}
                        </TableCell>
                        <TableCell className="text-right whitespace-nowrap">
                          {u.surveysCreated}
                        </TableCell>
                        <TableCell className="text-right whitespace-nowrap">
                          {u.memberships}
                        </TableCell>
                        <TableCell className="text-right whitespace-nowrap">
                          {u.teamMemberships}
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                          {format(new Date(u.created_at), "yyyy-MM-dd")}
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
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  disabled={!canPrev}
                  onClick={() => gotoPage(pagination.page - 1)}
                >
                  Prev
                </Button>
                <Button
                  variant="outline"
                  disabled={!canNext}
                  onClick={() => gotoPage(pagination.page + 1)}
                >
                  Next
                </Button>
              </div>
            </div>
          </CardBox>
        </div>
      </div>
    </>
  )
}

