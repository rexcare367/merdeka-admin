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

type TeamRow = {
  id: string
  name: string
  created_at: string
  updated_at: string
  membersCount: number
  projectsCount: number
}

type MemberRow = {
  id: string
  name: string
  email: string
  isActive: boolean
  role: "owner" | "manager" | "member" | "billing"
  accepted: boolean
  lastLoginAt: string | null
  created_at: string
  updated_at: string
}

type OrganizationDetail = {
  id: string
  name: string
  isAIEnabled: boolean
  created_at: string
  updated_at: string
  projectsCount?: number
  membersCount?: number
  teamsCount?: number
  projects_count?: number
  members_count?: number
  teams_count?: number
  teams?: TeamRow[]
  members?: MemberRow[]
}

export default function OrganizationDetailPage() {
  const params = useParams<{ id: string }>()
  const id = params?.id

  const [org, setOrg] = useState<OrganizationDetail | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const token = useMemo(() => {
    try {
      return sessionStorage.getItem("adminAccessToken")
    } catch {
      return null
    }
  }, [])

  const projectsCount =
    typeof org?.projectsCount === "number"
      ? org.projectsCount
      : typeof org?.projects_count === "number"
        ? org.projects_count
        : null
  const membersCount =
    typeof org?.membersCount === "number"
      ? org.membersCount
      : typeof org?.members_count === "number"
        ? org.members_count
        : null
  const teamsCount =
    typeof org?.teamsCount === "number"
      ? org.teamsCount
      : typeof org?.teams_count === "number"
        ? org.teams_count
        : null
  const teams = Array.isArray(org?.teams) ? org.teams : []
  const members = Array.isArray(org?.members) ? org.members : []

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
        const { data } = await api.get<OrganizationDetail>(`/api/v1/organization/${id}`)
        if (cancelled) return
        setOrg(data)
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

  return (
    <>
      <BreadcrumbComp
        title="Organization detail"
        items={[
          { to: "/organizations", title: "Organizations" },
          { title: typeof id === "string" ? id : "Detail" },
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
                <p className="text-sm text-muted-foreground">Name</p>
                <p className="text-2xl font-semibold">{org ? org.name : loading ? "…" : "—"}</p>
                <div className="mt-2">
                  <Badge variant={org?.isAIEnabled ? "lightSuccess" : "secondary"}>
                    {org?.isAIEnabled ? "AI enabled" : "AI disabled"}
                  </Badge>
                </div>
              </div>

              <div className="grid grid-cols-12 gap-4 flex-1">
                <div className="col-span-12 md:col-span-4">
                  <p className="text-sm text-muted-foreground">Projects</p>
                  <p className="text-xl font-semibold">{projectsCount ?? (loading ? "…" : "—")}</p>
                </div>
                <div className="col-span-12 md:col-span-4">
                  <p className="text-sm text-muted-foreground">Members</p>
                  <p className="text-xl font-semibold">{membersCount ?? (loading ? "…" : "—")}</p>
                </div>
                <div className="col-span-12 md:col-span-4">
                  <p className="text-sm text-muted-foreground">Teams</p>
                  <p className="text-xl font-semibold">{teamsCount ?? (loading ? "…" : "—")}</p>
                </div>
              </div>
            </div>

            <div className="mt-6 grid grid-cols-12 gap-4 text-sm text-muted-foreground">
              <div className="col-span-12 md:col-span-4">
                <p>Organization ID</p>
                <p className="mt-1 font-mono text-foreground">{typeof id === "string" ? id : "—"}</p>
              </div>
              <div className="col-span-12 md:col-span-4">
                <p>Created</p>
                <p className="mt-1 text-foreground">
                  {org ? format(new Date(org.created_at), "yyyy-MM-dd") : loading ? "…" : "—"}
                </p>
              </div>
              <div className="col-span-12 md:col-span-4">
                <p>Updated</p>
                <p className="mt-1 text-foreground">
                  {org ? format(new Date(org.updated_at), "yyyy-MM-dd") : loading ? "…" : "—"}
                </p>
              </div>
            </div>
          </CardBox>
        </div>

        <div className="col-span-12">
          <CardBox className="p-6">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div>
                <h5 className="card-title">Teams</h5>
                <p className="text-sm text-muted-foreground">{teamsCount ?? "—"} total</p>
              </div>
            </div>

            <div className="mt-4 overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead className="text-right">Members</TableHead>
                    <TableHead className="text-right">Projects</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Updated</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {teams.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-sm text-muted-foreground">
                        {loading ? "Loading…" : "No teams found."}
                      </TableCell>
                    </TableRow>
                  ) : (
                    teams.map((t) => (
                      <TableRow key={t.id}>
                        <TableCell className="whitespace-nowrap">{t.id}</TableCell>
                        <TableCell className="max-w-md">
                          <span className="truncate block">{t.name}</span>
                        </TableCell>
                        <TableCell className="text-right whitespace-nowrap">{t.membersCount}</TableCell>
                        <TableCell className="text-right whitespace-nowrap">{t.projectsCount}</TableCell>
                        <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                          {format(new Date(t.created_at), "yyyy-MM-dd")}
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                          {format(new Date(t.updated_at), "yyyy-MM-dd")}
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
                <h5 className="card-title">Members</h5>
                <p className="text-sm text-muted-foreground">{membersCount ?? "—"} total</p>
              </div>
            </div>

            <div className="mt-4 overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Accepted</TableHead>
                    <TableHead>Last login</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {members.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-sm text-muted-foreground">
                        {loading ? "Loading…" : "No members found."}
                      </TableCell>
                    </TableRow>
                  ) : (
                    members.map((m) => (
                      <TableRow key={m.id}>
                        <TableCell className="whitespace-nowrap">{m.id}</TableCell>
                        <TableCell className="max-w-xs">
                          <span className="truncate block">{m.name}</span>
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                          {m.email}
                        </TableCell>
                        <TableCell className="whitespace-nowrap">{m.role}</TableCell>
                        <TableCell className="whitespace-nowrap">
                          <Badge variant={m.isActive ? "lightSuccess" : "secondary"}>
                            {m.isActive ? "Active" : "Inactive"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right whitespace-nowrap">
                          {m.accepted ? (
                            <Badge variant="lightSuccess">Yes</Badge>
                          ) : (
                            <Badge variant="secondary">No</Badge>
                          )}
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                          {m.lastLoginAt ? format(new Date(m.lastLoginAt), "yyyy-MM-dd") : "—"}
                        </TableCell>
                      </TableRow>
                    ))
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

