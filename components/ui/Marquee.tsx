"use client";

import React from "react";
import { useTranslation } from "react-i18next";

/**
 * @interface Testimonial
 * @description Reprezentuje pojedynczą opinię klienta (testimonial) używaną w komponencie Marquee.
 * Używa kluczy tłumaczeń (i18n) dla tekstów, zgodnie z wymogami projektu.
 */
export interface Testimonial {
  company: string;
  quoteKey: string;
  author: string;
  titleKey: string;
  linkTextKey: string;
  linkUrl: string;
}

/**
 * @interface MarqueeProps
 * @description Właściwości komponentu Marquee.
 */
export interface MarqueeProps {
  /** Tablica elementów do wyświetlenia w karuzeli */
  items: Testimonial[];
  /** Czas trwania jednej pełnej pętli w sekundach (domyślnie 40) */
  speed?: number;
  /** Czy odwrócić kierunek animacji (domyślnie false) */
  reverse?: boolean;
}

/**
 * @function TestimonialCard
 * @description Komponent karty opinii klienta, zaprojektowany w stylu "Technical Brutalism" i "Minimalism".
 * Automatycznie tłumaczy teksty używając useTranslation() na podstawie dostarczonych kluczy.
 * 
 * @param {Object} props - Właściwości komponentu.
 * @param {Testimonial} props.testimonial - Dane opinii do wyświetlenia z kluczami do tłumaczeń.
 * @returns {JSX.Element} Wyrenderowana karta opinii.
 */
export const TestimonialCard = ({ testimonial }: { testimonial: Testimonial }) => {
  const { t } = useTranslation();
  const { company, quoteKey, author, titleKey, linkTextKey, linkUrl } = testimonial;

  return (
    <div 
      className="relative flex-shrink-0 w-[300px] md:w-[400px] p-[1px] transition-colors duration-300 group/card bg-white/10 hover:bg-white/40 mx-3"
      style={{ clipPath: "polygon(0 0, calc(100% - 20px) 0, 100% 20px, 100% 100%, 20px 100%, 0 calc(100% - 20px))" }}
    >
      <div 
        className="flex flex-col justify-between h-full w-full p-6 md:p-8 bg-[#040503]"
        style={{ clipPath: "polygon(0 0, calc(100% - 20px) 0, 100% 20px, 100% 100%, 20px 100%, 0 calc(100% - 20px))" }}
      >
        <p className="text-body-lg text-on-surface mb-8 font-serif italic">
          "{t(quoteKey)}"
        </p>

        <div className="flex flex-col gap-1">
          <span className="text-sm font-semibold text-primary uppercase tracking-widest font-mono">
            {t(company)}
          </span>
          <span className="text-xs text-on-surface-variant font-mono">
            {author} — {t(titleKey)}
          </span>
        </div>

        {linkUrl && linkTextKey && (
          <a
            href={linkUrl}
            className="absolute bottom-6 md:bottom-8 right-6 md:right-8 w-10 h-10 rounded-sm bg-white/5 border border-white/10 flex items-center justify-center text-primary transition-all duration-300 group-hover/card:bg-primary group-hover/card:text-background group-hover/card:border-primary"
            aria-label={t(linkTextKey)}
            title={t(linkTextKey)}
          >
            <span className="inline-block transition-transform duration-300 group-hover/card:translate-x-0.5 group-hover/card:-translate-y-0.5">
              ↗
            </span>
          </a>
        )}
      </div>
    </div>
  );
};

/**
 * @function Marquee
 * @description Komponent renderujący nieskończoną animację przewijania opinii klientów (markizę).
 * 
 * @param {MarqueeProps} props - Właściwości komponentu.
 * @returns {JSX.Element} Wyrenderowany komponent Marquee.
 */
export const Marquee = ({ items = [], speed = 40, reverse = false }: MarqueeProps) => {
  const displayItems = [...items, ...items];

  return (
    <section className="w-full overflow-hidden flex relative py-12 group bg-background">
      <style>{`
        @keyframes scroll-marquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .animate-scroll-marquee {
          animation: scroll-marquee var(--duration, 40s) linear infinite;
        }
        .group:hover .animate-scroll-marquee {
          animation-play-state: paused;
        }
      `}</style>
      
      <div 
        className="flex shrink-0 items-center animate-scroll-marquee"
        style={{
          "--duration": `${speed}s`,
          animationDirection: reverse ? "reverse" : "normal"
        } as React.CSSProperties}
      >
        {displayItems.map((item, idx) => (
          <TestimonialCard key={idx} testimonial={item} />
        ))}
      </div>
    </section>
  );
};

export default Marquee;
