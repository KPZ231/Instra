"use client";

import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { FaAnglesRight, FaStar } from "react-icons/fa6";

const PANELS = [
  { right: "-2%",  width: "28%", height: "90%", top: "-8%", bg: "bg-surface-container",         opacity: 1,    delay: "0s"    },
  { right: "14%",  width: "22%", height: "78%", top: "-4%", bg: "bg-surface-container-high",    opacity: 0.85, delay: "0.07s" },
  { right: "28%",  width: "18%", height: "66%", top: "0%",  bg: "bg-surface-bright",            opacity: 0.55, delay: "0.14s" },
  { right: "40%",  width: "14%", height: "55%", top: "5%",  bg: "bg-surface-container-highest", opacity: 0.32, delay: "0.21s" },
  { right: "50%",  width: "11%", height: "44%", top: "9%",  bg: "bg-surface-container",         opacity: 0.14, delay: "0.28s" },
];

const baseTransition = {
  duration: 0.8,
  ease: "easeOut" as const,
};

export default function Hero() {
  const { t } = useTranslation();

  return (
    <motion.section className="relative w-full h-screen overflow-hidden bg-surface-container-lowest">
      {/* ── Geometric panels (upper-right) ── */}
      <div className="absolute inset-0 pointer-events-none">
        {PANELS.map((p, i) => (
          <motion.div
            key={i}
            className={`absolute border-l border-white/5 ${p.bg}`}
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: p.opacity, y: 0 }}
            transition={{ ...baseTransition, delay: 0.1 + i * 0.08 }}
            style={{
              top: p.top,
              right: p.right,
              width: p.width,
              height: p.height,
            }}
          />
        ))}

        {/* Dissolve panels into background */}
        <div className="absolute inset-0 bg-[linear-gradient(135deg,var(--color-surface-container-lowest)_26%,transparent_60%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(to_top,var(--color-surface-container-lowest)_14%,transparent_50%)]" />
      </div>

      {/* ── Copy ── */}
      <div className="relative z-10 h-full flex flex-col justify-end p-5 md:p-10 lg:p-16">
        <motion.h1
          className="font-sans text-[40px] md:text-[56px] lg:text-[72px] font-semibold leading-tight md:leading-[64px] lg:leading-[80px] tracking-[-0.04em] text-on-surface max-w-full md:max-w-[540px] lg:max-w-[560px] mb-8 md:mb-10 lg:mb-12"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...baseTransition, delay: 0.3 }}
        >
          {t("hero.title")}
        </motion.h1>

        {/* ── Bottom bar ── */}
        <motion.div
          className="flex flex-col md:flex-row md:items-start md:justify-between gap-5 md:gap-0 border-t border-outline-variant pt-5 md:pt-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...baseTransition, delay: 0.45 }}
        >
          {/* Left blurbs */}
          <div className="flex flex-col sm:flex-row items-start gap-4 sm:gap-5">
            <p className="font-sans text-sm md:text-base leading-6 text-on-surface-variant max-w-full sm:max-w-50 m-0">
              {t("hero.section1")}
            </p>
            <FaAnglesRight size={12} className="text-outline mt-1.5 shrink-0 hidden sm:block" />
            <p className="font-sans text-sm md:text-base leading-6 text-on-surface-variant max-w-full sm:max-w-45 m-0">
              {t("hero.section2")}
            </p>
          </div>

          {/* Rating */}
          <div className="flex flex-col items-start md:items-end gap-1">
            <div className="flex flex-row items-center gap-2">
              <span className="font-mono text-sm font-medium tracking-wider text-on-surface">
                4.8 / 5
              </span>
              <div className="flex gap-0.75">
                {Array.from({ length: 5 }).map((_, i) => (
                  <FaStar key={i} size={11} className="text-accent-bone" />
                ))}
              </div>
            </div>
            <p className="font-mono text-xs tracking-wider text-on-surface-variant m-0">
              {t("hero.section3")}
            </p>
          </div>
        </motion.div>
      </div>
    </motion.section>
  );
}
