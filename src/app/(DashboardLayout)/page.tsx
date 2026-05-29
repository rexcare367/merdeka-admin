import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

function formatNumber(value: number): string {
  return new Intl.NumberFormat("en-US").format(value);
}

function formatPercent(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "percent",
    maximumFractionDigits: 1,
  }).format(value);
}

function formatDurationMs(ms: number): string {
  if (!Number.isFinite(ms) || ms <= 0) return "—";
  const totalSeconds = Math.round(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  if (minutes <= 0) return `${seconds}s`;
  return `${minutes}m ${seconds.toString().padStart(2, "0")}s`;
}

function sumTtc(ttc: unknown): number {
  if (!ttc || typeof ttc !== "object") return 0;
  let total = 0;
  for (const v of Object.values(ttc as Record<string, unknown>)) {
    if (typeof v === "number" && Number.isFinite(v)) {
      total += v;
    }
  }
  return total;
}

function isOfflineMeta(meta: unknown): boolean {
  if (!meta || typeof meta !== "object") return false;
  const m = meta as Record<string, unknown>;
  if (m.offline === true) return true;
  if (typeof m.source === "string" && m.source.toLowerCase().includes("offline"))
    return true;
  if (
    typeof m.connection === "string" &&
    m.connection.toLowerCase() === "offline"
  )
    return true;
  return false;
}

export default async function Page() {
  const session = await auth();
  const adminId = session?.user?.id;

  if (!adminId) {
    return null;
  }

  const admin = await prisma.admin.findUnique({
    where: { id: adminId },
    select: { id: true, email: true, name: true, role: true },
  });

  if (!admin) {
    return null;
  }

  const since30d = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const [
    organizationsTotal,
    organizationsAiEnabled,
    organizationsCreatedLast30Days,
    projectsTotal,
    environmentsTotal,
    surveysTotal,
    surveysDraft,
    surveysInProgress,
    surveysPaused,
    surveysCompleted,
    surveysCreatedLast30Days,
    surveysLinkTotal,
    surveysAppTotal,
    responsesTotal,
    responsesFinished,
    responsesNotFinished,
    responsesCreatedLast30Days,
    disqualifiedResponseRows,
    surveysAnsweredGroups,
    displaysTotal,
    contactsTotal,
    enumeratorsTotal,
    enumeratorsActive,
    enumeratorsActiveLast30Days,
    recentOrganizations,
    recentSurveys,
    recentActivity,
    responsesSampleTtc,
    responsesSampleMeta,
  ] = await Promise.all([
    prisma.organization.count(),
    prisma.organization.count({ where: { isAIEnabled: true } }),
    prisma.organization.count({ where: { created_at: { gte: since30d } } }),
    prisma.project.count(),
    prisma.environment.count(),
    prisma.survey.count(),
    prisma.survey.count({ where: { status: "draft" } }),
    prisma.survey.count({ where: { status: "inProgress" } }),
    prisma.survey.count({ where: { status: "paused" } }),
    prisma.survey.count({ where: { status: "completed" } }),
    prisma.survey.count({ where: { created_at: { gte: since30d } } }),
    prisma.survey.count({ where: { type: "link" } }),
    prisma.survey.count({ where: { type: "app" } }),
    prisma.response.count(),
    prisma.response.count({ where: { finished: true } }),
    prisma.response.count({ where: { finished: false } }),
    prisma.response.count({ where: { created_at: { gte: since30d } } }),
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
    prisma.contact.count(),
    prisma.user.count(),
    prisma.user.count({ where: { isActive: true } }),
    prisma.user.count({ where: { lastLoginAt: { gte: since30d } } }),
    prisma.organization.findMany({
      orderBy: { created_at: "desc" },
      take: 6,
      select: {
        id: true,
        name: true,
        isAIEnabled: true,
        created_at: true,
        _count: { select: { Project: true, Membership: true } },
      },
    }),
    prisma.survey.findMany({
      orderBy: { created_at: "desc" },
      take: 6,
      select: {
        id: true,
        name: true,
        status: true,
        type: true,
        created_at: true,
        _count: { select: { Response: true } },
      },
    }),
    prisma.adminAuditLog.findMany({
      orderBy: { created_at: "desc" },
      take: 8,
      select: {
        id: true,
        action: true,
        targetType: true,
        targetId: true,
        created_at: true,
        Admin: { select: { id: true, name: true, email: true } },
      },
    }),
    prisma.response.findMany({
      select: { ttc: true },
      take: 2000,
      orderBy: { created_at: "desc" },
    }),
    prisma.response.findMany({
      select: { meta: true },
      take: 2000,
      orderBy: { created_at: "desc" },
    }),
  ]);

  const disqualifiedResponses = disqualifiedResponseRows.length;
  const surveysAnswered = surveysAnsweredGroups.length;
  const completeAdjusted = Math.max(0, responsesFinished - disqualifiedResponses);

  let durationSumMs = 0;
  let durationCount = 0;
  for (const r of responsesSampleTtc) {
    const v = sumTtc(r.ttc);
    if (v > 0) {
      durationSumMs += v;
      durationCount += 1;
    }
  }
  const averageDurationMs =
    durationCount > 0 ? Math.round(durationSumMs / durationCount) : 0;

  let offlineSampled = 0;
  for (const r of responsesSampleMeta) {
    if (isOfflineMeta(r.meta)) offlineSampled += 1;
  }
  const metaSampleSize = responsesSampleMeta.length;
  const offlineRatio = metaSampleSize > 0 ? offlineSampled / metaSampleSize : 0;
  const offlineEstimated = Math.round(responsesTotal * offlineRatio);
  const onlineEstimated = Math.max(0, responsesTotal - offlineEstimated);

  const responseFinishRate =
    responsesTotal > 0 ? responsesFinished / responsesTotal : 0;

  const aiEnabledRate =
    organizationsTotal > 0 ? organizationsAiEnabled / organizationsTotal : 0;

  const enumeratorsInactive = enumeratorsTotal - enumeratorsActive;

  return (
    <div className="grid grid-cols-12 gap-30">
      <div className="col-span-12">
        <div className="bg-white dark:bg-darkgray rounded-xl shadow-xs p-8">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h1 className="text-xl font-semibold text-dark dark:text-white">
                Analytics overview
              </h1>
              <p className="text-sm text-ld mt-1">
                Last updated: {new Date().toLocaleString()}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Link
                href="/organizations"
                className="px-4 py-2 rounded-md bg-lightprimary text-primary hover:bg-lightsecondary transition-colors"
              >
                View organizations
              </Link>
              <Link
                href="/surveys"
                className="px-4 py-2 rounded-md bg-lightprimary text-primary hover:bg-lightsecondary transition-colors"
              >
                View surveys
              </Link>
              <Link
                href="/enumerators"
                className="px-4 py-2 rounded-md bg-lightprimary text-primary hover:bg-lightsecondary transition-colors"
              >
                View enumerators
              </Link>
            </div>
          </div>
          <div className="mt-6 text-sm text-ld">
            Signed in as{" "}
            <span className="text-dark dark:text-white font-medium">
              {admin.name ?? admin.email}
            </span>{" "}
            ({admin.role})
          </div>
        </div>
      </div>

      <div className="lg:col-span-3 sm:col-span-6 col-span-12">
        <div className="bg-white dark:bg-darkgray rounded-xl shadow-xs p-8">
          <p className="text-sm text-ld">Organizations</p>
          <p className="text-2xl font-semibold mt-2 text-dark dark:text-white">
            {formatNumber(organizationsTotal)}
          </p>
          <p className="text-sm text-ld mt-2">
            +{formatNumber(organizationsCreatedLast30Days)} in last 30 days
          </p>
        </div>
      </div>

      <div className="lg:col-span-3 sm:col-span-6 col-span-12">
        <div className="bg-white dark:bg-darkgray rounded-xl shadow-xs p-8">
          <p className="text-sm text-ld">AI enabled</p>
          <p className="text-2xl font-semibold mt-2 text-dark dark:text-white">
            {formatNumber(organizationsAiEnabled)}
          </p>
          <p className="text-sm text-ld mt-2">
            {formatPercent(aiEnabledRate)} of orgs
          </p>
        </div>
      </div>

      <div className="lg:col-span-3 sm:col-span-6 col-span-12">
        <div className="bg-white dark:bg-darkgray rounded-xl shadow-xs p-8">
          <p className="text-sm text-ld">Surveys</p>
          <p className="text-2xl font-semibold mt-2 text-dark dark:text-white">
            {formatNumber(surveysTotal)}
          </p>
          <p className="text-sm text-ld mt-2">
            +{formatNumber(surveysCreatedLast30Days)} in last 30 days
          </p>
        </div>
      </div>

      <div className="lg:col-span-3 sm:col-span-6 col-span-12">
        <div className="bg-white dark:bg-darkgray rounded-xl shadow-xs p-8">
          <p className="text-sm text-ld">Surveys answered</p>
          <p className="text-2xl font-semibold mt-2 text-dark dark:text-white">
            {formatNumber(surveysAnswered)}
          </p>
          <p className="text-sm text-ld mt-2">
            of {formatNumber(surveysTotal)} total
          </p>
        </div>
      </div>

      <div className="lg:col-span-3 sm:col-span-6 col-span-12">
        <div className="bg-white dark:bg-darkgray rounded-xl shadow-xs p-8">
          <p className="text-sm text-ld">Responses</p>
          <p className="text-2xl font-semibold mt-2 text-dark dark:text-white">
            {formatNumber(responsesTotal)}
          </p>
          <p className="text-sm text-ld mt-2">
            +{formatNumber(responsesCreatedLast30Days)} in last 30 days ·{" "}
            {formatPercent(responseFinishRate)} finished
          </p>
        </div>
      </div>

      <div className="lg:col-span-3 sm:col-span-6 col-span-12">
        <div className="bg-white dark:bg-darkgray rounded-xl shadow-xs p-8">
          <p className="text-sm text-ld">Avg survey duration</p>
          <p className="text-2xl font-semibold mt-2 text-dark dark:text-white">
            {formatDurationMs(averageDurationMs)}
          </p>
          <p className="text-sm text-ld mt-2">
            across {formatNumber(durationCount)} timed responses
          </p>
        </div>
      </div>

      <div className="lg:col-span-3 sm:col-span-6 col-span-12">
        <div className="bg-white dark:bg-darkgray rounded-xl shadow-xs p-8">
          <p className="text-sm text-ld">Enumerators active</p>
          <p className="text-2xl font-semibold mt-2 text-dark dark:text-white">
            {formatNumber(enumeratorsActive)}
          </p>
          <p className="text-sm text-ld mt-2">
            {formatNumber(enumeratorsInactive)} inactive ·{" "}
            {formatNumber(enumeratorsActiveLast30Days)} logged in (30d)
          </p>
        </div>
      </div>

      <div className="lg:col-span-3 sm:col-span-6 col-span-12">
        <div className="bg-white dark:bg-darkgray rounded-xl shadow-xs p-8">
          <p className="text-sm text-ld">Survey links</p>
          <p className="text-2xl font-semibold mt-2 text-dark dark:text-white">
            {formatNumber(displaysTotal)}
          </p>
          <p className="text-sm text-ld mt-2">
            shared · {formatNumber(responsesTotal)} used
          </p>
        </div>
      </div>

      <div className="lg:col-span-4 sm:col-span-6 col-span-12">
        <div className="rounded-xl shadow-xs bg-white dark:bg-darkgray p-8 h-full">
          <h5 className="card-title mb-6 text-lg font-semibold">
            Response status
          </h5>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-ld">Complete</span>
              <span className="text-sm font-medium text-dark dark:text-white">
                {formatNumber(completeAdjusted)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-ld">Not complete</span>
              <span className="text-sm font-medium text-dark dark:text-white">
                {formatNumber(responsesNotFinished)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-ld">Disqualified</span>
              <span className="text-sm font-medium text-dark dark:text-white">
                {formatNumber(disqualifiedResponses)}
              </span>
            </div>
            <div className="flex items-center justify-between border-t border-border pt-4">
              <span className="text-sm text-ld">Total responses</span>
              <span className="text-sm font-medium text-dark dark:text-white">
                {formatNumber(responsesTotal)}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="lg:col-span-4 sm:col-span-6 col-span-12">
        <div className="rounded-xl shadow-xs bg-white dark:bg-darkgray p-8 h-full">
          <h5 className="card-title mb-6 text-lg font-semibold">
            Online vs offline
          </h5>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-ld">Completed online</span>
              <span className="text-sm font-medium text-dark dark:text-white">
                {formatNumber(onlineEstimated)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-ld">Completed offline</span>
              <span className="text-sm font-medium text-dark dark:text-white">
                {formatNumber(offlineEstimated)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-ld">App surveys</span>
              <span className="text-sm font-medium text-dark dark:text-white">
                {formatNumber(surveysAppTotal)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-ld">Link surveys</span>
              <span className="text-sm font-medium text-dark dark:text-white">
                {formatNumber(surveysLinkTotal)}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="lg:col-span-4 col-span-12">
        <div className="rounded-xl shadow-xs bg-white dark:bg-darkgray p-8 h-full">
          <h5 className="card-title mb-6 text-lg font-semibold">
            Survey status
          </h5>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-ld">In progress</span>
              <span className="text-sm font-medium text-dark dark:text-white">
                {formatNumber(surveysInProgress)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-ld">Draft</span>
              <span className="text-sm font-medium text-dark dark:text-white">
                {formatNumber(surveysDraft)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-ld">Paused</span>
              <span className="text-sm font-medium text-dark dark:text-white">
                {formatNumber(surveysPaused)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-ld">Completed</span>
              <span className="text-sm font-medium text-dark dark:text-white">
                {formatNumber(surveysCompleted)}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="lg:col-span-4 sm:col-span-6 col-span-12">
        <div className="rounded-xl shadow-xs bg-white dark:bg-darkgray p-8 h-full">
          <h5 className="card-title mb-6 text-lg font-semibold">
            Platform totals
          </h5>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-ld">Projects</span>
              <span className="text-sm font-medium text-dark dark:text-white">
                {formatNumber(projectsTotal)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-ld">Environments</span>
              <span className="text-sm font-medium text-dark dark:text-white">
                {formatNumber(environmentsTotal)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-ld">Contacts</span>
              <span className="text-sm font-medium text-dark dark:text-white">
                {formatNumber(contactsTotal)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-ld">Finished responses</span>
              <span className="text-sm font-medium text-dark dark:text-white">
                {formatNumber(responsesFinished)}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="lg:col-span-4 sm:col-span-6 col-span-12">
        <div className="rounded-xl shadow-xs bg-white dark:bg-darkgray p-8 h-full">
          <h5 className="card-title mb-6 text-lg font-semibold">
            Activity (last 30 days)
          </h5>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-ld">Organizations created</span>
              <span className="text-sm font-medium text-dark dark:text-white">
                {formatNumber(organizationsCreatedLast30Days)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-ld">Surveys created</span>
              <span className="text-sm font-medium text-dark dark:text-white">
                {formatNumber(surveysCreatedLast30Days)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-ld">Responses created</span>
              <span className="text-sm font-medium text-dark dark:text-white">
                {formatNumber(responsesCreatedLast30Days)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-ld">Enumerators logged in</span>
              <span className="text-sm font-medium text-dark dark:text-white">
                {formatNumber(enumeratorsActiveLast30Days)}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="lg:col-span-4 col-span-12">
        <div className="rounded-xl shadow-xs bg-white dark:bg-darkgray p-8 h-full">
          <div className="flex items-center justify-between gap-4">
            <h5 className="card-title text-lg font-semibold">
              Recent admin activity
            </h5>
          </div>
          <div className="mt-6 space-y-4">
            {recentActivity.length === 0 ? (
              <p className="text-sm text-ld">No activity recorded yet.</p>
            ) : (
              recentActivity.map((a) => (
                <div key={a.id} className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-dark dark:text-white truncate">
                      {a.action}
                    </p>
                    <p className="text-xs text-ld mt-1">
                      {a.targetType}
                      {a.targetId ? ` · ${a.targetId}` : ""} ·{" "}
                      {a.Admin?.name ?? a.Admin?.email ?? "system"}
                    </p>
                  </div>
                  <span className="text-xs text-ld whitespace-nowrap">
                    {new Date(a.created_at).toLocaleString()}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="lg:col-span-6 col-span-12">
        <div className="rounded-xl shadow-xs bg-white dark:bg-darkgray p-8 h-full">
          <div className="flex items-center justify-between gap-4">
            <h5 className="card-title text-lg font-semibold">
              Recent organizations
            </h5>
            <Link
              href="/organizations"
              className="text-sm text-primary underline decoration-primary"
            >
              See all
            </Link>
          </div>

          <div className="mt-6 space-y-4">
            {recentOrganizations.map((o) => (
              <div
                key={o.id}
                className="flex items-center justify-between gap-4"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-dark dark:text-white truncate">
                      {o.name}
                    </p>
                    {o.isAIEnabled ? (
                      <span className="text-xs px-2 py-0.5 rounded bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300">
                        AI
                      </span>
                    ) : null}
                  </div>
                  <p className="text-xs text-ld mt-1">
                    {o._count.Project} projects · {o._count.Membership} members ·{" "}
                    {new Date(o.created_at).toLocaleDateString()}
                  </p>
                </div>
                <Link
                  href={`/organizations/${o.id}`}
                  className="text-sm text-primary hover:underline whitespace-nowrap"
                >
                  Details
                </Link>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="lg:col-span-6 col-span-12">
        <div className="rounded-xl shadow-xs bg-white dark:bg-darkgray p-8 h-full">
          <div className="flex items-center justify-between gap-4">
            <h5 className="card-title text-lg font-semibold">Recent surveys</h5>
            <Link
              href="/surveys"
              className="text-sm text-primary underline decoration-primary"
            >
              See all
            </Link>
          </div>

          <div className="mt-6 space-y-4">
            {recentSurveys.map((s) => (
              <div key={s.id} className="flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <p className="font-medium text-dark dark:text-white truncate">
                    {s.name}
                  </p>
                  <p className="text-xs text-ld mt-1">
                    {s.status} · {s.type} · {s._count.Response} responses ·{" "}
                    {new Date(s.created_at).toLocaleDateString()}
                  </p>
                </div>
                <Link
                  href={`/surveys/${s.id}`}
                  className="text-sm text-primary hover:underline whitespace-nowrap"
                >
                  Open
                </Link>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="col-span-12 text-center">
        <p className="text-base">
          Design and Developed by{" "}
          <Link
            href="https://merdekasurvey.com/"
            target="_blank"
            className="pl-1 text-primary underline decoration-primary"
          >
            merdekasurvey.com
          </Link>
        </p>
      </div>
    </div>
  );
}
