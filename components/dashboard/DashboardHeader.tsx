"use client";

import { useTranslation } from "react-i18next";
import { Bell, Search } from "lucide-react";
import type { SessionUser } from "@/types/auth";

interface DashboardHeaderProps {
  user: SessionUser;
}

/**
 * Top-bar action group — search trigger, notifications bell, and user avatar.
 * Rendered inside the shared top bar of the dashboard shell alongside the pill nav.
 *
 * @param user - The current authenticated session user.
 * @example
 * <DashboardHeader user={session.user} />
 */
export default function DashboardHeader({ user }: DashboardHeaderProps) {
  const { t } = useTranslation();
  const initials = user.name
    ? user.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : user.email?.[0]?.toUpperCase() ?? "U";

  return (
    <div className="flex items-center gap-3 shrink-0">
      {/* Search trigger */}
      <button
        aria-label={t("dashboard.header.search")}
        className="flex items-center gap-2 px-3 py-1.5 rounded-full border transition-colors hover:bg-white/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30"
        style={{
          background: "var(--color-surface-container-low)",
          borderColor: "rgba(255,255,255,0.08)",
          color: "var(--color-on-surface-variant)",
        }}
      >
        <Search size={14} />
        <span
          className="font-mono text-xs tracking-[0.05em] hidden sm:inline"
          style={{ color: "var(--color-on-surface-variant)" }}
        >
          {t("dashboard.header.search")}
        </span>
      </button>

      {/* Notifications */}
      <button
        aria-label={t("dashboard.header.notifications")}
        className="relative flex items-center justify-center w-9 h-9 rounded-full border transition-colors hover:bg-white/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30"
        style={{
          background: "var(--color-surface-container-low)",
          borderColor: "rgba(255,255,255,0.08)",
        }}
      >
        <Bell size={16} style={{ color: "var(--color-on-surface-variant)" }} />
        <span
          aria-hidden="true"
          className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full"
          style={{ background: "#00FF41" }}
        />
      </button>

      {/* Avatar */}
      <div
        className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-mono font-medium tracking-wide select-none shrink-0"
        style={{
          background: "var(--color-surface-container-high)",
          color: "var(--color-primary)",
          border: "1px solid rgba(255,255,255,0.1)",
        }}
        title={user.name ?? user.email ?? ""}
        aria-label={user.name ?? user.email ?? "User"}
      >
        {initials}
      </div>
    </div>
  );
}
