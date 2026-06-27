"use client";

import Link from "next/link";
import { Lightbulb } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { DailyTip } from "@/features/analytics";

interface DailyTipCardProps {
  tip: DailyTip;
}

const PRIORITY_COLORS: Record<DailyTip["priority"], string> = {
  high:   "#FF4444",
  medium: "var(--color-primary)",
  low:    "var(--color-on-surface-variant)",
};

/**
 * Card showing the daily content improvement tip.
 * Tip text is resolved from i18n keys  no hardcoded strings.
 *
 * @param tip - DailyTip from the analytics engine
 *
 * @example
 * <DailyTipCard tip={overview.dailyTip} />
 */
export default function DailyTipCard({ tip }: DailyTipCardProps) {
  const { t } = useTranslation();
  const color = PRIORITY_COLORS[tip.priority];

  return (
    <div
      className="rounded-sm border p-5 flex flex-col gap-4 h-full"
      style={{
        background: "var(--color-surface-container)",
        borderColor: "rgba(255,255,255,0.08)",
      }}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <p
            className="font-mono text-xs tracking-[0.1em] uppercase mb-0.5"
            style={{ color: "var(--color-on-surface-variant)" }}
          >
            {t("analytics.tip.label")}
          </p>
          <p className="font-sans text-base font-semibold" style={{ color: "var(--color-primary)" }}>
            {t("analytics.tip.title")}
          </p>
        </div>

        {/* Priority badge */}
        <span
          className="font-mono text-[10px] tracking-[0.08em] uppercase px-2 py-0.5 rounded-full border shrink-0 mt-1"
          style={{ color, borderColor: color, opacity: 0.85 }}
        >
          {t(`analytics.tip.priority.${tip.priority}`)}
        </span>
      </div>

      {/* Tip body */}
      <div className="flex items-start gap-3 flex-1">
        <Lightbulb size={16} className="shrink-0 mt-0.5" style={{ color }} />
        <p
          className="font-sans text-sm leading-relaxed"
          style={{ color: "var(--color-primary)" }}
        >
          {t(`analytics.tips.${tip.key}`, tip.params ?? {})}
        </p>
      </div>

      {/* Related post link */}
      {tip.postId && (
        <div className="pt-2 border-t" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
          <Link
            href={`/dashboard/analytics/${tip.postId}`}
            className="font-mono text-xs tracking-[0.08em] uppercase transition-opacity hover:opacity-70"
            style={{ color: "var(--color-on-surface-variant)" }}
          >
            {t("analytics.tip.relatedPost")} →
          </Link>
        </div>
      )}
    </div>
  );
}
