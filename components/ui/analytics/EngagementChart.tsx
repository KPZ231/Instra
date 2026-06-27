"use client";

import { useState } from "react";
import { useTranslation } from "react-i18next";
import type { MetricDataPoint, EngagementPrediction } from "@/features/analytics";

const RANGES = ["7D", "30D", "90D"] as const;
type Range = (typeof RANGES)[number];

const RANGE_DAYS: Record<Range, number> = { "7D": 7, "30D": 30, "90D": 90 };

const W = 600;
const H = 160;
const PAD = 8;

function buildPoints(data: MetricDataPoint[], width: number, height: number): { x: number; y: number }[] {
  if (data.length === 0) return [];
  const w = width - PAD * 2;
  const h = height - PAD * 2;
  return data.map((p, i) => ({
    x: PAD + (i / Math.max(data.length - 1, 1)) * w,
    y: PAD + h - (p.value / 100) * h,
  }));
}

function pointsToPolyline(pts: { x: number; y: number }[]): string {
  return pts.map((p) => `${p.x},${p.y}`).join(" ");
}

function buildArea(pts: { x: number; y: number }[], height: number): string {
  if (pts.length === 0) return "";
  const bottom = PAD + (height - PAD * 2);
  const first = `${PAD},${bottom}`;
  const last = `${pts[pts.length - 1].x},${bottom}`;
  return `${first} ${pointsToPolyline(pts)} ${last}`;
}

interface EngagementChartProps {
  /** Historical series from lib/api/analytics */
  series: MetricDataPoint[];
  /** Prediction from the heuristic engine */
  prediction: EngagementPrediction;
}

/**
 * SVG area chart showing real engagement data with a dashed prediction line.
 * Inherits the hand-rolled SVG pattern from AnalyticsChart.tsx.
 *
 * @param series     - Historical data points
 * @param prediction - Future predicted data points
 *
 * @example
 * <EngagementChart series={data.series} prediction={data.prediction} />
 */
export default function EngagementChart({ series, prediction }: EngagementChartProps) {
  const { t } = useTranslation();
  const [range, setRange] = useState<Range>("30D");

  const days = RANGE_DAYS[range];
  // eslint-disable-next-line react-hooks/purity
  const cutoff = new Date(Date.now() - days * 86_400_000).toISOString().slice(0, 10);
  const filtered = series.filter((p) => p.date >= cutoff);

  const isEmpty = filtered.length === 0 && prediction.points.length === 0;

  const histPts = buildPoints(filtered, W, H);

  // Merge historical + prediction into one coordinate space for continuity
  const allData: MetricDataPoint[] = [
    ...filtered,
    ...prediction.points.map((p) => ({
      ...p,
      metrics: { likes: 0, comments: 0, shares: 0, clicks: 0 },
    })),
  ];
  const allPts = buildPoints(allData, W, H);
  const predPts = allPts.slice(filtered.length);

  return (
    <div
      className="rounded-sm border flex flex-col"
      style={{
        background: "var(--color-surface-container)",
        borderColor: "rgba(255,255,255,0.08)",
      }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-5 py-4 border-b"
        style={{ borderColor: "rgba(255,255,255,0.06)" }}
      >
        <div>
          <p
            className="font-mono text-xs tracking-[0.1em] uppercase mb-0.5"
            style={{ color: "var(--color-on-surface-variant)" }}
          >
            {t("analytics.chart.label")}
          </p>
          <p className="font-sans text-base font-semibold" style={{ color: "var(--color-primary)" }}>
            {t("analytics.chart.title")}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Confidence badge */}
          <span
            className="font-mono text-[10px] tracking-[0.08em] uppercase px-2 py-0.5 rounded-full border"
            style={{
              color: "var(--color-on-surface-variant)",
              borderColor: "rgba(255,255,255,0.08)",
            }}
          >
            {t(`analytics.chart.confidence.${prediction.confidence}`)}
          </span>

          {/* Range toggles */}
          <div className="flex items-center gap-1">
            {RANGES.map((r) => (
              <button
                key={r}
                onClick={() => setRange(r)}
                className="font-mono text-xs tracking-[0.08em] px-2.5 py-1 rounded-sm border transition-colors"
                style={{
                  color: range === r ? "var(--color-primary)" : "var(--color-on-surface-variant)",
                  background: range === r ? "rgba(255,255,255,0.08)" : "transparent",
                  borderColor: range === r ? "rgba(255,255,255,0.2)" : "rgba(255,255,255,0.08)",
                }}
              >
                {r}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Chart body */}
      <div className="flex-1 px-4 py-4">
        {isEmpty ? (
          <p
            className="font-mono text-xs text-center py-12"
            style={{ color: "var(--color-on-surface-variant)" }}
          >
            {t("analytics.chart.empty")}
          </p>
        ) : (
          <svg
            viewBox={`0 0 ${W} ${H}`}
            className="w-full h-36"
            aria-label={t("analytics.chart.aria")}
            role="img"
          >
            <defs>
              <linearGradient id="engagGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#ffffff" stopOpacity="0.08" />
                <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
              </linearGradient>
              <linearGradient id="predGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#00FF41" stopOpacity="0.06" />
                <stop offset="100%" stopColor="#00FF41" stopOpacity="0" />
              </linearGradient>
            </defs>

            {/* Grid lines */}
            {[25, 50, 75].map((pct) => {
              const y = PAD + (H - PAD * 2) - (pct / 100) * (H - PAD * 2);
              return (
                <line key={pct} x1={PAD} y1={y} x2={W - PAD} y2={y}
                  stroke="rgba(255,255,255,0.05)" strokeWidth={1} />
              );
            })}

            {/* Historical area */}
            {histPts.length > 0 && (
              <polygon points={buildArea(histPts, H)} fill="url(#engagGrad)" />
            )}

            {/* Historical line */}
            {histPts.length > 1 && (
              <polyline points={pointsToPolyline(histPts)} fill="none"
                stroke="rgba(255,255,255,0.7)" strokeWidth={1.5}
                strokeLinejoin="round" strokeLinecap="round" />
            )}

            {/* Prediction area */}
            {predPts.length > 0 && (
              <polygon points={buildArea(predPts, H)} fill="url(#predGrad)" />
            )}

            {/* Prediction line  dashed green */}
            {predPts.length > 1 && (
              <polyline points={pointsToPolyline(predPts)} fill="none"
                stroke="#00FF41" strokeWidth={1.5} strokeDasharray="4 3"
                strokeLinejoin="round" strokeLinecap="round" opacity={0.7} />
            )}

            {/* Last historical point dot */}
            {histPts.length > 0 && (() => {
              const last = histPts[histPts.length - 1];
              return <circle cx={last.x} cy={last.y} r={3} fill="#ffffff" />;
            })()}

            {/* First prediction point dot */}
            {predPts.length > 0 && (() => {
              const first = predPts[0];
              return <circle cx={first.x} cy={first.y} r={3} fill="#00FF41" opacity={0.8} />;
            })()}
          </svg>
        )}

        {/* Legend */}
        {!isEmpty && (
          <div className="flex items-center gap-4 mt-2 px-2">
            <div className="flex items-center gap-1.5">
              <div className="w-4 h-px" style={{ background: "rgba(255,255,255,0.7)" }} />
              <span className="font-mono text-[10px]" style={{ color: "var(--color-on-surface-variant)" }}>
                {t("dashboard.chart.label")}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-4 h-px border-t border-dashed" style={{ borderColor: "#00FF41", opacity: 0.7 }} />
              <span className="font-mono text-[10px]" style={{ color: "#00FF41", opacity: 0.8 }}>
                {t("analytics.chart.prediction")}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
