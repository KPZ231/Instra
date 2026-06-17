import { verifySession } from "@/lib/auth/dal";
import { renderWidgetsForUser } from "@/lib/plugins/render";
import { BlockRenderer } from "@/components/ui/plugins/BlockRenderer";
import { PluginErrorBoundary } from "@/components/ui/plugins/PluginErrorBoundary";
import { WidgetSlot } from "@prisma/client";

/**
 * Server component that renders all plugin widgets registered for the
 * DASHBOARD_TOP slot for the current authenticated user.
 * Each plugin is wrapped in an error boundary so one failing plugin
 * cannot crash the entire dashboard.
 *
 * @example
 * <DashboardWidgetSlot />
 */
export default async function DashboardWidgetSlot() {
  const { user } = await verifySession();
  const blocks = await renderWidgetsForUser(user.id, WidgetSlot.DASHBOARD_TOP);

  if (blocks.length === 0) {
    return (
      <div
        className="rounded-sm border flex items-center justify-center py-10"
        style={{
          borderColor: "rgba(255,255,255,0.06)",
          borderStyle: "dashed",
        }}
      >
        <div className="text-center">
          <p
            className="font-mono text-xs tracking-[0.1em] uppercase mb-2"
            style={{ color: "var(--color-on-surface-variant)" }}
          >
            // PLUGIN SLOT
          </p>
          <p
            className="font-mono text-xs"
            style={{ color: "var(--color-outline)" }}
          >
            DASHBOARD_TOP — install a plugin to use this slot
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="rounded-sm border p-4"
      style={{ borderColor: "rgba(255,255,255,0.06)" }}
    >
      <p
        className="font-mono text-xs tracking-[0.12em] uppercase mb-3"
        style={{ color: "var(--color-on-surface-variant)" }}
      >
        // PLUGIN SLOT
      </p>
      <PluginErrorBoundary>
        <BlockRenderer blocks={blocks} />
      </PluginErrorBoundary>
    </div>
  );
}
