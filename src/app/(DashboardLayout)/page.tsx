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
    responsesTotal,
    responsesFinished,
    responsesCreatedLast30Days,
    contactsTotal,
    recentOrganizations,
    recentSurveys,
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
    prisma.response.count(),
    prisma.response.count({ where: { finished: true } }),
    prisma.response.count({ where: { created_at: { gte: since30d } } }),
    prisma.contact.count(),
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
  ]);

  const responseFinishRate =
    responsesTotal > 0 ? responsesFinished / responsesTotal : 0;

  const aiEnabledRate =
    organizationsTotal > 0 ? organizationsAiEnabled / organizationsTotal : 0;

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

      <div className="lg:col-span-4 col-span-12">
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
                  href="/surveys"
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
