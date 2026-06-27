"use client";

import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import { useTranslation } from "react-i18next";
import { FiShuffle, FiClock, FiSlash } from "react-icons/fi";
import type { ElementType } from "react";

/* ── Types ─────────────────────────────────────────────────────── */

interface ProblemItem {
  title: string;
  body: string;
}

/* ── Constants ──────────────────────────────────────────────────── */

const CLIP = "polygon(0 0, calc(100% - 16px) 0, 100% 16px, 100% 100%, 16px 100%, 0 calc(100% - 16px))";
const CLIP_CHIP = "polygon(0 0, calc(100% - 8px) 0, 100% 8px, 100% 100%, 8px 100%, 0 calc(100% - 8px))";

const PAIN_ICONS: ElementType[] = [FiShuffle, FiClock, FiSlash];

/** Deterministic scattered positions for chaos visualization chips */
const TOOL_POSITIONS = [
  { top: "8%",  left: "5%",  rotate: -8 },
  { top: "22%", left: "55%", rotate:  4 },
  { top: "5%",  left: "70%", rotate: -3 },
  { top: "40%", left: "15%", rotate:  6 },
  { top: "55%", left: "60%", rotate: -12 },
  { top: "70%", left: "30%", rotate:  3 },
  { top: "35%", left: "75%", rotate:  8 },
  { top: "80%", left: "68%", rotate: -5 },
  { top: "15%", left: "35%", rotate: -7 },
  { top: "65%", left: "5%",  rotate: 10 },
  { top: "48%", left: "42%", rotate: -4 },
  { top: "88%", left: "45%", rotate:  6 },
] as const;

const SCATTERED_TOOLS = [
  "Mailchimp", "HubSpot", "Slack", "Notion", "Jira",
  "Analytics", "Meta Ads", "Stripe", "Vercel", "GitHub",
  "Figma", "Zapier",
];

/* ── Framer Motion variants ─────────────────────────────────────── */

const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.13, delayChildren: 0.05 } },
};

const itemVariants = {
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
 * ProblemSection  communicates Instra's core problem: scattered tools
 * causing context-switching and lost productivity.
 * Left: animated pain-point cards. Right: chaos visualization of tool names.
 *
 * @example
 * <ProblemSection />
 */
export default function ProblemSection() {
  const { t } = useTranslation();
  const headerRef = useRef<HTMLDivElement>(null);
  const headerInView = useInView(headerRef, { once: true, margin: "-60px" });
  const cardsRef = useRef<HTMLDivElement>(null);
  const cardsInView = useInView(cardsRef, { once: true, margin: "-80px" });
  const chaosRef = useRef<HTMLDivElement>(null);
  const chaosInView = useInView(chaosRef, { once: true, margin: "-80px" });

  const rawItems = t("usecaseProblem.items", { returnObjects: true });
  const items: ProblemItem[] = Array.isArray(rawItems) ? (rawItems as ProblemItem[]) : [];

  return (
    <section
      className="relative w-full bg-surface-container-lowest overflow-hidden border-t border-white/[0.07]"
      aria-labelledby="problem-section-heading"
    >
      <div className="relative z-10 max-w-[1280px] mx-auto px-5 md:px-16 py-24 md:py-32">
        <div className="flex flex-col lg:flex-row gap-16 lg:gap-24">

          {/* ── Left: header + pain-point cards ───────────────────── */}
          <div className="w-full lg:w-[58%]">
            <div ref={headerRef} className="mb-12">
              <motion.p
                custom={0}
                variants={headerVariants}
                initial="hidden"
                animate={headerInView ? "visible" : "hidden"}
                className="font-['JetBrains_Mono'] text-sm font-medium tracking-[0.06em] uppercase text-on-surface-variant mb-4"
              >
                {t("usecaseProblem.badge")}
              </motion.p>
              <motion.h2
                id="problem-section-heading"
                custom={0.08}
                variants={headerVariants}
                initial="hidden"
                animate={headerInView ? "visible" : "hidden"}
                className="font-['Hanken_Grotesk'] text-4xl md:text-[52px] font-semibold text-white leading-tight"
                style={{ letterSpacing: "-0.03em" }}
              >
                {t("usecaseProblem.heading")
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

            <div ref={cardsRef}>
              <motion.div
                className="flex flex-col gap-3"
                variants={containerVariants}
                initial="hidden"
                animate={cardsInView ? "visible" : "hidden"}
              >
                {items.map((item, index) => {
                  const Icon = PAIN_ICONS[index];
                  return (
                    <motion.div
                      key={index}
                      variants={itemVariants}
                      className="group relative p-[1px] bg-white/10 hover:bg-white/20 transition-colors duration-300"
                      style={{ clipPath: CLIP }}
                    >
                      <div
                        className="relative flex gap-4 items-start p-5 bg-surface-container"
                        style={{ clipPath: CLIP }}
                      >
                        <div
                          className="flex items-center justify-center w-9 h-9 shrink-0 border border-white/10 bg-surface-container-high"
                          aria-hidden="true"
                        >
                          {Icon && <Icon size={16} className="text-on-surface-variant" />}
                        </div>
                        <div className="flex flex-col gap-1">
                          <h3 className="font-['Hanken_Grotesk'] text-sm font-semibold text-white">
                            {item.title}
                          </h3>
                          <p className="font-['Hanken_Grotesk'] text-sm text-on-surface-variant leading-relaxed">
                            {item.body}
                          </p>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </motion.div>
            </div>
          </div>

          {/* ── Right: chaos visualization ────────────────────────── */}
          <div
            ref={chaosRef}
            className="hidden lg:block w-full lg:w-[42%] relative min-h-[360px]"
            aria-hidden="true"
          >
            {SCATTERED_TOOLS.map((tool, index) => {
              const pos = TOOL_POSITIONS[index] ?? { top: "50%", left: "50%", rotate: 0 };
              return (
                <motion.div
                  key={tool}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={chaosInView ? { opacity: 1, scale: 1 } : {}}
                  transition={{
                    duration: 0.45,
                    delay: index * 0.06,
                    ease: [0.22, 1, 0.36, 1],
                  }}
                  className="absolute px-3 py-1.5 border border-white/10 bg-surface-container"
                  style={{
                    top: pos.top,
                    left: pos.left,
                    transform: `rotate(${pos.rotate}deg)`,
                    clipPath: CLIP_CHIP,
                  }}
                >
                  <span className="font-['JetBrains_Mono'] text-xs text-on-surface-variant whitespace-nowrap">
                    {tool}
                  </span>
                </motion.div>
              );
            })}
            {/* Decorative dashed connection lines */}
            <svg
              className="absolute inset-0 w-full h-full opacity-10 pointer-events-none"
              aria-hidden="true"
            >
              <line x1="20%" y1="25%" x2="60%" y2="55%" stroke="white" strokeWidth="0.5" strokeDasharray="4 4" />
              <line x1="60%" y1="10%" x2="30%" y2="45%" stroke="white" strokeWidth="0.5" strokeDasharray="4 4" />
              <line x1="75%" y1="38%" x2="50%" y2="65%" stroke="white" strokeWidth="0.5" strokeDasharray="4 4" />
            </svg>
          </div>

        </div>
      </div>
    </section>
  );
}
