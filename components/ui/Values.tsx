"use client";

import { motion, useInView, AnimatePresence } from "framer-motion";
import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";

interface ValueItem {
  index: string;
  title: string;
  description: string;
  detail: string;
}

const CLIP = "polygon(0 0, calc(100% - 20px) 0, 100% 20px, 100% 100%, 20px 100%, 0 calc(100% - 20px))";

/**
 * Single value card with envelope-open animation on click.
 * The lid scales down on Y and the detail panel slides in from the top.
 *
 * @param item  - Value data including detail text
 * @param position - Index used for staggered entrance delay
 */
function ValueCard({ item, position }: { item: ValueItem; position: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-80px" });
  const [isOpen, setIsOpen] = useState(false);

  const handleToggle = () => setIsOpen((v) => !v);

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 40 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.6, ease: "easeOut", delay: position * 0.12 }}
      className="relative group"
    >
      {/* Ghost number */}
      <motion.span
        initial={{ opacity: 0 }}
        animate={isInView ? { opacity: 0.08 } : {}}
        transition={{ duration: 0.8, delay: position * 0.12 + 0.2 }}
        className="absolute -top-6 left-0 font-['Hanken_Grotesk'] text-[88px] font-semibold leading-none select-none text-white pointer-events-none"
        style={{ letterSpacing: "-0.04em" }}
        aria-hidden="true"
      >
        {item.index}
      </motion.span>

      {/* ── Envelope shell — clip-path only on this wrapper ── */}
      <div
        className="relative mt-6 cursor-pointer select-none"
        style={{ clipPath: CLIP }}
        onClick={handleToggle}
        role="button"
        aria-expanded={isOpen}
        tabIndex={0}
        onKeyDown={(e) => e.key === "Enter" && handleToggle()}
      >
        {/* 1px border layer */}
        <div
          className="absolute inset-0 pointer-events-none z-10 transition-colors duration-300"
          style={{
            clipPath: CLIP,
            background: isOpen ? "rgba(255,255,255,0.25)" : "rgba(255,255,255,0.10)",
          }}
        />

        {/* ── LID — collapses upward (scaleY + translateY) ── */}
        <motion.div
          animate={isOpen ? { scaleY: 0, y: "-50%" } : { scaleY: 1, y: "0%" }}
          transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
          style={{ transformOrigin: "top center" }}
        >
          <div className="p-6 pb-5 bg-surface-container-low">
            {/* Progress lines */}
            <div className="flex flex-col gap-[5px] mb-5">
              {[1, 2, 3].map((line) => (
                <motion.div
                  key={line}
                  className="h-px bg-white/20"
                  initial={{ scaleX: 0, originX: 0 }}
                  animate={isInView ? { scaleX: line === 3 ? 0.65 : 0.45 + line * 0.05 } : {}}
                  transition={{ duration: 0.9, ease: "easeOut", delay: position * 0.12 + 0.3 + line * 0.08 }}
                />
              ))}
              <motion.div
                className="h-px bg-white/60"
                initial={{ scaleX: 0, originX: 0 }}
                animate={isInView ? { scaleX: 0.75 } : {}}
                transition={{ duration: 1.1, ease: "easeOut", delay: position * 0.12 + 0.55 }}
              />
            </div>

            {/* Title + indicator */}
            <div className="flex items-start justify-between gap-4">
              <h3
                className="font-['Hanken_Grotesk'] text-2xl font-semibold text-white"
                style={{ letterSpacing: "-0.02em" }}
              >
                {item.title}
              </h3>
              <motion.span
                animate={{ rotate: isOpen ? 180 : 0 }}
                transition={{ duration: 0.3 }}
                className="mt-1 shrink-0 font-['JetBrains_Mono'] text-xs text-on-surface-variant"
                aria-hidden="true"
              >
                ↓
              </motion.span>
            </div>

            {/* Short description */}
            <p className="font-['Hanken_Grotesk'] text-base text-on-surface-variant leading-relaxed mt-3">
              {item.description}
            </p>
          </div>
        </motion.div>

        {/* ── DETAIL PANEL — slides down from behind the lid ── */}
        <AnimatePresence initial={false}>
          {isOpen && (
            <motion.div
              key="detail"
              initial={{ opacity: 0, y: -16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.35, delay: 0.25, ease: "easeOut" }}
              className="bg-surface-container px-6 pt-5 pb-6"
              onClick={(e) => e.stopPropagation()}
            >
              <p className="font-['Hanken_Grotesk'] text-sm text-on-surface-variant leading-relaxed mb-4">
                {item.detail}
              </p>
              <button
                className="font-['JetBrains_Mono'] text-xs tracking-[0.05em] uppercase text-white/40 hover:text-white transition-colors duration-200"
                onClick={(e) => { e.stopPropagation(); setIsOpen(false); }}
              >
                ↑ zamknij
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

/**
 * Values section — showcases core brand values with numbered cards,
 * animated progress lines, and scroll-triggered entrance animations.
 *
 * @example
 * <Values />
 */
export default function Values() {
  const { t } = useTranslation();
  const headerRef = useRef<HTMLDivElement>(null);
  const headerInView = useInView(headerRef, { once: true, margin: "-60px" });

  const rawItems = t("values.items", { returnObjects: true });
  const items: ValueItem[] = Array.isArray(rawItems) ? (rawItems as ValueItem[]) : [];

  return (
    <section className="relative w-full bg-surface-container-lowest py-24 md:py-32 overflow-hidden">
      {/* Background noise texture */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.03]"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='300'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='300' height='300' filter='url(%23n)'/%3E%3C/svg%3E\")",
        }}
      />

      <div className="relative z-10 max-w-[1280px] mx-auto px-5 md:px-16">
        {/* Section header */}
        <div ref={headerRef} className="mb-16 md:mb-20">
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={headerInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.5 }}
            className="font-['JetBrains_Mono'] text-sm font-medium tracking-[0.05em] uppercase text-on-surface-variant mb-4"
          >
            {t("values.label")}
          </motion.p>

          <motion.h2
            initial={{ opacity: 0, y: 16 }}
            animate={headerInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="font-['Hanken_Grotesk'] text-5xl md:text-[72px] font-semibold text-white leading-tight"
            style={{ letterSpacing: "-0.04em" }}
          >
            {t("values.heading")}
          </motion.h2>

          <motion.div
            initial={{ scaleX: 0, originX: 0 }}
            animate={headerInView ? { scaleX: 1 } : {}}
            transition={{ duration: 0.8, delay: 0.3, ease: "easeOut" }}
            className="mt-6 h-px w-24 bg-white/20"
          />
        </div>

        {/* Cards grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 md:gap-10">
          {items.map((item, i) => (
            <ValueCard key={item.index} item={item} position={i} />
          ))}
        </div>
      </div>
    </section>
  );
}
