"use client";

import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import { useTranslation } from "react-i18next";
import { FiCompass, FiDownload, FiLink2, FiZap } from "react-icons/fi";
import type { ElementType } from "react";

/* ── Types ─────────────────────────────────────────────────────── */

interface WorkflowStep {
  title: string;
  body: string;
}

/* ── Constants ──────────────────────────────────────────────────── */

const STEP_ICONS: ElementType[] = [FiCompass, FiDownload, FiLink2, FiZap];

const CLIP_NODE = "polygon(0 0, calc(100% - 8px) 0, 100% 8px, 100% 100%, 8px 100%, 0 calc(100% - 8px))";
const CLIP_NODE_SM = "polygon(0 0, calc(100% - 6px) 0, 100% 6px, 100% 100%, 6px 100%, 0 calc(100% - 6px))";

/* ── Framer Motion variants ─────────────────────────────────────── */

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
 * WorkflowSection  horizontal 4-step timeline on desktop, vertical on mobile.
 * Animated connector line (scaleX/scaleY) triggered by scroll via useInView.
 *
 * @example
 * <WorkflowSection />
 */
export default function WorkflowSection() {
  const { t } = useTranslation();
  const headerRef = useRef<HTMLDivElement>(null);
  const headerInView = useInView(headerRef, { once: true, margin: "-60px" });
  const timelineRef = useRef<HTMLDivElement>(null);
  const timelineInView = useInView(timelineRef, { once: true, margin: "-80px" });

  const rawSteps = t("usecaseWorkflow.steps", { returnObjects: true });
  const steps: WorkflowStep[] = Array.isArray(rawSteps) ? (rawSteps as WorkflowStep[]) : [];

  return (
    <section
      className="relative w-full bg-surface-container-lowest overflow-hidden border-t border-white/[0.07]"
      aria-labelledby="workflow-section-heading"
    >
      <div className="relative z-10 max-w-[1280px] mx-auto px-5 md:px-16 py-24 md:py-32">

        {/* ── Section header ─────────────────────────────────────── */}
        <div ref={headerRef} className="mb-16 md:mb-20">
          <motion.p
            custom={0}
            variants={headerVariants}
            initial="hidden"
            animate={headerInView ? "visible" : "hidden"}
            className="font-['JetBrains_Mono'] text-sm font-medium tracking-[0.06em] uppercase text-on-surface-variant mb-4"
          >
            {t("usecaseWorkflow.badge")}
          </motion.p>
          <motion.h2
            id="workflow-section-heading"
            custom={0.08}
            variants={headerVariants}
            initial="hidden"
            animate={headerInView ? "visible" : "hidden"}
            className="font-['Hanken_Grotesk'] text-4xl md:text-[52px] font-semibold text-white leading-tight"
            style={{ letterSpacing: "-0.03em" }}
          >
            {t("usecaseWorkflow.heading")
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

        {/* ── Timeline ───────────────────────────────────────────── */}
        <div ref={timelineRef}>

          {/* Desktop: horizontal */}
          <div className="hidden lg:block relative">
            {/* Track line */}
            <div className="absolute top-5 left-5 right-5 h-px bg-white/10" aria-hidden="true">
              <motion.div
                className="h-full bg-white/30 origin-left"
                initial={{ scaleX: 0 }}
                animate={timelineInView ? { scaleX: 1 } : {}}
                transition={{ duration: 0.8, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
              />
            </div>

            <div className="grid grid-cols-4 gap-6">
              {steps.map((step, index) => {
                const Icon = STEP_ICONS[index];
                return (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 20 }}
                    animate={timelineInView ? { opacity: 1, y: 0 } : {}}
                    transition={{
                      duration: 0.5,
                      delay: index * 0.12 + 0.1,
                      ease: [0.22, 1, 0.36, 1],
                    }}
                    className="flex flex-col gap-4"
                  >
                    {/* Node icon */}
                    <div
                      className="relative z-10 flex items-center justify-center w-10 h-10 border border-white/30 bg-surface-container-lowest shrink-0"
                      style={{ clipPath: CLIP_NODE }}
                    >
                      {Icon && <Icon size={16} className="text-white" />}
                    </div>
                    {/* Text */}
                    <div className="flex flex-col gap-1.5 pt-4">
                      <span className="font-['JetBrains_Mono'] text-xs font-medium tracking-[0.08em] uppercase text-on-surface-variant">
                        {String(index + 1).padStart(2, "0")}
                      </span>
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
                  </motion.div>
                );
              })}
            </div>
          </div>

          {/* Mobile: vertical */}
          <div className="lg:hidden flex flex-col relative pl-10">
            {/* Track line */}
            <div className="absolute left-[19px] top-0 bottom-0 w-px bg-white/10" aria-hidden="true">
              <motion.div
                className="w-full bg-white/30 origin-top"
                initial={{ scaleY: 0 }}
                animate={timelineInView ? { scaleY: 1 } : {}}
                transition={{ duration: 0.8, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
                style={{ height: "100%" }}
              />
            </div>

            {steps.map((step, index) => {
              const Icon = STEP_ICONS[index];
              return (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: -16 }}
                  animate={timelineInView ? { opacity: 1, x: 0 } : {}}
                  transition={{
                    duration: 0.5,
                    delay: index * 0.12 + 0.1,
                    ease: [0.22, 1, 0.36, 1],
                  }}
                  className="relative flex gap-5 pb-10 last:pb-0"
                >
                  {/* Node icon  positioned over the track line */}
                  <div
                    className="absolute left-0 flex items-center justify-center w-9 h-9 border border-white/30 bg-surface-container-lowest shrink-0 -translate-x-[1px]"
                    style={{ clipPath: CLIP_NODE_SM, marginTop: "2px" }}
                  >
                    {Icon && <Icon size={14} className="text-white" />}
                  </div>
                  {/* Text */}
                  <div className="flex flex-col gap-1">
                    <span className="font-['JetBrains_Mono'] text-xs text-on-surface-variant tracking-[0.08em] uppercase">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <h3
                      className="font-['Hanken_Grotesk'] text-base font-semibold text-white"
                      style={{ letterSpacing: "-0.01em" }}
                    >
                      {step.title}
                    </h3>
                    <p className="font-['Hanken_Grotesk'] text-sm text-on-surface-variant leading-relaxed">
                      {step.body}
                    </p>
                  </div>
                </motion.div>
              );
            })}
          </div>

        </div>
      </div>
    </section>
  );
}
