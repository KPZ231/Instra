"use client";

import React from "react";
import Image from "next/image";
import Link from "next/link";
import { useTranslation } from "react-i18next";

/**
 * @function Footer
 * @description Modernistyczny footer z dużym, wycentrowanym logo Instra.
 * Płynnie łączy się z sekcją CTA powyżej dzięki wspólnemu ciemnemu tłu.
 * Styl zgodny z "Executive Precision"  Technical Brutalism / High-Contrast Modern.
 *
 * @returns {JSX.Element} Pełna sekcja stopki strony.
 * @example
 * <Footer />
 */
export const Footer = () => {
  const { t } = useTranslation();
  const year = new Date().getFullYear();

  const navLinks = [
    { labelKey: "footer.nav.product", href: "#" },
    { labelKey: "footer.nav.pricing", href: "#" },
    { labelKey: "footer.nav.docs", href: "#" },
    { labelKey: "footer.nav.blog", href: "#" },
    { labelKey: "footer.nav.careers", href: "#" },
  ];

  const legalLinks = [
    { labelKey: "footer.legal.privacy", href: "#" },
    { labelKey: "footer.legal.terms", href: "#" },
    { labelKey: "footer.legal.cookies", href: "#" },
  ];

  return (
    <footer className="relative w-full bg-[#000000] overflow-hidden">
      {/* Subtle top separator line */}
      <div className="w-full h-px bg-white/5" />

      {/* Grid background */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.025) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.025) 1px, transparent 1px)",
          backgroundSize: "80px 80px",
        }}
      />

      {/* Large radial glow behind logo */}
      <div
        className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[500px] pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse at 50% 0%, rgba(255,255,255,0.04) 0%, transparent 70%)",
        }}
      />

      <div className="relative z-10 max-w-[1280px] mx-auto px-5 md:px-16">
        {/* ── Logo section ── */}
        <div className="flex flex-col items-center pt-20 pb-16 md:pt-28 md:pb-20">
          <Image
            src="/images/logos/logo_white_No_Subtitle_Transparent_Wide.png"
            alt="Instra"
            width={520}
            height={160}
            className="w-[280px] md:w-[420px] lg:w-[520px] h-auto opacity-90 select-none"
            priority
          />
          <p className="mt-6 font-mono text-[12px] tracking-[0.15em] uppercase text-white/30">
            {t("footer.tagline")}
          </p>
        </div>

        {/* ── Divider ── */}
        <div className="w-full h-px bg-white/8" />

        {/* ── Nav links ── */}
        <nav className="flex flex-wrap justify-center gap-x-8 gap-y-3 py-10">
          {navLinks.map(({ labelKey, href }) => (
            <Link
              key={labelKey}
              href={href}
              className="font-mono text-[12px] tracking-[0.1em] uppercase text-white/40 hover:text-white/90 transition-colors duration-200"
            >
              {t(labelKey)}
            </Link>
          ))}
        </nav>

        {/* ── Bottom bar ── */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 py-6 border-t border-white/5">
          <span className="font-mono text-[11px] tracking-[0.08em] text-white/20">
            © {year} Instra. {t("footer.rights")}
          </span>
          <div className="flex items-center gap-6">
            {legalLinks.map(({ labelKey, href }) => (
              <Link
                key={labelKey}
                href={href}
                className="font-mono text-[11px] tracking-[0.08em] text-white/20 hover:text-white/60 transition-colors duration-200"
              >
                {t(labelKey)}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
