"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslation } from "react-i18next";
import {
  LayoutDashboard,
  BarChart2,
  CalendarDays,
  Puzzle,
  Settings,
  Zap,
  ShieldCheck,
  Share2,
} from "lucide-react";
import { UserRole } from "@/types/auth";

interface NavItem {
  href: string;
  labelKey: string;
  icon: React.ReactNode;
  adminOnly?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", labelKey: "dashboard.nav.overview", icon: <LayoutDashboard size={18} /> },
  { href: "/dashboard/analytics", labelKey: "dashboard.nav.analytics", icon: <BarChart2 size={18} /> },
  { href: "/dashboard/campaigns", labelKey: "dashboard.nav.campaigns", icon: <Zap size={18} /> },
  { href: "/dashboard/schedule", labelKey: "dashboard.nav.schedule", icon: <CalendarDays size={18} /> },
  { href: "/dashboard/plugins", labelKey: "dashboard.nav.plugins", icon: <Puzzle size={18} /> },
  { href: "/dashboard/settings", labelKey: "dashboard.nav.settings", icon: <Settings size={18} /> },
  { href: "/dashboard/settings/social", labelKey: "dashboard.nav.social", icon: <Share2 size={18} /> },
  { href: "/dashboard/admin/plugins", labelKey: "dashboard.adminNav", icon: <ShieldCheck size={18} />, adminOnly: true },
];

interface DashboardSidebarProps {
  role?: UserRole;
}

/**
 * Fixed left sidebar for the dashboard shell.
 * Highlights the active route via usePathname.
 * Shows admin link when role === 'ADMIN'.
 *
 * @param role - Current user's role, used to show admin navigation
 * @example
 * <DashboardSidebar role="ADMIN" />
 */
export default function DashboardSidebar({ role }: DashboardSidebarProps) {
  const { t } = useTranslation();
  const pathname = usePathname();

  const visibleItems = NAV_ITEMS.filter(
    (item) => !item.adminOnly || role === UserRole.ADMIN
  );

  return (
    <aside
      className="hidden lg:flex flex-col w-60 shrink-0 border-r"
      style={{
        background: "var(--color-surface-container-lowest)",
        borderColor: "rgba(255,255,255,0.06)",
      }}
    >
      {/* Logo */}
      <div
        className="flex items-center gap-2 px-6 py-5 border-b"
        style={{ borderColor: "rgba(255,255,255,0.06)" }}
      >
        <span
          className="font-mono text-xs tracking-[0.12em] uppercase"
          style={{ color: "var(--color-on-surface-variant)" }}
        >
          // INSTRA
        </span>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {visibleItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-3 px-3 py-2.5 rounded-sm text-sm transition-colors group relative"
              style={{
                color: isActive ? "var(--color-primary)" : "var(--color-on-surface-variant)",
                background: isActive ? "rgba(255,255,255,0.05)" : "transparent",
              }}
            >
              {isActive && (
                <span
                  className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 rounded-r"
                  style={{ background: "var(--color-primary)" }}
                />
              )}
              <span className="shrink-0">{item.icon}</span>
              <span className="font-mono text-xs tracking-[0.08em] uppercase">
                {t(item.labelKey)}
              </span>
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div
        className="px-6 py-4 border-t"
        style={{ borderColor: "rgba(255,255,255,0.06)" }}
      >
        <p
          className="font-mono text-xs tracking-[0.05em]"
          style={{ color: "var(--color-on-surface-variant)" }}
        >
          v0.1.0-alpha
        </p>
      </div>
    </aside>
  );
}
