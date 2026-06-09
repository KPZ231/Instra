"use client";

import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import { useTranslation } from "react-i18next";

/* ── Framer Motion variants ───────────────────────────────────── */

const staggerLetters = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.055, delayChildren: 0.05 } },
};

const letterVariant = {
  hidden: { opacity: 0, y: 72, skewY: 4 },
  visible: {
    opacity: 1,
    y: 0,
    skewY: 0,
    transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] as const },
  },
};

const slideIn = (dir: "left" | "right") => ({
  hidden: { opacity: 0, x: dir === "left" ? -52 : 52 },
  visible: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.75, ease: [0.22, 1, 0.36, 1] as const },
  },
});

/* ── Helper: animated heading with per-letter reveal ─────────── */

/**
 * Splits a heading string into individually animated letters.
 * @param text - The heading text to animate.
 */
function AnimatedHeading({ text }: { readonly text: string }) {
  return (
    <motion.span
      className="inline-flex flex-wrap overflow-hidden leading-none"
      variants={staggerLetters}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: "-80px" }}
      aria-label={text}
    >
      {text.split("").map((char, i) => (
        <motion.span
          key={i}
          variants={letterVariant}
          aria-hidden="true"
          className={char === " " ? "inline-block w-[0.35em]" : "inline-block"}
        >
          {char === " " ? " " : char}
        </motion.span>
      ))}
    </motion.span>
  );
}

/* ── Helper: decorative product-UI visual block ───────────────── */

/**
 * Renders an abstract product dashboard mockup as a decorative visual.
 * @param variant - Controls which abstract layout to render.
 */
function VisualBlock({
  variant,
}: {
  readonly variant: "dashboard" | "analytics";
}) {
  return (
    <div
      className="relative w-full h-full min-h-[300px] bg-pitch-black border border-white/10 overflow-hidden"
      aria-hidden="true"
    >
      {/* Subtle grid */}
      <div
        className="absolute inset-0 opacity-[0.05]"
        style={{
          backgroundImage:
            "linear-gradient(to right,#fff 1px,transparent 1px),linear-gradient(to bottom,#fff 1px,transparent 1px)",
          backgroundSize: "36px 36px",
        }}
      />

      {/* Radial highlight */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_70%_60%_at_50%_50%,rgba(255,255,255,0.035),transparent)]" />

      {variant === "dashboard" && (
        <div className="absolute inset-0 p-7 flex flex-col justify-between gap-6">
          {/* Top label rows */}
          <div className="space-y-2.5">
            <div className="h-1 w-2/3 bg-white/20 rounded-sm" />
            <div className="h-1 w-2/5 bg-white/08 rounded-sm" />
          </div>

          {/* Metric rows */}
          <div className="space-y-2">
            {[75, 52, 88, 38, 65, 80].map((w, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="w-10 h-px bg-white/10 shrink-0" />
                <div
                  className="h-[3px] bg-white/[0.15] rounded-sm transition-none"
                  style={{ width: `${w}%` }}
                />
              </div>
            ))}
          </div>

          {/* Bar chart */}
          <div className="flex items-end gap-1.5 h-20">
            {[55, 75, 48, 92, 60, 78, 85, 50, 70, 88].map((h, i) => (
              <div
                key={i}
                className="flex-1 bg-white/[0.09]"
                style={{ height: `${h}%` }}
              />
            ))}
          </div>

          {/* Bottom accent line — success green */}
          <div className="h-px w-full bg-gradient-to-r from-transparent via-[#00FF41]/30 to-transparent" />
        </div>
      )}

      {variant === "analytics" && (
        <div className="absolute inset-0 p-7 flex flex-col gap-4">
          {/* KPI cards */}
          <div className="grid grid-cols-2 gap-3">
            {[
              { val: "10M+", label: "CAMPAIGNS" },
              { val: "98%", label: "SATISFACTION" },
            ].map(({ val, label }) => (
              <div
                key={label}
                className="border border-white/[0.08] bg-surface-container p-3"
              >
                <p className="font-mono text-[10px] tracking-[0.1em] text-on-surface-variant mb-1">
                  {label}
                </p>
                <p className="font-mono text-xl font-medium text-on-surface leading-none">
                  {val}
                </p>
              </div>
            ))}
          </div>

          {/* Sparkline area */}
          <div className="flex-1 border border-white/[0.06] bg-surface-container-low p-3">
            <div className="h-full flex items-end gap-1">
              {[28, 46, 35, 78, 55, 88, 64, 82, 50, 72, 90, 68].map(
                (h, i) => (
                  <div
                    key={i}
                    className="flex-1 bg-white/[0.07]"
                    style={{ height: `${h}%` }}
                  />
                )
              )}
            </div>
          </div>

          {/* Success green tick */}
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-[#00FF41]" />
            <span className="font-mono text-[10px] tracking-[0.1em] text-on-surface-variant">
              ALL SYSTEMS OPERATIONAL
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Main component ───────────────────────────────────────────── */

/**
 * AboutInstra section component.
 * Displays a split editorial layout describing Instra's identity,
 * platform philosophy, and key metrics — styled to the Executive Precision
 * design system with framer-motion scroll animations.
 *
 * @example
 * <AboutInstra />
 */
export default function AboutInstra() {
  const { t } = useTranslation();

  const statsRef = useRef<HTMLDivElement>(null);
  const statsInView = useInView(statsRef, { once: true, margin: "-60px" });

  return (
    <section
      className="relative w-full bg-background overflow-hidden"
      aria-labelledby="about-instra-heading"
    >
      {/* ── Heading ─────────────────────────────────────────────── */}
      <div className="border-b border-white/[0.07] px-5 md:px-16 pt-20 md:pt-28 pb-8 md:pb-12">
        {/* Badge */}
        <motion.p
          className="font-mono text-[11px] tracking-[0.18em] text-on-surface-variant mb-6 md:mb-8 uppercase"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, ease: "easeOut" as const }}
        >
          {t("aboutInstra.badge")}
        </motion.p>

        {/* Giant display title */}
        <h2
          id="about-instra-heading"
          className="font-sans font-semibold text-[clamp(56px,10vw,140px)] leading-none tracking-[-0.04em] text-primary uppercase select-none"
        >
          <AnimatedHeading text={t("aboutInstra.heading_line1")} />
          <br />
          <AnimatedHeading text={t("aboutInstra.heading_line2")} />
        </h2>
      </div>

      {/* ── Block 1: Visual left — Text right ───────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 border-b border-white/[0.07]">
        {/* Visual */}
        <motion.div
          className="border-b md:border-b-0 md:border-r border-white/[0.07] min-h-[320px]"
          variants={slideIn("left")}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-60px" }}
        >
          <VisualBlock variant="dashboard" />
        </motion.div>

        {/* Text */}
        <motion.div
          className="p-8 md:p-12 lg:p-16 flex flex-col justify-center gap-6"
          variants={slideIn("right")}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-60px" }}
        >
          <span className="font-mono text-[11px] tracking-[0.16em] text-on-surface-variant uppercase">
            {t("aboutInstra.block1.label")}
          </span>

          <p className="font-sans text-base md:text-lg leading-[1.75] text-accent-bone text-balance">
            {t("aboutInstra.block1.body1")}
          </p>

          <p className="font-sans text-base leading-[1.75] text-on-surface-variant text-balance">
            {t("aboutInstra.block1.body2")}
          </p>

          {/* Decorative rule */}
          <div className="h-px w-16 bg-white/20 mt-2" />
        </motion.div>
      </div>

      {/* ── Block 2: Text left — Visual right ───────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 border-b border-white/[0.07]">
        {/* Text */}
        <motion.div
          className="order-2 md:order-1 p-8 md:p-12 lg:p-16 flex flex-col justify-center gap-6 md:border-r border-white/[0.07]"
          variants={slideIn("left")}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-60px" }}
        >
          <span className="font-mono text-[11px] tracking-[0.16em] text-on-surface-variant uppercase">
            {t("aboutInstra.block2.label")}
          </span>

          <p className="font-sans text-base md:text-lg leading-[1.75] text-accent-bone text-balance">
            {t("aboutInstra.block2.body")}
          </p>

          {/* Decorative rule */}
          <div className="h-px w-16 bg-white/20 mt-2" />
        </motion.div>

        {/* Visual */}
        <motion.div
          className="order-1 md:order-2 border-b md:border-b-0 border-white/[0.07] min-h-[320px]"
          variants={slideIn("right")}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-60px" }}
        >
          <VisualBlock variant="analytics" />
        </motion.div>
      </div>

      {/* ── Stats row ────────────────────────────────────────────── */}
      <div
        ref={statsRef}
        className="grid grid-cols-1 sm:grid-cols-3"
        role="list"
        aria-label={t("aboutInstra.stats.aria_label")}
      >
        {(
          [
            {
              key: "stat1",
              value: t("aboutInstra.stat1.value"),
              label: t("aboutInstra.stat1.label"),
              delay: 0,
            },
            {
              key: "stat2",
              value: t("aboutInstra.stat2.value"),
              label: t("aboutInstra.stat2.label"),
              delay: 0.1,
            },
            {
              key: "stat3",
              value: t("aboutInstra.stat3.value"),
              label: t("aboutInstra.stat3.label"),
              delay: 0.2,
            },
          ] as const
        ).map(({ key, value, label, delay }, i) => (
          <motion.div
            key={key}
            role="listitem"
            className={`px-8 md:px-12 py-10 md:py-14 flex flex-col gap-2 ${
              i < 2 ? "border-b sm:border-b-0 sm:border-r border-white/[0.07]" : ""
            }`}
            initial={{ opacity: 0, y: 20 }}
            animate={statsInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6, ease: "easeOut", delay }}
          >
            <span
              className="font-mono text-[clamp(32px,5vw,56px)] font-medium leading-none tracking-[-0.02em] text-primary"
              aria-label={`${value} ${label}`}
            >
              {value}
            </span>
            <span className="font-mono text-[11px] tracking-[0.16em] text-on-surface-variant uppercase">
              {label}
            </span>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
