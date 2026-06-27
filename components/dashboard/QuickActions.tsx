"use client";

import Link from "next/link";
import { useTranslation } from "react-i18next";
import { FilePlus, Zap, BarChart2, Puzzle } from "lucide-react";

interface QuickActionDef {
  id: string;
  icon: React.ReactNode;
  labelKey: string;
  /** href to navigate to  undefined means the action is not yet available */
  href?: string;
}

const ACTIONS: QuickActionDef[] = [
  { id: "new-post",      icon: <FilePlus size={15} />, labelKey: "dashboard.quickActions.newPost",     href: "/dashboard/posts/new" },
  { id: "add-plugin",    icon: <Puzzle size={15} />,   labelKey: "dashboard.quickActions.addPlugin",   href: "/dashboard/plugins" },
  { id: "new-campaign",  icon: <Zap size={15} />,      labelKey: "dashboard.quickActions.newCampaign", href: "/dashboard/campaigns/new" },
  { id: "view-report",   icon: <BarChart2 size={15} />, labelKey: "dashboard.quickActions.viewReport",  href: "/dashboard/reports" },
];

/**
 * Quick-action button grid for common dashboard tasks.
 * Actions with a known `href` render as Next.js Links; others render as
 * disabled buttons with reduced opacity to signal they are coming soon.
 *
 * @example
 * <QuickActions />
 */
export default function QuickActions() {
  const { t } = useTranslation();

  return (
    <div
      className="rounded-sm border"
      style={{
        background: "var(--color-surface-container)",
        borderColor: "rgba(255,255,255,0.08)",
      }}
    >
      <div
        className="px-5 py-4 border-b"
        style={{ borderColor: "rgba(255,255,255,0.06)" }}
      >
        <p
          className="font-mono text-xs tracking-[0.1em] uppercase mb-0.5"
          style={{ color: "var(--color-on-surface-variant)" }}
        >
          {t("dashboard.quickActions.label")}
        </p>
        <p className="font-sans text-base font-semibold" style={{ color: "var(--color-primary)" }}>
          {t("dashboard.quickActions.title")}
        </p>
      </div>

      <div className="p-5 grid grid-cols-2 gap-2">
        {ACTIONS.map((action) => {
          const sharedClassName =
            "flex items-center gap-2 px-3 py-2.5 rounded-sm border text-left transition-colors";
          const sharedStyle = {
            color: "var(--color-secondary)",
            borderColor: "rgba(203,198,188,0.2)",
          };
          const label = (
            <>
              <span className="shrink-0">{action.icon}</span>
              <span className="font-mono text-xs tracking-[0.05em]">{t(action.labelKey)}</span>
            </>
          );

          if (action.href) {
            return (
              <Link
                key={action.id}
                href={action.href}
                className={`${sharedClassName} hover:bg-white/5 cursor-pointer`}
                style={sharedStyle}
              >
                {label}
              </Link>
            );
          }

          return (
            <button
              key={action.id}
              disabled
              aria-disabled="true"
              className={`${sharedClassName} opacity-40 cursor-not-allowed`}
              style={sharedStyle}
            >
              {label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
