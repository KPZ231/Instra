"use client";

import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import { useTranslation } from "react-i18next";
import { FiCompass, FiDownload, FiLink2, FiZap } from "react-icons/fi";
import type { ElementType } from "react";

/* ── Types ─────────────────────────────────────────────────────── */

interface HowItWorksStep {
  title: string;
  body: string;
}

/* ── Constants ──────────────────────────────────────────────────── */

const CLIP = "polygon(0 0, calc(100% - 20px) 0, 100% 20px, 100% 100%, 20px 100%, 0 calc(100% - 20px))";

const STEP_ICONS: ElementType[] = [FiCompass, FiDownload, FiLink2, FiZap];

/* ── Framer Motion variants ─────────────────────────────────────── */

const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.12, delayChildren: 0.05 } },
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

/* ── Main component ─────────────────────────────────────────────── */

/**
 * HowItWorksSection  2×2 bento grid of 4 numbered steps explaining
 * how Instra's plugin workflow operates. Ghost numbers, staggered entrance.
 *
 * @example
 * <HowItWorksSection />
 */
export default function HowItWorksSection() {
  const { t } = useTranslation();
  const headerRef = useRef<HTMLDivElement>(null);
  const headerInView = useInView(headerRef, { once: true, margin: "-60px" });
  const gridRef = useRef<HTMLDivElement>(null);
  const gridInView = useInView(gridRef, { once: true, margin: "-80px" });

  const rawSteps = t("usecaseHowItWorks.steps", { returnObjects: true });
  const steps: HowItWorksStep[] = Array.isArray(rawSteps) ? (rawSteps as HowItWorksStep[]) : [];

  return (
    <section
      className="relative w-full bg-background overflow-hidden border-t border-white/[0.07]"
      aria-labelledby="how-it-works-heading"
    >
      <div className="relative z-10 max-w-[1280px] mx-auto px-5 md:px-16 py-24 md:py-32">

        {/* ── Section header ─────────────────────────────────────── */}
        <div ref={headerRef} className="mb-14">
          <motion.p
            custom={0}
            variants={headerVariants}
            initial="hidden"
            animate={headerInView ? "visible" : "hidden"}
            className="font-['JetBrains_Mono'] text-sm font-medium tracking-[0.06em] uppercase text-on-surface-variant mb-4"
          >
            {t("usecaseHowItWorks.badge")}
          </motion.p>
          <motion.h2
            id="how-it-works-heading"
            custom={0.08}
            variants={headerVariants}
            initial="hidden"
            animate={headerInView ? "visible" : "hidden"}
            className="font-['Hanken_Grotesk'] text-4xl md:text-[52px] font-semibold text-white leading-tight"
            style={{ letterSpacing: "-0.03em" }}
          >
            {t("usecaseHowItWorks.heading")
              .split("\n")
              .map((line, i) => (
                <span key={i} className="block">
                  {line}
                </span>
              ))}
          </motion.h2>
          <motion.div
            initial={{ scaleX: 0, originX: 0 }}
            animate={headerInView ? { scaleX: 1 } : {}}
            transition={{ duration: 0.75, delay: 0.28, ease: "easeOut" }}
            className="mt-5 h-px w-20 bg-white/20"
          />
        </div>

        {/* ── 2×2 bento grid ─────────────────────────────────────── */}
        <div ref={gridRef}>
          <motion.div
            className="grid grid-cols-1 sm:grid-cols-2 gap-3"
            variants={containerVariants}
            initial="hidden"
            animate={gridInView ? "visible" : "hidden"}
          >
            {steps.map((step, index) => {
              const Icon = STEP_ICONS[index];
              const ghost = String(index + 1).padStart(2, "0");
              return (
                <motion.article
                  key={index}
                  variants={cardVariants}
                  className="group relative flex flex-col gap-4 p-6 md:p-8 overflow-hidden cursor-default"
                  style={{ clipPath: CLIP }}
                >
                  {/* Background layer */}
                  <div
                    className="absolute inset-0 bg-surface-container border border-white/10 transition-colors duration-200 group-hover:border-white/40"
                    style={{ clipPath: CLIP }}
                    aria-hidden="true"
                  />
                  {/* Ghost number */}
                  <span
                    className="absolute bottom-4 right-5 font-['JetBrains_Mono'] font-bold text-white select-none pointer-events-none leading-none"
                    style={{ fontSize: "80px", opacity: 0.08 }}
                    aria-hidden="true"
                  >
                    {ghost}
                  </span>
                  {/* Step icon */}
                  <div
                    className="relative z-10 flex items-center justify-center w-10 h-10 border border-white/10 bg-surface-container-high shrink-0"
                    aria-hidden="true"
                  >
                    {Icon && <Icon size={18} className="text-white" />}
                  </div>
                  {/* Content */}
                  <div className="relative z-10 flex flex-col gap-2">
                    <h3
                      className="font-['Hanken_Grotesk'] text-lg font-semibold text-white leading-snug"
                      style={{ letterSpacing: "-0.02em" }}
                    >
                      {step.title}
                    </h3>
                    <p className="font-['Hanken_Grotesk'] text-sm text-on-surface-variant leading-relaxed">
                      {step.body}
                    </p>
                  </div>
                </motion.article>
              );
            })}
          </motion.div>
        </div>

      </div>
    </section>
  );
}
