"use client";

import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { FaArrowRight } from "react-icons/fa6";

interface AboutItem {
  id: string;
  titleKey: string;
  descKey: string;
}

const ABOUT_ITEMS: AboutItem[] = [
  {
    id: "mission",
    titleKey: "about.mission.title",
    descKey: "about.mission.desc",
  },
  {
    id: "vision",
    titleKey: "about.vision.title",
    descKey: "about.vision.desc",
  },
  {
    id: "values",
    titleKey: "about.values.title",
    descKey: "about.values.desc",
  },
];

const baseTransition = {
  duration: 0.8,
  ease: "easeOut" as const,
};

/**
 * AboutProject Component
 *
 * Displays company mission, vision, and values with animated cards.
 * Features a staggered animation effect on child elements.
 *
 * @component
 * @returns Rendered About section with animated content
 *
 * @example
 * ```tsx
 * <AboutProject />
 * ```
 */
export default function AboutProject() {
  const { t } = useTranslation();

  return (
    <motion.section className="relative w-full py-20 md:py-28 lg:py-32 px-5 md:px-10 lg:px-16 bg-surface-container-lowest">
      {/* ── Background accent panels ── */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-surface-container/20 blur-3xl rounded-full opacity-30" />
        <div className="absolute top-1/2 right-0 w-80 h-80 bg-primary/5 blur-3xl rounded-full opacity-20" />
      </div>

      {/* ── Main grid layout ── */}
      <div className="relative z-10 max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-12 md:gap-8 lg:gap-12">
        {/* ── Left column: About items list ── */}
        <div className="md:col-span-1 flex flex-col gap-4">
          {ABOUT_ITEMS.map((item, idx) => (
            <motion.div
              key={item.id}
              className="group relative p-4 md:p-5 rounded-lg border border-outline-variant/40 hover:border-accent-bone/60 transition-colors cursor-pointer bg-surface-container/30 backdrop-blur-sm"
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ ...baseTransition, delay: 0.1 + idx * 0.12 }}
              whileHover={{ x: 4 }}
            >
              <h3 className="font-sans text-sm md:text-base font-semibold text-on-surface mb-1 group-hover:text-accent-bone transition-colors">
                {t(item.titleKey)}
              </h3>
              <p className="font-sans text-xs md:text-sm leading-5 text-on-surface-variant">
                {t(item.descKey)}
              </p>
              <FaArrowRight
                size={12}
                className="text-accent-bone/60 mt-3 group-hover:translate-x-1 transition-transform"
              />
            </motion.div>
          ))}
        </div>

        {/* ── Right column: Main content ── */}
        <div className="md:col-span-2 flex flex-col justify-center">
          {/* ── Headline ── */}
          <motion.h2
            className="font-sans text-4xl md:text-5xl lg:text-6xl font-semibold leading-tight md:leading-snug lg:leading-tight tracking-[-0.02em] text-on-surface mb-6 md:mb-8"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ ...baseTransition, delay: 0.15 }}
          >
            {t("about.main.title")}
          </motion.h2>

          {/* ── Description ── */}
          <motion.p
            className="font-sans text-base md:text-lg leading-7 md:leading-8 text-on-surface-variant max-w-2xl mb-8 md:mb-10"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ ...baseTransition, delay: 0.25 }}
          >
            {t("about.main.description")}
          </motion.p>

          {/* ── CTA Button ── */}
          <motion.div
            className="inline-flex"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ ...baseTransition, delay: 0.35 }}
          >
            <button className="group flex items-center gap-3 px-6 md:px-8 py-3 md:py-4 rounded-lg border border-accent-bone/80 bg-transparent hover:bg-primary/5 transition-all duration-300 text-on-surface hover:text-accent-bone">
              <span className="font-sans text-sm md:text-base font-medium">
                {t("about.cta")}
              </span>
              <FaArrowRight
                size={14}
                className="group-hover:translate-x-1 transition-transform"
              />
            </button>
          </motion.div>

          {/* ── Stats line ── */}
          <motion.div
            className="mt-12 md:mt-14 pt-8 md:pt-10 border-t border-outline-variant/30 flex flex-col sm:flex-row gap-8 md:gap-12"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ ...baseTransition, delay: 0.45 }}
          >
            {[
              { key: "about.stat1.label", value: "about.stat1.value" },
              { key: "about.stat2.label", value: "about.stat2.value" },
              { key: "about.stat3.label", value: "about.stat3.value" },
            ].map((stat, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ ...baseTransition, delay: 0.5 + idx * 0.1 }}
              >
                <span className="font-mono text-lg md:text-2xl font-medium text-accent-bone block">
                  {t(stat.value)}
                </span>
                <span className="font-sans text-xs md:text-sm text-on-surface-variant">
                  {t(stat.key)}
                </span>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </div>
    </motion.section>
  );
}