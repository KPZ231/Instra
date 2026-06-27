import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { verifySession } from "@/lib/auth/dal";
import { prisma } from "@/lib/prisma";
import AdminReviewCard from "@/components/dashboard/plugins/AdminReviewCard";
import { UserRole } from "@/types/auth";
import type { PluginManifest } from "@/lib/plugins/manifest";

export const metadata: Metadata = {
  title: "Plugin Review  Instra Admin",
  robots: { index: false, follow: false },
};

/**
 * Admin plugin review panel  server component.
 * Only accessible to users with role ADMIN; others are redirected to /dashboard.
 * Displays all plugin versions with PENDING_REVIEW status, ordered oldest first.
 */
export default async function AdminPluginsPage() {
  const { user } = await verifySession();

  if (user.role !== UserRole.ADMIN) {
    redirect("/dashboard");
  }

  const pendingVersions = await prisma.pluginVersion.findMany({
    where: { status: "PENDING_REVIEW" },
    orderBy: { createdAt: "asc" },
    include: {
      plugin: {
        include: { author: { select: { email: true } } },
      },
    },
  });

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <p
          className="font-mono text-xs tracking-[0.12em] uppercase mb-1"
          style={{ color: "var(--color-on-surface-variant)" }}
        >
          {'// ADMIN'}
        </p>
        <h1
          className="font-sans text-2xl font-semibold"
          style={{ color: "var(--color-primary)" }}
        >
          Plugin Review Queue
        </h1>
        <p
          className="font-mono text-xs mt-1"
          style={{ color: "var(--color-on-surface-variant)" }}
        >
          {pendingVersions.length} pending
        </p>
      </div>

      {/* Empty state */}
      {pendingVersions.length === 0 ? (
        <div
          className="rounded-sm border flex items-center justify-center py-16"
          style={{
            borderColor: "rgba(255,255,255,0.06)",
            borderStyle: "dashed",
          }}
        >
          <p
            className="font-mono text-xs tracking-[0.1em] uppercase"
            style={{ color: "var(--color-on-surface-variant)" }}
          >
            No plugins awaiting review.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {pendingVersions.map((version) => (
            <AdminReviewCard
              key={version.id}
              versionId={version.id}
              slug={version.plugin.slug}
              name={version.plugin.name}
              description={version.plugin.description}
              authorEmail={version.plugin.author.email ?? null}
              version={version.version}
              manifest={version.manifest as PluginManifest}
              submittedAt={version.createdAt.toISOString()}
            />
          ))}
        </div>
      )}
    </div>
  );
}
