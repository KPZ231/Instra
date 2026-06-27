"use client";

import { motion } from "framer-motion";
import { TrendingUp, TrendingDown } from "lucide-react";
import { useTranslation } from "react-i18next";

interface StatCardProps {
  /** Metric name (already translated) */
  label: string;
  /** Formatted value string, or null when data is unavailable (renders "") */
  value: string | null;
  /** Percentage change  positive = up, negative = down, null = hidden */
  delta: number | null;
  /** Human-readable delta context (already translated) */
  deltaLabel: string;
}

/**
 * KPI metric card for the dashboard stats row.
 * Shows a large value, a label, and an optional positive/negative delta indicator.
 * When `value` is null the card renders a "" placeholder without a trend row.
 *
 * @param label      - Metric name (e.g. "Total Likes")
 * @param value      - Formatted value string (e.g. "1.2K"), or null
 * @param delta      - Percentage change (positive = up, negative = down), or null
 * @param deltaLabel - Human-readable delta context (e.g. "vs last week")
 *
 * @example
 * <StatCard label="Total Likes" value="1.2K" delta={12.4} deltaLabel="vs last week" />
 * <StatCard label="Total Reach" value={null} delta={null} deltaLabel="vs last week" />
 */
export default function StatCard({ label, value, delta, deltaLabel }: StatCardProps) {
  const { t } = useTranslation();
  const isPositive = delta !== null && delta >= 0;
  const hasData = value !== null;
  const hasDelta = delta !== null;

  return (
    <motion.div
      className="rounded-sm p-5 flex flex-col gap-3 border group transition-colors"
      style={{
        background: "var(--color-surface-container)",
        borderColor: "rgba(255,255,255,0.08)",
      }}
      whileHover={{ borderColor: "rgba(255,255,255,0.2)" }}
      transition={{ duration: 0.15 }}
    >
      <p
        className="font-mono text-xs tracking-[0.1em] uppercase"
        style={{ color: "var(--color-on-surface-variant)" }}
      >
        {label}
      </p>

      <p
        className="font-sans text-3xl font-semibold leading-none tracking-tight tabular-nums"
        style={{ color: hasData ? "var(--color-primary)" : "var(--color-on-surface-variant)" }}
      >
        {hasData ? value : ""}
      </p>

      {hasDelta ? (
        <div className="flex items-center gap-1.5">
          {isPositive ? (
            <TrendingUp size={12} style={{ color: "#00FF41" }} />
          ) : (
            <TrendingDown size={12} style={{ color: "var(--color-on-surface-variant)" }} />
          )}
          <span
            className="font-mono text-xs tabular-nums"
            style={{ color: isPositive ? "#00FF41" : "var(--color-on-surface-variant)" }}
          >
            {isPositive ? "+" : ""}{delta}%
          </span>
          <span
            className="font-mono text-xs"
            style={{ color: "var(--color-on-surface-variant)" }}
          >
            {deltaLabel}
          </span>
        </div>
      ) : (
        <p
          className="font-mono text-xs"
          style={{ color: "var(--color-on-surface-variant)", opacity: 0.5 }}
        >
          {t("dashboard.stats.noData")}
        </p>
      )}
    </motion.div>
  );
}
