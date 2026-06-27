"use client";

import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import { useTranslation } from "react-i18next";

interface WhyUsStatItem {
  value: string;
  description: string;
}

/**
 * Single stat row  full-width card with description on the left and large percentage on the right.
 * Animates in from below on scroll with a staggered delay.
 *
 * @param item     - Stat data: value string and description text
 * @param index    - Position used for stagger entrance delay
 */
function StatRow({ item, index }: { item: WhyUsStatItem; index: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-60px" });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 32 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.55, ease: "easeOut", delay: index * 0.13 }}
      className="relative flex items-center justify-between gap-6 rounded-lg border border-white/10 bg-white/5 px-8 py-7 overflow-hidden group hover:border-white/25 transition-colors duration-300"
    >
      {/* Subtle hover glow */}
      <motion.div
        className="absolute inset-0 bg-white/[0.03] pointer-events-none"
        initial={{ opacity: 0 }}
        whileHover={{ opacity: 1 }}
        transition={{ duration: 0.25 }}
      />

      {/* Left: animated entry line + description */}
      <div className="relative z-10 flex items-center gap-5 min-w-0">
        {/* Vertical accent bar */}
        <motion.div
          className="shrink-0 w-px bg-white/30 self-stretch"
          initial={{ scaleY: 0, originY: 0 }}
          animate={isInView ? { scaleY: 1 } : {}}
          transition={{ duration: 0.5, ease: "easeOut", delay: index * 0.13 + 0.2 }}
        />

        <p
          className="font-['Hanken_Grotesk'] text-base md:text-lg leading-snug text-on-surface-variant"
          style={{ letterSpacing: "0em" }}
        >
          {item.description}
        </p>
      </div>

      {/* Right: large percentage value */}
      <motion.span
        className="shrink-0 font-['Hanken_Grotesk'] font-semibold text-white select-none"
        style={{
          fontSize: "clamp(3rem, 6vw, 5rem)",
          letterSpacing: "-0.04em",
          lineHeight: 1,
        }}
        initial={{ opacity: 0, x: 20 }}
        animate={isInView ? { opacity: 1, x: 0 } : {}}
        transition={{ duration: 0.6, ease: "easeOut", delay: index * 0.13 + 0.15 }}
        aria-label={item.value}
      >
        {item.value}
      </motion.span>
    </motion.div>
  );
}

/**
 * WhyUs section  showcases key platform statistics as bold full-width stat cards,
 * matching the high-contrast dark design system with scroll-triggered animations.
 *
 * @example
 * <WhyUs />
 */
export default function WhyUs() {
  const { t } = useTranslation();
  const headerRef = useRef<HTMLDivElement>(null);
  const headerInView = useInView(headerRef, { once: true, margin: "-60px" });

  const rawItems = t("whyUs.items", { returnObjects: true });
  const items: WhyUsStatItem[] = Array.isArray(rawItems) ? (rawItems as WhyUsStatItem[]) : [];

  return (
    <section className="relative w-full bg-surface-container-lowest py-24 md:py-32 overflow-hidden">
      {/* Background noise */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.03]"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='300'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='300' height='300' filter='url(%23n)'/%3E%3C/svg%3E\")",
        }}
        aria-hidden="true"
      />

      <div className="relative z-10 max-w-[1280px] mx-auto px-5 md:px-16">
        {/* Section header */}
        <div ref={headerRef} className="mb-14 md:mb-18">
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={headerInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.5 }}
            className="font-['JetBrains_Mono'] text-sm font-medium tracking-[0.05em] uppercase text-on-surface-variant mb-4"
          >
            {t("whyUs.label")}
          </motion.p>

          <motion.h2
            initial={{ opacity: 0, y: 16 }}
            animate={headerInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="font-['Hanken_Grotesk'] text-4xl md:text-[56px] font-semibold text-white leading-tight"
            style={{ letterSpacing: "-0.03em" }}
          >
            {t("whyUs.heading")}
          </motion.h2>

          <motion.div
            initial={{ scaleX: 0, originX: 0 }}
            animate={headerInView ? { scaleX: 1 } : {}}
            transition={{ duration: 0.8, delay: 0.3, ease: "easeOut" }}
            className="mt-6 h-px w-24 bg-white/20"
          />
        </div>

        {/* Stat rows */}
        <div className="flex flex-col gap-4">
          {items.map((item, i) => (
            <StatRow key={i} item={item} index={i} />
          ))}
        </div>
      </div>
    </section>
  );
}
