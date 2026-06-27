import { redirect } from "next/navigation";
import { getFirstDocSlug } from "@/lib/api/docs";

/**
 * /docs root  redirects to the first available document in the tree.
 * If /docs/ is empty, shows a placeholder.
 */
export default function DocsIndexPage() {
  const firstSlug = getFirstDocSlug();

  if (firstSlug) {
    redirect(`/docs/${firstSlug.join("/")}`);
  }

  return (
    <div className="flex flex-col items-center justify-center py-24 text-center gap-4">
      <p
        className="text-xs font-mono tracking-widest uppercase"
        style={{ color: "var(--color-outline)" }}
      >
        No docs yet
      </p>
      <p className="text-sm" style={{ color: "var(--color-on-surface-variant)" }}>
        Add <code className="font-mono text-xs px-1.5 py-0.5 rounded"
          style={{ background: "var(--color-surface-container-high)", color: "var(--color-accent-bone)" }}>
          .md
        </code> files to the <code className="font-mono text-xs px-1.5 py-0.5 rounded"
          style={{ background: "var(--color-surface-container-high)", color: "var(--color-accent-bone)" }}>
          /docs/
        </code> directory and they will appear here automatically.
      </p>
    </div>
  );
}
