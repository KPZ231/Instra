"use client";

import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import { useTranslation } from "react-i18next";

/* ── Props ─────────────────────────────────────────────────────── */

interface PageHeaderProps {
  /**
   * i18n key prefix. Reads the following keys:
   *   `${i18nPrefix}.label`        mono eyebrow label (required)
   *   `${i18nPrefix}.heading`      display heading, may contain `\n` for line breaks (required)
   *   `${i18nPrefix}.description`  optional body paragraph
   */
  i18nPrefix: string;
  /** Optional HTML id for the <h1> element  useful for aria-labelledby on the page. */
  headingId?: string;
}

/* ── Framer Motion variants ─────────────────────────────────────── */

const labelVariant = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] as const } },
};

const headingVariant = {
  hidden: { opacity: 0, y: 28 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.65, delay: 0.07, ease: [0.22, 1, 0.36, 1] as const } },
};

const descVariant = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.55, delay: 0.18, ease: [0.22, 1, 0.36, 1] as const } },
};

const ruleVariant = {
  hidden: { scaleX: 0, originX: 0 },
  visible: { scaleX: 1, transition: { duration: 0.7, delay: 0.32, ease: "easeOut" as const } },
};

/* ── Main component ─────────────────────────────────────────────── */

/**
 * Reusable page header  eyebrow label, display heading, optional description.
 * All copy is resolved from i18n using `i18nPrefix`.
 * Supports multi-line headings via `\n` in the translation value.
 *
 * @param i18nPrefix - i18n key namespace (e.g. "featuresHeader", "pricingHeader")
 * @param headingId  - optional id attribute on the h1
 *
 * @example
 * // locales/en/common.json
 * "featuresHeader": {
 *   "label": "// CAPABILITIES",
 *   "heading": "Built to\nPerform",
 *   "description": "Optional subtitle text."
 * }
 *
 * // usage
 * <PageHeader i18nPrefix="featuresHeader" headingId="features-heading" />
 */
export default function PageHeader({ i18nPrefix, headingId }: PageHeaderProps) {
  const { t } = useTranslation();
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-40px" });

  const label = t(`${i18nPrefix}.label`);
  const heading = t(`${i18nPrefix}.heading`);
  const description = t(`${i18nPrefix}.description`, { defaultValue: "" });
  const headingLines = heading.split("\n");

  return (
    <header
      className="relative w-full bg-background border-b border-white/[0.07] overflow-hidden"
      aria-labelledby={headingId}
    >
      {/* Noise texture */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.02]"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='300'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='300' height='300' filter='url(%23n)'/%3E%3C/svg%3E\")",
        }}
        aria-hidden="true"
      />

      {/* Subtle horizontal grid line */}
      <div
        className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent"
        aria-hidden="true"
      />

      <div
        ref={ref}
        className="relative z-10 max-w-[1280px] mx-auto px-5 md:px-16 pt-28 md:pt-36 pb-16 md:pb-20"
      >
        {/* Eyebrow label */}
        <motion.p
          variants={labelVariant}
          initial="hidden"
          animate={inView ? "visible" : "hidden"}
          className="font-['JetBrains_Mono'] text-sm font-medium tracking-[0.1em] uppercase text-on-surface-variant mb-5"
        >
          {label}
        </motion.p>

        {/* Display heading */}
        <motion.h1
          id={headingId}
          variants={headingVariant}
          initial="hidden"
          animate={inView ? "visible" : "hidden"}
          className="font-['Hanken_Grotesk'] font-semibold text-white leading-none"
          style={{
            fontSize: "clamp(2.75rem, 7vw, 6rem)",
            letterSpacing: "-0.035em",
          }}
        >
          {headingLines.map((line, i) => (
            <span key={i} className="block">
              {line}
            </span>
          ))}
        </motion.h1>

        {/* Animated rule */}
        <motion.div
          variants={ruleVariant}
          initial="hidden"
          animate={inView ? "visible" : "hidden"}
          className="mt-7 h-px w-20 bg-white/25"
        />

        {/* Optional description */}
        {description && (
          <motion.p
            variants={descVariant}
            initial="hidden"
            animate={inView ? "visible" : "hidden"}
            className="mt-6 font-['Hanken_Grotesk'] text-base md:text-lg leading-[1.75] text-on-surface-variant max-w-[52ch]"
          >
            {description}
          </motion.p>
        )}
      </div>
    </header>
  );
}
