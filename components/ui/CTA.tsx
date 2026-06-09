"use client";

import React from "react";
import { useTranslation } from "react-i18next";
import { FiCheck } from "react-icons/fi";

/**
 * @interface CTAProps
 * @description Właściwości komponentu Call To Action (CTA).
 */
export interface CTAProps {
  /** Klucz tłumaczenia dla pierwszej linii nagłówka */
  line1Key?: string;
  /** Klucz tłumaczenia dla drugiej linii nagłówka */
  line2Key?: string;
  /** Klucz tłumaczenia dla przycisku */
  buttonKey?: string;
  /** Tablica kluczy tłumaczeń dla małych funkcji ze znacznikiem wyboru (check) pod przyciskiem */
  featuresKeys?: string[];
  /** Adres URL, do którego prowadzi przycisk */
  buttonUrl?: string;
}

/**
 * @function CTA
 * @description Komponent Call To Action (CTA) zbudowany w stylu Technical Brutalism / High-Contrast Modern.
 * 
 * Unika generycznych fioletowych gradientów na rzecz głębokiej czerni z ledwo widoczną 
 * techniczną siatką i geometrycznymi okręgami (border-only). Stanowi to silny kontrast, 
 * który rezonuje z rynkiem fintech/B2B (Editorial Brutalism).
 * 
 * Kod korzysta z translacji i18next i wspiera dynamiczne przekazywanie propsów.
 * 
 * @param {CTAProps} props - Dynamiczne właściwości komponentu.
 * @returns {JSX.Element} Wyrenderowana sekcja CTA.
 */
export const CTA = ({
  line1Key = "cta.line1",
  line2Key = "cta.line2",
  buttonKey = "cta.button",
  featuresKeys = ["cta.feature1", "cta.feature2"],
  buttonUrl = "#",
}: CTAProps) => {
  const { t } = useTranslation();

  return (
    <section className="w-full max-w-[1280px] mx-auto px-5 md:px-6 my-16 md:my-24">
      {/* 
        Container: Dark surface (Level 1), rounded corners, hidden overflow for background shapes.
        Zamiast purpurowych blobów z referencji, wykorzystujemy ciemne tło (Level 1) z
        techniczną 1-pikselową ramką, która pasuje do "Executive Precision".
      */}
      <div className="relative w-full rounded-2xl md:rounded-3xl bg-[#040503] border border-white/10 overflow-hidden flex flex-col items-center justify-center py-20 md:py-28 px-4 text-center group">
        
        {/* 
          Background Subtle Geometry (Technical Brutalism details)
          Dwa duże, przecinające się geometryczne okręgi złożone tylko z linii brzegowych
          oraz mikrosiatka (grid) w tle, budujące atmosferę precyzji i technologii.
        */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none opacity-20 transition-opacity duration-700 group-hover:opacity-40">
          <div className="absolute top-[-50%] left-[-10%] w-[60%] h-[200%] rounded-full border border-white/10" />
          <div className="absolute bottom-[-50%] right-[-10%] w-[60%] h-[200%] rounded-full border border-white/10" />
          {/* Subtle grid pattern overlay */}
          <div 
            className="absolute inset-0 opacity-[0.03]"
            style={{
              backgroundImage: 'linear-gradient(rgba(255, 255, 255, 1) 1px, transparent 1px), linear-gradient(90deg, rgba(255, 255, 255, 1) 1px, transparent 1px)',
              backgroundSize: '40px 40px'
            }}
          />
        </div>

        {/* Treść */}
        <div className="relative z-10 flex flex-col items-center">
          
          {/* 
            Top Icon Area
            Odwzorowanie kwadratowej ikony ze znakiem plus na samej górze. 
            Wzbogacona o delikatny blask.
          */}
          <div className="w-14 h-14 md:w-16 md:h-16 rounded-xl md:rounded-2xl bg-[#121410] flex items-center justify-center mb-8 border border-white/10 shadow-2xl transition-transform duration-500 group-hover:scale-105">
            <div className="relative w-5 h-5 md:w-6 md:h-6">
               <div className="absolute top-0 bottom-0 left-1/2 -ml-[2px] w-[4px] bg-primary rounded-sm" />
               <div className="absolute left-0 right-0 top-1/2 -mt-[2px] h-[4px] bg-primary rounded-sm" />
            </div>
          </div>

          {/* 
            Główny nagłówek rozbity na 2 sekcje (tak jak na zdjęciu), 
            z przyciskiem osadzonym bezpośrednio w drugim wierszu na większych ekranach.
          */}
          <h2 className="font-sans font-semibold text-[32px] md:text-[48px] text-primary tracking-tight mb-2 max-w-3xl leading-[1.1]">
            {t(line1Key)}
          </h2>
          
          <div className="flex flex-col md:flex-row items-center gap-4 md:gap-6 mt-2 md:mt-4">
            <h2 className="font-sans font-semibold text-[32px] md:text-[48px] text-primary tracking-tight leading-[1.1]">
              {t(line2Key)}
            </h2>
            
            {/* Przycisk (zgodny z systemem z globals.css) z animowaną strzałką */}
            <a href={buttonUrl} className="btn btn-primary group/btn mt-4 md:mt-0 px-6 py-3 rounded-full md:rounded-md text-[16px]">
              {t(buttonKey)}
              <span className="inline-block transition-transform duration-300 group-hover/btn:translate-x-1 group-hover/btn:-translate-y-1 ml-1 font-sans">
                ↗
              </span>
            </a>
          </div>

          {/* Małe tagi / funkcje na samym dole z ikonką Check */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-10 mt-12 md:mt-16">
            {featuresKeys.map((featKey, idx) => (
              <div key={idx} className="flex items-center gap-2.5 group/feat">
                <div className="w-[18px] h-[18px] rounded-full bg-white/10 flex items-center justify-center text-primary transition-colors duration-300 group-hover/feat:bg-white/20">
                  <FiCheck size={12} strokeWidth={3} />
                </div>
                <span className="font-mono text-[13px] md:text-[14px] tracking-wide text-on-surface-variant">
                  {t(featKey)}
                </span>
              </div>
            ))}
          </div>
          
        </div>
      </div>
    </section>
  );
};

export default CTA;
