"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface InstallButtonProps {
  pluginId: string;
  pluginVersionId: string;
  installed: boolean;
  hasUpdate: boolean;
  latestVersionId?: string;
}

/**
 * Client component button for installing, uninstalling, or updating a plugin.
 * Calls POST /api/plugins/install and refreshes the page on success.
 *
 * @param pluginId - Plugin ID
 * @param pluginVersionId - Currently approved version ID (for install)
 * @param installed - Whether the plugin is currently installed
 * @param hasUpdate - Whether a newer approved version is available
 * @param latestVersionId - The newest approved version ID (for update)
 */
export default function InstallButton({
  pluginId,
  pluginVersionId,
  installed,
  hasUpdate,
  latestVersionId,
}: InstallButtonProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  /**
   * Sends an install or uninstall request to the API and refreshes the page on success.
   * @param action - The action to perform: "install" or "uninstall"
   */
  async function handleAction(action: "install" | "uninstall") {
    setLoading(true);
    try {
      const body =
        action === "install"
          ? { action, pluginId, pluginVersionId: latestVersionId ?? pluginVersionId }
          : { action, pluginId };

      const res = await fetch("/api/plugins/install", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({})) as { error?: string };
        console.error("Plugin action failed:", data.error);
      } else {
        router.refresh();
      }
    } finally {
      setLoading(false);
    }
  }

  if (installed) {
    return (
      <div className="flex gap-2">
        {hasUpdate && (
          <button
            onClick={() => handleAction("install")}
            disabled={loading}
            className="px-3 py-1.5 rounded-sm font-mono text-xs tracking-[0.08em] uppercase transition-colors disabled:opacity-50"
            style={{
              background: "var(--color-success-green)",
              color: "#000",
            }}
          >
            {loading ? "..." : "Update"}
          </button>
        )}
        <button
          onClick={() => handleAction("uninstall")}
          disabled={loading}
          className="px-3 py-1.5 rounded-sm font-mono text-xs tracking-[0.08em] uppercase border transition-colors disabled:opacity-50"
          style={{
            borderColor: "rgba(255,75,75,0.4)",
            color: "#ffb4ab",
            background: "transparent",
          }}
        >
          {loading ? "..." : "Odinstaluj"}
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={() => handleAction("install")}
      disabled={loading}
      className="px-3 py-1.5 rounded-sm font-mono text-xs tracking-[0.08em] uppercase transition-colors disabled:opacity-50"
      style={{
        background: "var(--color-primary)",
        color: "var(--color-on-primary)",
      }}
    >
      {loading ? "..." : "Zainstaluj"}
    </button>
  );
}
