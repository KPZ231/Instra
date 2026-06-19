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
  {
    href: "/dashboard",
    labelKey: "dashboard.nav.overview",
    icon: <LayoutDashboard size={16} />,
  },
  {
    href: "/dashboard/analytics",
    labelKey: "dashboard.nav.analytics",
    icon: <BarChart2 size={16} />,
  },
  {
    href: "/dashboard/campaigns",
    labelKey: "dashboard.nav.campaigns",
    icon: <Zap size={16} />,
  },
  {
    href: "/dashboard/schedule",
    labelKey: "dashboard.nav.schedule",
    icon: <CalendarDays size={16} />,
  },
  {
    href: "/dashboard/plugins",
    labelKey: "dashboard.nav.plugins",
    icon: <Puzzle size={16} />,
  },
  {
    href: "/dashboard/settings",
    labelKey: "dashboard.nav.settings",
    icon: <Settings size={16} />,
  },
  {
    href: "/dashboard/settings/social",
    labelKey: "dashboard.nav.social",
    icon: <Share2 size={16} />,
  },
  {
    href: "/dashboard/admin/plugins",
    labelKey: "dashboard.adminNav",
    icon: <ShieldCheck size={16} />,
    adminOnly: true,
  },
];

interface DashboardSidebarProps {
  role?: UserRole;
}

/**
 * Horizontal pill navigation bar for the dashboard top bar.
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
    <nav
      aria-label="Dashboard navigation"
      className="flex items-center gap-0.5 rounded-full border px-1.5 py-1"
      style={{
        background: "var(--color-surface-container-low)",
        borderColor: "rgba(255,255,255,0.08)",
      }}
    >
      {visibleItems.map((item) => {
        const isActive =
          pathname === item.href || pathname.startsWith(item.href + "/");
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={isActive ? "page" : undefined}
            className="flex items-center gap-2 px-3 py-1.5 rounded-full whitespace-nowrap transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30"
            style={{
              color: isActive
                ? "var(--color-primary)"
                : "var(--color-on-surface-variant)",
              background: isActive
                ? "var(--color-surface-container-high)"
                : "transparent",
            }}
          >
            <span className="shrink-0">{item.icon}</span>
            <span className="font-mono text-xs tracking-[0.08em] uppercase">
              {t(item.labelKey)}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
