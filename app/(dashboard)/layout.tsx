import { verifySession } from "@/lib/auth/dal";
import DashboardSidebar from "@/components/dashboard/DashboardSidebar";
import DashboardHeader from "@/components/dashboard/DashboardHeader";

/**
 * Dashboard shell — server component.
 * Calls verifySession() which redirects to /login when unauthenticated.
 * Renders a single top bar: logo · pill nav · actions, then full-width main content.
 */
export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user } = await verifySession();

  return (
    <div className="flex flex-col h-dvh overflow-hidden bg-[#000000]">
      {/* ── Top bar ── */}
      <header
        className="flex items-center gap-4 px-4 py-2 shrink-0 border-b"
        style={{
          background: "var(--color-surface-container-lowest)",
          borderColor: "rgba(255,255,255,0.06)",
        }}
      >
        {/* Logo */}
        <span
          className="font-mono text-xs tracking-[0.12em] uppercase shrink-0 select-none"
          style={{ color: "var(--color-on-surface-variant)" }}
        >
          // INSTRA
        </span>

        {/* Pill nav — centred, takes all remaining space */}
        <div className="flex flex-1 justify-center min-w-0">
          <DashboardSidebar role={user.role} />
        </div>

        {/* Actions: search · bell · avatar */}
        <DashboardHeader user={user} />
      </header>

      {/* ── Main content ── */}
      <main className="flex-1 overflow-y-auto p-6 lg:p-8">{children}</main>
    </div>
  );
}
