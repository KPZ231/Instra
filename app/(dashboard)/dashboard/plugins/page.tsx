import type { Metadata } from "next";
import { verifySession } from "@/lib/auth/dal";
import { listApprovedPlugins, getUserSubmissions } from "@/lib/plugins/registry";
import { getUserInstallations, getAvailableUpdate } from "@/lib/plugins/installations";
import PluginCard from "@/components/dashboard/plugins/PluginCard";
import MySubmissionsSection from "@/components/dashboard/plugins/MySubmissionsSection";
import Link from "next/link";
import type { PluginManifest } from "@/lib/plugins/manifest";

export const metadata: Metadata = {
  title: "Plugin Marketplace  Instra",
  robots: { index: false, follow: false },
};

/**
 * Plugin marketplace page  server component.
 * Lists all approved plugins with the current user's installation state.
 * Fetches approved versions and user installations in parallel, then
 * resolves update availability per plugin.
 */
export default async function PluginsMarketplacePage() {
  const { user } = await verifySession();

  const [approvedVersions, installations, mySubmissions] = await Promise.all([
    listApprovedPlugins(),
    getUserInstallations(user.id),
    getUserSubmissions(user.id),
  ]);

  const installedMap = new Map(
    installations.map((inst) => [inst.pluginId, inst])
  );

  const pluginCards = await Promise.all(
    approvedVersions.map(async (version) => {
      const installation = installedMap.get(version.pluginId);
      const update = installation
        ? await getAvailableUpdate(version.pluginId, installation.pluginVersion.version)
        : null;

      const manifest = version.manifest as PluginManifest;

      return {
        id: version.pluginId,
        slug: version.plugin.slug,
        name: version.plugin.name,
        description: version.plugin.description,
        authorLabel: 'Plugin Author',
        version: version.version,
        capabilities: manifest.permissions ?? [],
        installed: !!installation,
        hasUpdate: !!update,
        latestVersionId: version.id,
        installedVersionId: installation?.pluginVersionId,
      };
    })
  );

  return (
    <div className="space-y-8">
      {/* My Submissions */}
      <MySubmissionsSection submissions={mySubmissions} />

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <p
            className="font-mono text-xs tracking-[0.12em] uppercase mb-1"
            style={{ color: "var(--color-on-surface-variant)" }}
          >
            {'// MARKETPLACE'}
          </p>
          <h1
            className="font-sans text-2xl font-semibold"
            style={{ color: "var(--color-primary)" }}
          >
            Plugin Marketplace
          </h1>
        </div>
        <Link
          href="/dashboard/plugins/upload"
          className="px-4 py-2 rounded-sm font-mono text-xs tracking-[0.08em] uppercase border transition-colors"
          style={{
            borderColor: "rgba(232,227,217,0.3)",
            color: "var(--color-accent-bone)",
          }}
        >
          + Submit Plugin
        </Link>
      </div>

      {/* Grid */}
      {pluginCards.length === 0 ? (
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
            No plugins available yet.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
          {pluginCards.map((card) => (
            <PluginCard key={card.id} {...card} />
          ))}
        </div>
      )}
    </div>
  );
}
