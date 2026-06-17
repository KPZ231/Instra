import InstallButton from "./InstallButton";

interface PluginCardProps {
  id: string;
  slug: string;
  name: string;
  description: string;
  authorLabel: string;
  version: string;
  capabilities: string[];
  installed: boolean;
  hasUpdate: boolean;
  latestVersionId: string;
  installedVersionId?: string;
}

/**
 * Rich card displaying a plugin from the marketplace.
 * Shows slug, name, description, author, version, capabilities,
 * install status badge, and an action button.
 *
 * @param id - Plugin ID
 * @param slug - Unique plugin slug
 * @param name - Display name
 * @param description - Short description
 * @param authorLabel - Display label for the plugin author
 * @param version - Current approved version string
 * @param capabilities - Array of capability strings from manifest
 * @param installed - Whether the current user has this installed
 * @param hasUpdate - Whether a newer version is available
 * @param latestVersionId - ID of the newest approved version
 * @param installedVersionId - ID of the currently installed version (if any)
 * @example
 * <PluginCard id="abc" slug="my-plugin" name="My Plugin" ... />
 */
export default function PluginCard({
  id,
  slug,
  name,
  description,
  authorLabel,
  version,
  capabilities,
  installed,
  hasUpdate,
  latestVersionId,
  installedVersionId,
}: PluginCardProps) {
  return (
    <div
      className="rounded-sm border p-5 flex flex-col gap-4 transition-[border-color] duration-150"
      style={{
        background: "var(--color-surface-container-lowest)",
        borderColor: "rgba(255,255,255,0.06)",
      }}
    >
      {/* Header row */}
      <div className="flex items-start justify-between gap-3">
        <span
          className="font-mono text-[10px] tracking-[0.1em] uppercase px-1.5 py-0.5 rounded-sm border"
          style={{
            borderColor: "rgba(232,227,217,0.3)",
            color: "var(--color-accent-bone)",
          }}
        >
          {slug}
        </span>
        <div className="flex gap-1.5">
          {hasUpdate && (
            <span
              className="font-mono text-[10px] tracking-[0.1em] uppercase px-1.5 py-0.5 rounded-sm border"
              style={{
                borderColor: "rgba(0,255,65,0.4)",
                color: "var(--color-success-green)",
              }}
            >
              UPDATE
            </span>
          )}
          {installed && (
            <span
              className="font-mono text-[10px] tracking-[0.1em] uppercase px-1.5 py-0.5 rounded-sm border"
              style={{
                borderColor: "rgba(255,255,255,0.2)",
                color: "var(--color-primary)",
              }}
            >
              INSTALLED
            </span>
          )}
        </div>
      </div>

      {/* Name + description */}
      <div>
        <h3
          className="font-sans text-base font-semibold mb-1"
          style={{ color: "var(--color-primary)" }}
        >
          {name}
        </h3>
        <p
          className="font-sans text-sm leading-relaxed"
          style={{ color: "var(--color-accent-bone)" }}
        >
          {description}
        </p>
      </div>

      {/* Meta */}
      <p
        className="font-mono text-[11px] tracking-[0.05em]"
        style={{ color: "var(--color-on-surface-variant)" }}
      >
        {authorLabel} · v{version} · {capabilities.length} capabilities
      </p>

      {/* Capability chips */}
      {capabilities.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {capabilities.map((cap) => (
            <span
              key={cap}
              className="font-mono text-[10px] tracking-[0.08em] uppercase px-1.5 py-0.5 rounded-sm border"
              style={{
                borderColor: "rgba(232,227,217,0.2)",
                color: "var(--color-on-surface-variant)",
              }}
            >
              {cap}
            </span>
          ))}
        </div>
      )}

      {/* Action */}
      <div className="mt-auto flex justify-end">
        <InstallButton
          pluginId={id}
          pluginVersionId={installedVersionId ?? latestVersionId}
          installed={installed}
          hasUpdate={hasUpdate}
          latestVersionId={latestVersionId}
        />
      </div>
    </div>
  );
}
