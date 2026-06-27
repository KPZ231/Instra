import ReviewActions from "./ReviewActions";
import type { PluginManifest } from "@/lib/plugins/manifest";

interface AdminReviewCardProps {
  versionId: string;
  slug: string;
  name: string;
  description: string;
  authorEmail: string | null;
  version: string;
  manifest: PluginManifest;
  submittedAt: string;
}

/**
 * Card displaying a plugin version awaiting admin review.
 * Shows plugin details, manifest summary, and approve/reject actions.
 *
 * @param versionId - PluginVersion ID for the review API call
 * @param slug - Plugin slug
 * @param name - Plugin display name
 * @param description - Plugin description
 * @param authorEmail - Submitter's email address
 * @param version - Version string (semver)
 * @param manifest - Parsed plugin manifest
 * @param submittedAt - ISO date string of submission time
 */
export default function AdminReviewCard({
  versionId,
  slug,
  name,
  description,
  authorEmail,
  version,
  manifest,
  submittedAt,
}: AdminReviewCardProps) {
  const date = new Date(submittedAt).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

  return (
    <div
      className="rounded-sm border p-5 flex flex-col gap-4"
      style={{
        background: "var(--color-surface-container-lowest)",
        borderColor: "rgba(255,255,255,0.06)",
      }}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <span
            className="font-mono text-[10px] tracking-[0.1em] uppercase px-1.5 py-0.5 rounded-sm border"
            style={{ borderColor: "rgba(255,180,0,0.4)", color: "#ffd166" }}
          >
            PENDING REVIEW
          </span>
          <span
            className="font-mono text-[10px] tracking-[0.05em]"
            style={{ color: "var(--color-outline)" }}
          >
            {date}
          </span>
        </div>
      </div>

      {/* Plugin info */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <h3
            className="font-sans text-base font-semibold"
            style={{ color: "var(--color-primary)" }}
          >
            {name}
          </h3>
          <span
            className="font-mono text-[10px] tracking-[0.08em] uppercase px-1.5 py-0.5 rounded-sm border"
            style={{
              borderColor: "rgba(232,227,217,0.3)",
              color: "var(--color-accent-bone)",
            }}
          >
            {slug}
          </span>
        </div>
        <p
          className="font-sans text-sm"
          style={{ color: "var(--color-accent-bone)" }}
        >
          {description}
        </p>
      </div>

      {/* Meta */}
      <div
        className="font-mono text-[11px] space-y-0.5"
        style={{ color: "var(--color-on-surface-variant)" }}
      >
        <p>author: {authorEmail ?? ""}</p>
        <p>version: {version}</p>
        {manifest.permissions.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-2">
            {manifest.permissions.map((cap) => (
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
      </div>

      {/* Manifest preview */}
      <details className="group">
        <summary
          className="font-mono text-[11px] tracking-[0.08em] uppercase cursor-pointer list-none flex items-center gap-1"
          style={{ color: "var(--color-on-surface-variant)" }}
        >
          <span className="group-open:rotate-90 transition-transform inline-block">
            ▶
          </span>
          Manifest JSON
        </summary>
        <pre
          className="mt-2 rounded-sm border p-3 font-mono text-[11px] overflow-auto max-h-48"
          style={{
            borderColor: "rgba(255,255,255,0.06)",
            color: "var(--color-accent-bone)",
            background: "rgba(0,0,0,0.3)",
          }}
        >
          {JSON.stringify(manifest, null, 2)}
        </pre>
      </details>

      {/* Actions */}
      <div
        className="flex justify-end pt-2 border-t"
        style={{ borderColor: "rgba(255,255,255,0.06)" }}
      >
        <ReviewActions versionId={versionId} />
      </div>
    </div>
  );
}
