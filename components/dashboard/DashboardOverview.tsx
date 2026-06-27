"use client";

import { useTranslation } from "react-i18next";
import { motion, type Variants } from "framer-motion";
import StatCard from "@/components/dashboard/StatCard";
import AnalyticsChart from "@/components/dashboard/AnalyticsChart";
import ActivityFeed from "@/components/dashboard/ActivityFeed";
import QuickActions from "@/components/dashboard/QuickActions";
import type { DashboardMetrics } from "@/lib/api/dashboardMetrics";

interface DashboardOverviewProps {
  /** Metrics payload from getDashboardMetrics() */
  metrics: DashboardMetrics;
}

const stagger: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06 } },
};

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.3, ease: [0.22, 1, 0.36, 1] } },
};

/**
 * Dashboard overview  assembles the full bento-grid layout with KPI cards,
 * analytics chart, activity feed, and quick-action panel.
 * Receives real metrics from the server component to avoid any client-side
 * data fetching.
 *
 * @param metrics - Dashboard metrics payload from getDashboardMetrics()
 *
 * @example
 * <DashboardOverview metrics={metrics} />
 */
export default function DashboardOverview({ metrics }: DashboardOverviewProps) {
  const { t } = useTranslation();

  return (
    <div className="space-y-6">
      {/* Page title */}
      <div>
        <p
          className="font-mono text-xs tracking-[0.12em] uppercase mb-1"
          style={{ color: "var(--color-on-surface-variant)" }}
        >
          {t("dashboard.overview.label")}
        </p>
        <h1
          className="font-sans text-2xl font-semibold leading-tight"
          style={{ color: "var(--color-primary)" }}
        >
          {t("dashboard.overview.heading")}
        </h1>
      </div>

      {/* Row 1  Stat cards */}
      <motion.div
        className="grid grid-cols-2 lg:grid-cols-4 gap-4"
        variants={stagger}
        initial="hidden"
        animate="show"
      >
        {metrics.stats.map((s) => (
          <motion.div key={s.id} variants={fadeUp}>
            <StatCard
              label={t(s.labelKey)}
              value={s.value}
              delta={s.delta}
              deltaLabel={t(s.deltaLabelKey)}
            />
          </motion.div>
        ))}
      </motion.div>

      {/* Row 2  Chart + Activity */}
      <motion.div
        className="grid grid-cols-1 lg:grid-cols-4 gap-4"
        variants={stagger}
        initial="hidden"
        animate="show"
      >
        <motion.div className="lg:col-span-3" variants={fadeUp}>
          <AnalyticsChart series={metrics.chartSeries} />
        </motion.div>
        <motion.div className="lg:col-span-1" variants={fadeUp}>
          <ActivityFeed items={metrics.activity} />
        </motion.div>
      </motion.div>

      {/* Row 3  Quick actions */}
      <motion.div
        className="grid grid-cols-1 gap-4"
        variants={stagger}
        initial="hidden"
        animate="show"
      >
        <motion.div variants={fadeUp}>
          <QuickActions />
        </motion.div>
      </motion.div>
    </div>
  );
}
