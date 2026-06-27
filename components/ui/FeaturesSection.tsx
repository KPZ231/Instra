"use client";

import Image from "next/image";
import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import { useTranslation } from "react-i18next";

/* ── Types ─────────────────────────────────────────────────────── */

interface FeatureItem {
  id: string;
  icon: string;
  title: string;
  description: string;
  /** Optional image path, e.g. "/images/features/ai-content.png" */
  image?: string;
}

/* ── Constants ──────────────────────────────────────────────────── */

const CLIP_SM = "polygon(0 0, calc(100% - 14px) 0, 100% 14px, 100% 100%, 14px 100%, 0 calc(100% - 14px))";
const CLIP_LG = "polygon(0 0, calc(100% - 24px) 0, 100% 24px, 100% 100%, 24px 100%, 0 calc(100% - 24px))";

/* ── Framer Motion variants ─────────────────────────────────────── */

const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08, delayChildren: 0.05 } },
};

const cardVariants = {
  hidden: { opacity: 0, y: 28 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] as const },
  },
};

const headerVariants = {
  hidden: { opacity: 0, y: 18 },
  visible: (delay: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, delay, ease: [0.22, 1, 0.36, 1] as const },
  }),
};

/* ── Small feature card ─────────────────────────────────────────── */

/**
 * Small feature tile with cut-corner clip-path, optional image, and hover glow.
 * @param feature - Feature data object
 */
function FeatureCard({ feature }: { readonly feature: FeatureItem }) {
  return (
    <motion.article
      variants={cardVariants}
      className="group relative flex flex-col gap-3 p-5 cursor-default overflow-hidden"
      style={{ clipPath: CLIP_SM }}
    >
      {/* Background */}
      <div
        className="absolute inset-0 bg-surface-container-low border border-white/[0.09] transition-colors duration-300 group-hover:border-white/[0.22]"
        style={{ clipPath: CLIP_SM }}
        aria-hidden="true"
      />
      {/* Hover glow */}
      <div
        className="absolute inset-0 bg-white/[0.025] opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
        aria-hidden="true"
      />

      {/* Optional image */}
      {feature.image && (
        <div className="relative z-10 w-full h-32 overflow-hidden -mx-5 -mt-5 mb-1" style={{ width: "calc(100% + 2.5rem)" }}>
          <Image
            src={feature.image}
            alt={feature.title}
            fill
            className="object-cover opacity-60 group-hover:opacity-80 transition-opacity duration-300"
            sizes="(max-width: 768px) 100vw, 400px"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent to-surface-container-low" aria-hidden="true" />
        </div>
      )}

      {/* Icon + title row */}
      <div className="relative z-10 flex items-start gap-3">
        <div
          className="flex items-center justify-center w-9 h-9 shrink-0 border border-white/10 bg-surface-container text-lg select-none"
          aria-hidden="true"
        >
          {feature.icon}
        </div>
        <h3
          className="font-['Hanken_Grotesk'] text-sm font-semibold text-white leading-snug pt-1.5"
          style={{ letterSpacing: "-0.01em" }}
        >
          {feature.title}
        </h3>
      </div>

      {/* Description */}
      <p className="relative z-10 font-['Hanken_Grotesk'] text-sm text-on-surface-variant leading-relaxed">
        {feature.description}
      </p>
    </motion.article>
  );
}

/* ── Hero feature card ──────────────────────────────────────────── */

/**
 * Large hero card that fills the full height of the right-side grid.
 * Renders an optional image in the centre area.
 * @param feature - Feature data object
 */
function HeroFeatureCard({ feature }: { readonly feature: FeatureItem }) {
  return (
    <motion.article
      variants={cardVariants}
      className="group relative flex flex-col gap-0 cursor-default overflow-hidden h-full"
      style={{ clipPath: CLIP_LG }}
    >
      {/* Background */}
      <div
        className="absolute inset-0 bg-surface-container border border-white/[0.12] transition-colors duration-300 group-hover:border-white/[0.28]"
        style={{ clipPath: CLIP_LG }}
        aria-hidden="true"
      />
      {/* Diagonal gradient */}
      <div
        className="absolute inset-0 opacity-[0.035] pointer-events-none"
        style={{ background: "linear-gradient(135deg, #fff 0%, transparent 50%)" }}
        aria-hidden="true"
      />
      {/* Hover glow */}
      <div
        className="absolute inset-0 bg-white/[0.025] opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
        aria-hidden="true"
      />

      {/* Top: icon */}
      <div className="relative z-10 p-7 pb-0">
        <div
          className="flex items-center justify-center w-12 h-12 border border-white/15 bg-surface-container-high text-2xl select-none"
          aria-hidden="true"
        >
          {feature.icon}
        </div>
      </div>

      {/* Middle: image or decorative fill */}
      <div className="relative z-10 flex-1 mx-7 my-6 overflow-hidden min-h-[140px]">
        {feature.image ? (
          <div className="relative w-full h-full rounded-none overflow-hidden">
            <Image
              src={feature.image}
              alt={feature.title}
              fill
              className="object-cover opacity-55 group-hover:opacity-75 transition-opacity duration-300"
              sizes="(max-width: 1024px) 100vw, 480px"
            />
            <div
              className="absolute inset-0"
              style={{ background: "linear-gradient(to bottom, transparent 40%, var(--color-surface-container, #1f201c))" }}
              aria-hidden="true"
            />
          </div>
        ) : (
          /* Decorative abstract grid when no image */
          <div className="w-full h-full border border-white/[0.06] bg-surface-container-lowest relative overflow-hidden">
            <div
              className="absolute inset-0 opacity-[0.04]"
              style={{
                backgroundImage: "linear-gradient(to right, #fff 1px, transparent 1px), linear-gradient(to bottom, #fff 1px, transparent 1px)",
                backgroundSize: "28px 28px",
              }}
              aria-hidden="true"
            />
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_50%_50%,rgba(255,255,255,0.04),transparent)]" aria-hidden="true" />
          </div>
        )}
      </div>

      {/* Bottom: copy */}
      <div className="relative z-10 p-7 pt-0 flex flex-col gap-2">
        <h3
          className="font-['Hanken_Grotesk'] text-2xl font-semibold text-white leading-tight"
          style={{ letterSpacing: "-0.025em" }}
        >
          {feature.title}
        </h3>
        <p className="font-['Hanken_Grotesk'] text-sm text-on-surface-variant leading-relaxed max-w-[32ch]">
          {feature.description}
        </p>
      </div>

      {/* Corner notch accent */}
      <div
        className="absolute top-0 right-0 w-6 h-px bg-white/15"
        style={{ transform: "rotate(45deg) translateY(17px) translateX(3px)" }}
        aria-hidden="true"
      />
    </motion.article>
  );
}

/* ── Main component ─────────────────────────────────────────────── */

/**
 * FeaturesSection  bento layout with a tall hero card on the left and a
 * 2-column grid of smaller cards on the right. Supports optional images per card.
 * Entrance: stagger on scroll via useInView.
 *
 * @example
 * <FeaturesSection />
 */
export default function FeaturesSection() {
  const { t } = useTranslation();
  const headerRef = useRef<HTMLDivElement>(null);
  const headerInView = useInView(headerRef, { once: true, margin: "-60px" });
  const gridRef = useRef<HTMLDivElement>(null);
  const gridInView = useInView(gridRef, { once: true, margin: "-80px" });

  const rawFeatures = t("featuresSection.features", { returnObjects: true });
  const features: FeatureItem[] = Array.isArray(rawFeatures) ? (rawFeatures as FeatureItem[]) : [];
  const [heroFeature, ...restFeatures] = features;

  return (
    <section
      className="relative w-full bg-background overflow-hidden border-t border-white/[0.07]"
      aria-labelledby="features-section-heading"
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

        {/* ── Section header ─────────────────────────────────────── */}
        <div ref={headerRef} className="mb-14 md:mb-18">
          <motion.p
            custom={0}
            variants={headerVariants}
            initial="hidden"
            animate={headerInView ? "visible" : "hidden"}
            className="font-['JetBrains_Mono'] text-sm font-medium tracking-[0.06em] uppercase text-on-surface-variant mb-4"
          >
            {t("featuresSection.label")}
          </motion.p>

          <motion.h2
            id="features-section-heading"
            custom={0.08}
            variants={headerVariants}
            initial="hidden"
            animate={headerInView ? "visible" : "hidden"}
            className="font-['Hanken_Grotesk'] text-4xl md:text-[52px] font-semibold text-white leading-tight"
            style={{ letterSpacing: "-0.03em" }}
          >
            {t("featuresSection.heading")}
          </motion.h2>

          <motion.div
            initial={{ scaleX: 0, originX: 0 }}
            animate={headerInView ? { scaleX: 1 } : {}}
            transition={{ duration: 0.75, delay: 0.28, ease: "easeOut" }}
            className="mt-5 h-px w-20 bg-white/20"
          />
        </div>

        {/* ── Bento layout ───────────────────────────────────────── */}
        {/*
          Structure:
            [  Hero (left ~38%)  ] [  2-col grid (right ~62%)  ]
          On mobile / tablet: stacked single column.
        */}
        <div ref={gridRef}>
          <motion.div
            className="flex flex-col lg:flex-row gap-3"
            variants={containerVariants}
            initial="hidden"
            animate={gridInView ? "visible" : "hidden"}
          >
            {/* Hero card  fixed width on lg, full height */}
            {heroFeature && (
              <div className="w-full lg:w-[38%] lg:shrink-0">
                <HeroFeatureCard feature={heroFeature} />
              </div>
            )}

            {/* Remaining cards  2-column grid */}
            <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-3 content-start">
              {restFeatures.map((feature) => (
                <FeatureCard key={feature.id} feature={feature} />
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
