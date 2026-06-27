"use client";

import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import { useTranslation } from "react-i18next";

/* ── Types ─────────────────────────────────────────────────────── */

interface PluginItem {
  name: string;
  tier: "free" | "pro";
  description: string;
  icon: string;
}


/* ── Framer Motion variants ─────────────────────────────────────── */

const containerVariants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.1, delayChildren: 0.05 },
  },
};

const cardVariants = {
  hidden: { opacity: 0, y: 28 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] as const },
  },
};

const slideLeft = {
  hidden: { opacity: 0, x: -40 },
  visible: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1] as const },
  },
};

/* ── Plugin tier chip ───────────────────────────────────────────── */

/**
 * Renders a small tier badge (FREE / PRO) for a plugin card.
 * @param tier - "free" or "pro" determines the visual style
 */
function TierChip({ tier }: { readonly tier: "free" | "pro" }) {
  return (
    <span
      className={`inline-block font-['JetBrains_Mono'] text-[10px] font-medium tracking-[0.1em] uppercase px-2 py-0.5 rounded-[2px] border ${
        tier === "pro"
          ? "border-white/40 text-white/80 bg-white/[0.06]"
          : "border-white/15 text-on-surface-variant bg-transparent"
      }`}
    >
      {tier === "pro" ? "Pro" : "Free"}
    </span>
  );
}

/* ── Single plugin card ─────────────────────────────────────────── */

/**
 * Stagger-animated plugin card showing name, tier, icon and description.
 * @param plugin - Plugin data object
 */
function PluginCard({ plugin }: { readonly plugin: PluginItem }) {
  return (
    <motion.div
      variants={cardVariants}
      className="group relative flex flex-col gap-4 border border-white/[0.09] bg-surface-container-low p-5 hover:border-white/[0.22] transition-colors duration-300 cursor-default"
    >
      {/* Hover glow */}
      <div className="absolute inset-0 bg-white/[0.02] opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />

      {/* Top row: icon + tier */}
      <div className="relative z-10 flex items-start justify-between gap-3">
        <div
          className="flex items-center justify-center w-9 h-9 border border-white/10 bg-surface-container text-lg select-none"
          aria-hidden="true"
        >
          {plugin.icon}
        </div>
        <TierChip tier={plugin.tier} />
      </div>

      {/* Name */}
      <div className="relative z-10">
        <p
          className="font-['Hanken_Grotesk'] text-base font-semibold text-white leading-snug"
          style={{ letterSpacing: "-0.01em" }}
        >
          {plugin.name}
        </p>
      </div>

      {/* Description */}
      <p className="relative z-10 font-['Hanken_Grotesk'] text-sm text-on-surface-variant leading-relaxed">
        {plugin.description}
      </p>

      {/* Bottom accent bar */}
      <div
        className={`absolute bottom-0 left-0 right-0 h-px transition-opacity duration-300 ${
          plugin.tier === "pro" ? "bg-white/20 opacity-0 group-hover:opacity-100" : "hidden"
        }`}
      />
    </motion.div>
  );
}

/* ── Open-core model diagram ────────────────────────────────────── */

/**
 * Minimal decorative diagram illustrating the open-core + subscription tiers.
 */
function ModelDiagram({ labelFree, labelPro }: { readonly labelFree: string; readonly labelPro: string }) {
  return (
    <div className="flex flex-col gap-2" aria-hidden="true">
      {/* Free tier row */}
      <div className="flex items-center gap-3">
        <div className="w-2 h-2 rounded-full bg-white/30 shrink-0" />
        <div className="flex-1 h-px bg-white/10" />
        <span className="font-['JetBrains_Mono'] text-[10px] tracking-[0.1em] uppercase text-on-surface-variant shrink-0">
          {labelFree}
        </span>
        <div className="flex gap-1">
          {[40, 60, 50, 45, 55].map((w, i) => (
            <div key={i} className="w-5 h-4 bg-white/[0.07] border border-white/[0.06]" style={{ opacity: 0.5 + i * 0.1 }} />
          ))}
        </div>
      </div>

      <div className="w-px h-5 bg-white/10 ml-1" />

      {/* Pro tier row */}
      <div className="flex items-center gap-3">
        <div className="w-2 h-2 rounded-full bg-white/70 shrink-0" />
        <div className="flex-1 h-px bg-white/25" />
        <span className="font-['JetBrains_Mono'] text-[10px] tracking-[0.1em] uppercase text-white shrink-0">
          {labelPro}
        </span>
        <div className="flex gap-1">
          {[40, 60, 50, 45, 55, 52, 48].map((w, i) => (
            <div key={i} className="w-5 h-4 bg-white/[0.14] border border-white/[0.12]" />
          ))}
        </div>
      </div>
    </div>
  );
}

/* ── Main component ─────────────────────────────────────────────── */

/**
 * AboutPlugins section  describes Instra's open-core + subscription plugin model.
 * Left column: editorial prose with model diagram.
 * Right column: stagger-animated plugin card grid.
 *
 * @example
 * <AboutPlugins />
 */
export default function AboutPlugins() {
  const { t } = useTranslation();
  const headerRef = useRef<HTMLDivElement>(null);
  const headerInView = useInView(headerRef, { once: true, margin: "-60px" });
  const gridRef = useRef<HTMLDivElement>(null);
  const gridInView = useInView(gridRef, { once: true, margin: "-80px" });

  const rawPlugins = t("aboutPlugins.plugins", { returnObjects: true });
  const plugins: PluginItem[] = Array.isArray(rawPlugins) ? (rawPlugins as PluginItem[]) : [];

  return (
    <section
      className="relative w-full bg-background overflow-hidden border-t border-white/[0.07]"
      aria-labelledby="about-plugins-heading"
    >
      {/* Noise texture */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.025]"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='300'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='300' height='300' filter='url(%23n)'/%3E%3C/svg%3E\")",
        }}
        aria-hidden="true"
      />

      <div className="relative z-10 max-w-[1280px] mx-auto px-5 md:px-16 py-24 md:py-32">

        {/* ── Section header ───────────────────────────────────────── */}
        <div ref={headerRef} className="mb-16 md:mb-20">
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={headerInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.5 }}
            className="font-['JetBrains_Mono'] text-sm font-medium tracking-[0.05em] uppercase text-on-surface-variant mb-4"
          >
            {t("aboutPlugins.label")}
          </motion.p>

          <motion.h2
            id="about-plugins-heading"
            initial={{ opacity: 0, y: 20 }}
            animate={headerInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.65, delay: 0.08 }}
            className="font-['Hanken_Grotesk'] text-4xl md:text-[56px] font-semibold text-white leading-tight"
            style={{ letterSpacing: "-0.03em" }}
          >
            {t("aboutPlugins.heading")}
          </motion.h2>

          <motion.div
            initial={{ scaleX: 0, originX: 0 }}
            animate={headerInView ? { scaleX: 1 } : {}}
            transition={{ duration: 0.8, delay: 0.3, ease: "easeOut" }}
            className="mt-6 h-px w-24 bg-white/20"
          />
        </div>

        {/* ── Two-column body ──────────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16">

          {/* Left: prose + model diagram */}
          <motion.div
            className="flex flex-col gap-8"
            variants={slideLeft}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-60px" }}
          >
            {/* Lead copy */}
            <p className="font-['Hanken_Grotesk'] text-base md:text-lg leading-[1.8] text-accent-bone text-balance">
              {t("aboutPlugins.body1")}
            </p>

            <p className="font-['Hanken_Grotesk'] text-base leading-[1.8] text-on-surface-variant text-balance">
              {t("aboutPlugins.body2")}
            </p>

            {/* Open-core model breakdown */}
            <div className="border border-white/[0.08] bg-surface-container-low p-6 flex flex-col gap-5">
              <span className="font-['JetBrains_Mono'] text-[11px] tracking-[0.14em] uppercase text-on-surface-variant">
                {t("aboutPlugins.modelLabel")}
              </span>

              <ModelDiagram
                labelFree={t("aboutPlugins.tierFree")}
                labelPro={t("aboutPlugins.tierPro")}
              />

              <p className="font-['Hanken_Grotesk'] text-sm text-on-surface-variant leading-relaxed mt-1">
                {t("aboutPlugins.modelDesc")}
              </p>
            </div>

            {/* Stats row */}
            <div className="grid grid-cols-2 gap-4">
              {(["stat1", "stat2"] as const).map((key) => (
                <div key={key} className="flex flex-col gap-1">
                  <span
                    className="font-['Hanken_Grotesk'] text-3xl font-semibold text-white leading-none"
                    style={{ letterSpacing: "-0.03em" }}
                  >
                    {t(`aboutPlugins.${key}.value`)}
                  </span>
                  <span className="font-['JetBrains_Mono'] text-[11px] tracking-[0.1em] uppercase text-on-surface-variant">
                    {t(`aboutPlugins.${key}.label`)}
                  </span>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Right: staggered plugin card grid */}
          <div ref={gridRef}>
            <motion.div
              className="grid grid-cols-1 sm:grid-cols-2 gap-3"
              variants={containerVariants}
              initial="hidden"
              animate={gridInView ? "visible" : "hidden"}
            >
              {plugins.map((plugin) => (
                <PluginCard key={plugin.name} plugin={plugin} />
              ))}

              {/* "More plugins" placeholder card */}
              <motion.div
                variants={cardVariants}
                className="flex flex-col items-center justify-center gap-2 border border-dashed border-white/[0.12] bg-transparent p-5 text-center col-span-1 sm:col-span-2"
              >
                <span className="font-['JetBrains_Mono'] text-[11px] tracking-[0.1em] uppercase text-on-surface-variant">
                  {t("aboutPlugins.morePlugins")}
                </span>
                <span className="font-['Hanken_Grotesk'] text-xs text-on-surface-variant/60">
                  {t("aboutPlugins.morePluginsHint")}
                </span>
              </motion.div>
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
}
