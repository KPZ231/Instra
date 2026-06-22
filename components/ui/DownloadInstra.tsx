"use client";

import { useRef, useState } from "react";
import { motion, useInView } from "framer-motion";
import { useTranslation } from "react-i18next";
import { FiTerminal, FiMonitor, FiCopy, FiCheck, FiExternalLink } from "react-icons/fi";
import Button from "@/components/ui/Button";

/* ── Distribution constants ─────────────────────────────────────── */

// ponytail: inline constants; move to lib/config.ts when more channels are added
const NPM_URL = "https://www.npmjs.com/package/@instra/cli";
const CLI_INSTALL_CMD = "npm install -g @instra/cli";
const DESKTOP_RELEASES_URL = "https://github.com/instra/desktop-agent/releases/latest";
const GITHUB_REPO_URL = "https://github.com/instra";

/* ── Clip path (matches HowItWorksSection) ──────────────────────── */

const CLIP = "polygon(0 0, calc(100% - 20px) 0, 100% 20px, 100% 100%, 20px 100%, 0 calc(100% - 20px))";

/* ── Motion variants ─────────────────────────────────────────────── */

const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.14, delayChildren: 0.05 } },
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
 * DownloadInstra — two bento cards presenting Instra CLI and Desktop Agent.
 * CLI card includes a clipboard copy button for the npm install command.
 * Desktop Agent card links to GitHub Releases.
 *
 * @example
 * <DownloadInstra />
 */
export default function DownloadInstra() {
  const { t } = useTranslation();
  const headerRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const headerInView = useInView(headerRef, { once: true, margin: "-60px" });
  const gridInView = useInView(gridRef, { once: true, margin: "-80px" });

  const [copied, setCopied] = useState(false);

  /**
   * Copies the CLI install command to clipboard and briefly flips button text.
   */
  async function handleCopy() {
    await navigator.clipboard.writeText(CLI_INSTALL_CMD);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <section
      className="relative w-full bg-background overflow-hidden border-t border-white/[0.07]"
      aria-labelledby="download-tools-heading"
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
            {t("download.badge")}
          </motion.p>
          <motion.h2
            id="download-tools-heading"
            custom={0.08}
            variants={headerVariants}
            initial="hidden"
            animate={headerInView ? "visible" : "hidden"}
            className="font-['Hanken_Grotesk'] text-4xl md:text-[52px] font-semibold text-white leading-tight"
            style={{ letterSpacing: "-0.03em" }}
          >
            {t("download.heading")
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

        {/* ── Cards grid ─────────────────────────────────────────── */}
        <div ref={gridRef}>
          <motion.div
            className="grid grid-cols-1 md:grid-cols-2 gap-3"
            variants={containerVariants}
            initial="hidden"
            animate={gridInView ? "visible" : "hidden"}
          >

            {/* ── CLI card ──────────────────────────────────────── */}
            <motion.article
              variants={cardVariants}
              className="group relative flex flex-col gap-6 p-6 md:p-8 overflow-hidden"
              style={{ clipPath: CLIP }}
            >
              {/* Background */}
              <div
                className="absolute inset-0 bg-surface-container border border-white/10 transition-colors duration-200 group-hover:border-white/40"
                style={{ clipPath: CLIP }}
                aria-hidden="true"
              />

              {/* Icon + label */}
              <div className="relative z-10 flex items-center gap-3">
                <div
                  className="flex items-center justify-center w-10 h-10 border border-white/10 bg-surface-container-high shrink-0"
                  aria-hidden="true"
                >
                  <FiTerminal size={18} className="text-white" />
                </div>
                <span className="font-['JetBrains_Mono'] text-xs font-medium tracking-[0.08em] uppercase text-on-surface-variant">
                  {t("download.cli.label")}
                </span>
              </div>

              {/* Name + version */}
              <div className="relative z-10 flex items-baseline gap-3">
                <h3
                  className="font-['Hanken_Grotesk'] text-2xl font-semibold text-white leading-none"
                  style={{ letterSpacing: "-0.025em" }}
                >
                  {t("download.cli.name")}
                </h3>
                <span className="font-['JetBrains_Mono'] text-xs text-on-surface-variant border border-white/10 px-2 py-0.5 shrink-0">
                  {t("download.cli.version")}
                </span>
              </div>

              {/* Description */}
              <p className="relative z-10 font-['Hanken_Grotesk'] text-sm text-on-surface-variant leading-relaxed">
                {t("download.cli.description")}
              </p>

              {/* Install command block */}
              <div className="relative z-10 flex items-center gap-3 bg-surface-container-high border border-white/10 px-4 py-3">
                <code className="font-['JetBrains_Mono'] text-sm text-white flex-1 select-all truncate">
                  {CLI_INSTALL_CMD}
                </code>
                <button
                  onClick={handleCopy}
                  aria-label={t("download.cli.copyAriaLabel")}
                  className="shrink-0 flex items-center gap-1.5 font-['JetBrains_Mono'] text-xs text-on-surface-variant hover:text-white transition-colors duration-150 min-w-[44px] min-h-[44px] justify-center"
                >
                  {copied ? (
                    <FiCheck size={14} className="text-white" />
                  ) : (
                    <FiCopy size={14} />
                  )}
                  <span>{copied ? t("installGuide.copied") : t("installGuide.copy")}</span>
                </button>
              </div>

              {/* Actions */}
              <div className="relative z-10 flex flex-wrap gap-3 mt-auto">
                <Button onClick={handleCopy} variant="primary">
                  {t("download.cli.copyButton")}
                </Button>
                <Button
                  href={NPM_URL}
                  variant="secondary"
                  aria-label={t("download.cli.npmAriaLabel")}
                >
                  <span className="flex items-center gap-1.5">
                    {t("download.cli.npmButton")}
                    <FiExternalLink size={13} aria-hidden="true" />
                  </span>
                </Button>
              </div>
            </motion.article>

            {/* ── Desktop Agent card ────────────────────────────── */}
            <motion.article
              variants={cardVariants}
              className="group relative flex flex-col gap-6 p-6 md:p-8 overflow-hidden"
              style={{ clipPath: CLIP }}
            >
              {/* Background */}
              <div
                className="absolute inset-0 bg-surface-container border border-white/10 transition-colors duration-200 group-hover:border-white/40"
                style={{ clipPath: CLIP }}
                aria-hidden="true"
              />

              {/* Icon + label */}
              <div className="relative z-10 flex items-center gap-3">
                <div
                  className="flex items-center justify-center w-10 h-10 border border-white/10 bg-surface-container-high shrink-0"
                  aria-hidden="true"
                >
                  <FiMonitor size={18} className="text-white" />
                </div>
                <span className="font-['JetBrains_Mono'] text-xs font-medium tracking-[0.08em] uppercase text-on-surface-variant">
                  {t("download.agent.label")}
                </span>
              </div>

              {/* Name + version */}
              <div className="relative z-10 flex items-baseline gap-3">
                <h3
                  className="font-['Hanken_Grotesk'] text-2xl font-semibold text-white leading-none"
                  style={{ letterSpacing: "-0.025em" }}
                >
                  {t("download.agent.name")}
                </h3>
                <span className="font-['JetBrains_Mono'] text-xs text-on-surface-variant border border-white/10 px-2 py-0.5 shrink-0">
                  {t("download.agent.version")}
                </span>
              </div>

              {/* Description */}
              <p className="relative z-10 font-['Hanken_Grotesk'] text-sm text-on-surface-variant leading-relaxed">
                {t("download.agent.description")}
              </p>

              {/* Platform badges */}
              <div className="relative z-10 flex flex-wrap gap-2" aria-hidden="true">
                {["macOS", "Windows", "Linux"].map((os) => (
                  <span
                    key={os}
                    className="font-['JetBrains_Mono'] text-xs text-on-surface-variant border border-white/10 px-2 py-1"
                  >
                    {os}
                  </span>
                ))}
              </div>

              {/* Actions */}
              <div className="relative z-10 flex flex-wrap gap-3 mt-auto">
                <Button
                  href={DESKTOP_RELEASES_URL}
                  variant="primary"
                  aria-label={t("download.agent.downloadAriaLabel")}
                >
                  {t("download.agent.downloadButton")}
                </Button>
                <Button
                  href={GITHUB_REPO_URL}
                  variant="secondary"
                  aria-label={t("download.agent.githubAriaLabel")}
                >
                  <span className="flex items-center gap-1.5">
                    {t("download.agent.githubButton")}
                    <FiExternalLink size={13} aria-hidden="true" />
                  </span>
                </Button>
              </div>
            </motion.article>

          </motion.div>
        </div>

      </div>
    </section>
  );
}
