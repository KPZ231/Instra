"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslation } from "react-i18next";
import {
  LayoutDashboard,
  BarChart2,
  CalendarDays,
  Puzzle,
  Zap,
  ShieldCheck,
  Menu,
  X,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
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
 * Navigation component for the dashboard top bar.
 * Desktop: horizontal pill nav. Mobile: hamburger button + left drawer.
 *
 * @param role - Current user's role, used to show admin navigation
 * @example
 * <DashboardSidebar role="ADMIN" />
 */
export default function DashboardSidebar({ role }: DashboardSidebarProps) {
  const { t } = useTranslation();
  const pathname = usePathname();
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Close drawer on navigation
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDrawerOpen(false);
  }, [pathname]);

  // Prevent body scroll when drawer open
  useEffect(() => {
    document.body.style.overflow = drawerOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [drawerOpen]);

  const visibleItems = NAV_ITEMS.filter(
    (item) => !item.adminOnly || role === UserRole.ADMIN
  );

  const navLinkStyle = (isActive: boolean) => ({
    color: isActive ? "var(--color-primary)" : "var(--color-on-surface-variant)",
    background: isActive ? "var(--color-surface-container-high)" : "transparent",
  });

  return (
    <>
      {/* ── Desktop: pill nav ── */}
      <nav
        aria-label="Dashboard navigation"
        className="hidden md:flex items-center gap-0.5 rounded-full border px-1.5 py-1"
        style={{
          background: "var(--color-surface-container-low)",
          borderColor: "rgba(255,255,255,0.08)",
        }}
      >
        {visibleItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive ? "page" : undefined}
              className="flex items-center gap-2 px-3 py-1.5 rounded-full whitespace-nowrap transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30"
              style={navLinkStyle(isActive)}
            >
              <span className="shrink-0">{item.icon}</span>
              <span className="font-mono text-xs tracking-[0.08em] uppercase">
                {t(item.labelKey)}
              </span>
            </Link>
          );
        })}
      </nav>

      {/* ── Mobile: hamburger button ── */}
      <button
        className="flex md:hidden items-center justify-center w-11 h-11 rounded-full transition-colors hover:bg-white/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30"
        style={{ color: "var(--color-on-surface-variant)" }}
        onClick={() => setDrawerOpen(true)}
        aria-label={t("dashboard.nav.openMenu")}
        aria-expanded={drawerOpen}
      >
        <Menu size={20} />
      </button>

      {/* ── Mobile: drawer overlay ── */}
      <AnimatePresence>
        {drawerOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              key="backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-40 bg-black/60 md:hidden"
              onClick={() => setDrawerOpen(false)}
            />

            {/* Drawer panel */}
            <motion.div
              key="drawer"
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ duration: 0.25, ease: "easeOut" }}
              className="fixed top-0 left-0 z-50 h-full w-64 flex flex-col md:hidden"
              style={{
                background: "rgba(10, 11, 9, 0.97)",
                backdropFilter: "blur(24px) saturate(160%)",
                WebkitBackdropFilter: "blur(24px) saturate(160%)",
                borderRight: "1px solid rgba(255,255,255,0.08)",
              }}
            >
              {/* Drawer header */}
              <div
                className="flex items-center justify-between px-4 py-3 shrink-0"
                style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}
              >
                <span
                  className="font-mono text-xs tracking-widest uppercase"
                  style={{ color: "var(--color-on-surface-variant)" }}
                >
                  {'// INSTRA'}
                </span>
                <button
                  onClick={() => setDrawerOpen(false)}
                  aria-label={t("dashboard.nav.closeMenu")}
                  className="flex items-center justify-center w-8 h-8 rounded-full transition-colors hover:bg-white/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30"
                  style={{ color: "var(--color-on-surface-variant)" }}
                >
                  <X size={16} />
                </button>
              </div>

              {/* Nav items */}
              <nav aria-label="Dashboard navigation" className="flex flex-col gap-0.5 p-3 flex-1 overflow-y-auto">
                {visibleItems.map((item) => {
                  const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      aria-current={isActive ? "page" : undefined}
                      className="flex items-center gap-3 px-4 py-3 rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30"
                      style={navLinkStyle(isActive)}
                    >
                      <span className="shrink-0">{item.icon}</span>
                      <span className="font-mono text-xs tracking-[0.08em] uppercase">
                        {t(item.labelKey)}
                      </span>
                    </Link>
                  );
                })}
              </nav>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
