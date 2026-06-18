"use client";

import { useRef, useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import { FaChevronDown, FaCheck } from "react-icons/fa6";
import { supportedLocales, type Locale } from "@/lib/i18n/config";

/**
 * @function LanguageSwitcher
 * @description Dropdown do zmiany języka interfejsu. Używa react-i18next.
 * Styl glassmorphism zgodny z Navbar profile dropdown.
 *
 * @returns {JSX.Element}
 * @example
 * <LanguageSwitcher />
 */
export default function LanguageSwitcher() {
  const { t, i18n } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const currentLocale = (supportedLocales.includes(i18n.language as Locale)
    ? i18n.language
    : supportedLocales[0]) as Locale;

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function handleSelect(locale: Locale) {
    i18n.changeLanguage(locale);
    setIsOpen(false);
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setIsOpen((p) => !p)}
        aria-label={t("lang.switcher_label")}
        aria-expanded={isOpen}
        className="flex items-center gap-1.5 transition-opacity duration-150 hover:opacity-80 cursor-pointer"
        style={{ color: "var(--color-on-surface-variant)" }}
      >
        <span className="font-mono text-xs tracking-widest uppercase">
          {currentLocale}
        </span>
        <FaChevronDown
          size={10}
          style={{ color: "var(--color-outline)" }}
          className={`transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
        />
      </button>

      {isOpen && (
        <motion.div
          initial={{ opacity: 0, y: -6, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.18, ease: "easeOut" }}
          className="absolute right-0 top-full mt-3 min-w-36 py-1 rounded"
          style={{
            background: "rgba(26, 28, 24, 0.92)",
            backdropFilter: "blur(24px) saturate(160%)",
            WebkitBackdropFilter: "blur(24px) saturate(160%)",
            border: "1px solid rgba(255, 255, 255, 0.08)",
            boxShadow: "0 16px 40px rgba(0, 0, 0, 0.55), 0 0 0 0.5px rgba(255,255,255,0.04)",
          }}
        >
          {supportedLocales.map((locale) => {
            const isActive = locale === currentLocale;
            return (
              <button
                key={locale}
                onClick={() => handleSelect(locale)}
                className="w-full flex items-center justify-between px-4 py-2.5 text-sm transition-colors duration-100"
                style={{ color: isActive ? "var(--color-accent-bone)" : "var(--color-on-surface)" }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.04)")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
              >
                <span className="font-sans">{t(`lang.${locale}`)}</span>
                {isActive && <FaCheck size={10} />}
              </button>
            );
          })}
        </motion.div>
      )}
    </div>
  );
}
