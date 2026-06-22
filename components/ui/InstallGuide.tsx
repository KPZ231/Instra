"use client";

import { useRef, useState } from "react";
import { motion, useInView } from "framer-motion";
import { useTranslation } from "react-i18next";
import { FiCheck, FiCopy } from "react-icons/fi";

/* ── Types ─────────────────────────────────────────────────────── */

type OS = "macos" | "windows" | "linux";

interface InstallStep {
  title: string;
  command: string;
  description: string;
}

/* ── Constants ──────────────────────────────────────────────────── */

const OS_TABS: { id: OS; i18nKey: string }[] = [
  { id: "macos", i18nKey: "installGuide.tabs.macos" },
  { id: "windows", i18nKey: "installGuide.tabs.windows" },
  { id: "linux", i18nKey: "installGuide.tabs.linux" },
];

const CLIP = "polygon(0 0, calc(100% - 16px) 0, 100% 16px, 100% 100%, 16px 100%, 0 calc(100% - 16px))";

/* ── Motion variants ─────────────────────────────────────────────── */

const headerVariants = {
  hidden: { opacity: 0, y: 18 },
  visible: (delay: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, delay, ease: [0.22, 1, 0.36, 1] as const },
  }),
};

const stepContainerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.1, delayChildren: 0.05 } },
};

const stepVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] as const },
  },
};

/* ── CopyButton ─────────────────────────────────────────────────── */

// ponytail: inline — no need for a separate component for one use case
function CopyButton({ text, labelCopy, labelCopied }: { text: string; labelCopy: string; labelCopied: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <button
      onClick={handleCopy}
      aria-label={copied ? labelCopied : labelCopy}
      className="shrink-0 flex items-center gap-1.5 font-['JetBrains_Mono'] text-xs text-on-surface-variant hover:text-white transition-colors duration-150 min-w-[44px] min-h-[44px] justify-center px-2"
    >
      {copied ? <FiCheck size={13} className="text-white" /> : <FiCopy size={13} />}
      <span className="hidden sm:inline">{copied ? labelCopied : labelCopy}</span>
    </button>
  );
}

/* ── Main component ─────────────────────────────────────────────── */

/**
 * InstallGuide — tabbed OS installation instructions for Instra CLI and Desktop Agent.
 * Tabs: macOS / Windows / Linux. Each step shows a copyable command block.
 * All copy is resolved from i18n (`installGuide.*`).
 *
 * @example
 * <InstallGuide />
 */
export default function InstallGuide() {
  const { t } = useTranslation();
  const headerRef = useRef<HTMLDivElement>(null);
  const stepsRef = useRef<HTMLDivElement>(null);
  const headerInView = useInView(headerRef, { once: true, margin: "-60px" });
  const stepsInView = useInView(stepsRef, { once: true, margin: "-80px" });

  const [activeOS, setActiveOS] = useState<OS>("macos");

  const rawSteps = t(`installGuide.${activeOS}.steps`, { returnObjects: true });
  const steps: InstallStep[] = Array.isArray(rawSteps) ? (rawSteps as InstallStep[]) : [];

  const labelCopy = t("installGuide.copy");
  const labelCopied = t("installGuide.copied");

  return (
    <section
      className="relative w-full bg-background overflow-hidden border-t border-white/[0.07]"
      aria-labelledby="install-guide-heading"
    >
      <div className="relative z-10 max-w-[1280px] mx-auto px-5 md:px-16 py-24 md:py-32">

        {/* ── Section header ─────────────────────────────────────── */}
        <div ref={headerRef} className="mb-10">
          <motion.p
            custom={0}
            variants={headerVariants}
            initial="hidden"
            animate={headerInView ? "visible" : "hidden"}
            className="font-['JetBrains_Mono'] text-sm font-medium tracking-[0.06em] uppercase text-on-surface-variant mb-4"
          >
            {t("installGuide.badge")}
          </motion.p>
          <motion.h2
            id="install-guide-heading"
            custom={0.08}
            variants={headerVariants}
            initial="hidden"
            animate={headerInView ? "visible" : "hidden"}
            className="font-['Hanken_Grotesk'] text-4xl md:text-[52px] font-semibold text-white leading-tight"
            style={{ letterSpacing: "-0.03em" }}
          >
            {t("installGuide.heading")
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

        {/* ── OS tab bar ─────────────────────────────────────────── */}
        <div
          className="flex gap-1 mb-8 border-b border-white/[0.07] overflow-x-auto"
          role="tablist"
          aria-label="Select operating system"
        >
          {OS_TABS.map(({ id, i18nKey }) => {
            const isActive = activeOS === id;
            return (
              <button
                key={id}
                role="tab"
                aria-selected={isActive}
                aria-controls={`tabpanel-${id}`}
                id={`tab-${id}`}
                onClick={() => setActiveOS(id)}
                className={[
                  "font-['JetBrains_Mono'] text-sm font-medium tracking-[0.04em] px-5 py-3 min-h-[44px] whitespace-nowrap transition-colors duration-150 border-b-2 -mb-px",
                  isActive
                    ? "text-white border-white"
                    : "text-on-surface-variant border-transparent hover:text-white hover:border-white/30",
                ].join(" ")}
              >
                {t(i18nKey)}
              </button>
            );
          })}
        </div>

        {/* ── Steps ──────────────────────────────────────────────── */}
        <div
          ref={stepsRef}
          id={`tabpanel-${activeOS}`}
          role="tabpanel"
          aria-labelledby={`tab-${activeOS}`}
        >
          <motion.ol
            className="flex flex-col gap-3"
            variants={stepContainerVariants}
            initial="hidden"
            animate={stepsInView ? "visible" : "hidden"}
            key={activeOS} // re-trigger stagger on tab change
          >
            {steps.map((step, index) => (
              <motion.li
                key={index}
                variants={stepVariants}
                className="group relative overflow-hidden"
                style={{ clipPath: CLIP }}
              >
                {/* Background */}
                <div
                  className="absolute inset-0 bg-surface-container border border-white/10 transition-colors duration-200 group-hover:border-white/25"
                  style={{ clipPath: CLIP }}
                  aria-hidden="true"
                />

                {/* Ghost step number */}
                <span
                  className="absolute right-4 top-1/2 -translate-y-1/2 font-['JetBrains_Mono'] font-bold text-white select-none pointer-events-none leading-none"
                  style={{ fontSize: "72px", opacity: 0.05 }}
                  aria-hidden="true"
                >
                  {String(index + 1).padStart(2, "0")}
                </span>

                <div className="relative z-10 flex flex-col sm:flex-row sm:items-start gap-4 p-5 md:p-6">
                  {/* Step number badge */}
                  <div
                    className="flex items-center justify-center w-7 h-7 border border-white/10 bg-surface-container-high shrink-0 font-['JetBrains_Mono'] text-xs font-bold text-on-surface-variant mt-0.5"
                    aria-hidden="true"
                  >
                    {index + 1}
                  </div>

                  <div className="flex-1 min-w-0">
                    {/* Step title */}
                    <p
                      className="font-['Hanken_Grotesk'] text-base font-semibold text-white mb-2"
                      style={{ letterSpacing: "-0.02em" }}
                    >
                      {step.title}
                    </p>

                    {/* Command block */}
                    <div className="flex items-center gap-2 bg-surface-container-high border border-white/10 px-4 py-2.5 mb-3">
                      <code className="font-['JetBrains_Mono'] text-sm text-white flex-1 min-w-0 break-all">
                        {step.command}
                      </code>
                      <CopyButton
                        text={step.command}
                        labelCopy={labelCopy}
                        labelCopied={labelCopied}
                      />
                    </div>

                    {/* Description */}
                    <p className="font-['Hanken_Grotesk'] text-sm text-on-surface-variant leading-relaxed">
                      {step.description}
                    </p>
                  </div>
                </div>
              </motion.li>
            ))}
          </motion.ol>
        </div>

      </div>
    </section>
  );
}
