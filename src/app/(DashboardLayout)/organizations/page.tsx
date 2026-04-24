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
import { api } from "@/lib/api-client"

type OrgRow = {
  id: string
  name: string
  isAIEnabled: boolean
  created_at: string
  updated_at: string
}

type Pagination = {
  page: number
  pageSize: number
  total: number
  totalPages: number
}

type Stats = {
  total: number
  aiEnabled: number
  createdLast30Days: number
}

export default function OrganizationsPage() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [rows, setRows] = useState<OrgRow[]>([])
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
    const { data } = await api.get<Stats>("/api/v1/organization/stats")
    setStats(data)
  }

  async function fetchPage(nextPage: number, pageSize: number) {
    if (!token) return
    const { data } = await api.get<{
      organizations: OrgRow[]
      pagination: Pagination
    }>("/api/v1/organization", { params: { page: nextPage, pageSize } })
    setRows(data.organizations)
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
      <BreadcrumbComp title="Organizations" items={[]} />

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
            <div className="md:col-span-4 col-span-12">
              <CardBox className="p-6">
                <p className="text-sm text-muted-foreground">Total</p>
                <p className="text-2xl font-semibold">
                  {stats ? stats.total : loading ? "…" : "—"}
                </p>
              </CardBox>
            </div>
            <div className="md:col-span-4 col-span-12">
              <CardBox className="p-6">
                <p className="text-sm text-muted-foreground">AI enabled</p>
                <p className="text-2xl font-semibold">
                  {stats ? stats.aiEnabled : loading ? "…" : "—"}
                </p>
              </CardBox>
            </div>
            <div className="md:col-span-4 col-span-12">
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
                <h5 className="card-title">Organizations</h5>
                <p className="text-sm text-muted-foreground">
                  {pagination.total} total
                </p>
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
                    <TableHead>AI</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Updated</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-sm text-muted-foreground">
                        {loading ? "Loading…" : "No organizations found."}
                      </TableCell>
                    </TableRow>
                  ) : (
                    rows.map((org) => (
                      <TableRow key={org.id}>
                        <TableCell className="whitespace-nowrap">{org.id}</TableCell>
                        <TableCell className="max-w-md">
                          <span className="truncate block">{org.name}</span>
                        </TableCell>
                        <TableCell>
                          <Badge variant={org.isAIEnabled ? "lightSuccess" : "secondary"}>
                            {org.isAIEnabled ? "Enabled" : "Disabled"}
                          </Badge>
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                          {format(new Date(org.created_at), "yyyy-MM-dd")}
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                          {format(new Date(org.updated_at), "yyyy-MM-dd")}
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

