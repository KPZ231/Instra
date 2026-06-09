"use client";

import React, { useState } from "react";
import { useTranslation } from "react-i18next";

interface FAQItem {
  q: string;
  a: string;
}

export const FAQ = () => {
  const { t } = useTranslation();

  const categories = [
    { id: "general", labelKey: "faq.categories.general" },
    { id: "pricing", labelKey: "faq.categories.pricing" },
    { id: "security", labelKey: "faq.categories.security" },
  ];

  const [activeCategory, setActiveCategory] = useState(categories[0].id);
  const [openIndex, setOpenIndex] = useState<number | null>(0); // First item open by default

  // We need to fetch the list of questions based on the active category from translations
  // Since i18next returns an array if we have an array in json, we use returnObjects.
  // We must verify it's an array to prevent runtime errors if translations are missing.
  const rawQuestions = t(`faq.questions.${activeCategory}`, { returnObjects: true });
  const currentQuestions: FAQItem[] = Array.isArray(rawQuestions) ? rawQuestions : [];

  return (
    <section className="w-full max-w-[1280px] mx-auto px-5 md:px-6 my-16 md:my-24 font-sans">
      
      {/* Sekcja Nagłówkowa */}
      <div className="flex flex-col items-center text-center mb-12 md:mb-20">
        <h2 className="text-headline-lg-mobile md:text-headline-lg font-semibold text-primary tracking-tight mb-4">
          {t("faq.title")}
        </h2>
        <p className="text-body-lg text-on-surface-variant max-w-2xl">
          {t("faq.subtitle")}
        </p>
      </div>

      {/* Główna zawartość - 2 kolumny na desktopie */}
      <div className="flex flex-col md:flex-row gap-12 md:gap-24 relative">
        
        {/* Kolumna lewa: Kategorie */}
        <div className="w-full md:w-1/3 flex-shrink-0">
          <h3 className="text-sm font-mono text-on-surface-variant uppercase tracking-widest mb-6">
            Categories
          </h3>
          <div className="flex flex-row md:flex-col gap-2 overflow-x-auto md:overflow-visible pb-4 md:pb-0 hide-scrollbar">
            {categories.map((category) => {
              const isActive = activeCategory === category.id;
              return (
                <button
                  key={category.id}
                  onClick={() => {
                    setActiveCategory(category.id);
                    setOpenIndex(0); // Zawsze otwieraj pierwsze pytanie po zmianie kategorii
                  }}
                  className={`text-left px-4 py-3 whitespace-nowrap md:whitespace-normal font-sans text-[15px] md:text-body-lg transition-all duration-300 border-l-[3px] rounded-r-sm ${
                    isActive
                      ? "border-primary text-primary font-medium bg-white/5"
                      : "border-transparent text-on-surface-variant hover:text-primary hover:bg-white/[0.02]"
                  }`}
                >
                  {t(category.labelKey)}
                </button>
              );
            })}
          </div>
        </div>

        {/* Kolumna prawa: Pytania i Odpowiedzi (Akordeon) */}
        <div className="w-full md:w-2/3 flex flex-col gap-4">
          
          {currentQuestions && currentQuestions.length > 0 ? (
            currentQuestions.map((item, index) => {
              const isOpen = openIndex === index;

              return (
                <div 
                  key={index} 
                  className={`flex flex-col transition-colors duration-300 p-[1px] ${
                    isOpen 
                      ? "bg-white/30" 
                      : "bg-white/10 hover:bg-white/20"
                  }`}
                  style={{ clipPath: "polygon(0 0, calc(100% - 16px) 0, 100% 16px, 100% 100%, 16px 100%, 0 calc(100% - 16px))" }}
                >
                  <div 
                    className={`flex flex-col h-full w-full ${isOpen ? "bg-surface-container-high" : "bg-surface-container"}`}
                    style={{ clipPath: "polygon(0 0, calc(100% - 16px) 0, 100% 16px, 100% 100%, 16px 100%, 0 calc(100% - 16px))" }}
                  >
                    <button
                      onClick={() => setOpenIndex(isOpen ? null : index)}
                      className="flex items-center justify-between p-5 md:p-6 text-left w-full cursor-pointer focus:outline-none"
                    >
                      <span className={`font-semibold text-[16px] md:text-title-md transition-colors ${isOpen ? "text-primary" : "text-on-surface"}`}>
                        {item.q}
                      </span>
                      <span className="ml-4 text-on-surface-variant font-mono text-xl leading-none">
                        {isOpen ? "−" : "+"}
                      </span>
                    </button>
                    
                    {/* Zawartość Akordeonu (Odpowiedź) */}
                    <div 
                      className={`overflow-hidden transition-all duration-300 ease-in-out ${
                        isOpen ? "max-h-[500px] opacity-100" : "max-h-0 opacity-0"
                      }`}
                    >
                      <div className="p-5 md:p-6 pt-0 text-on-surface-variant font-mono text-body-sm leading-relaxed border-t border-white/5 mt-2">
                        {item.a}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <p className="text-on-surface-variant font-mono">Brak pytań dla tej kategorii.</p>
          )}

          {/* Ramka kontaktowa na samym dole */}
          <div 
            className="mt-8 md:mt-12 p-[1px] transition-colors duration-300 group bg-white/10 hover:bg-white/20"
            style={{ clipPath: "polygon(0 0, calc(100% - 20px) 0, 100% 20px, 100% 100%, 20px 100%, 0 calc(100% - 20px))" }}
          >
            <div 
              className="p-6 md:p-8 bg-[#040503] flex flex-col sm:flex-row items-center justify-between gap-6"
              style={{ clipPath: "polygon(0 0, calc(100% - 20px) 0, 100% 20px, 100% 100%, 20px 100%, 0 calc(100% - 20px))" }}
            >
              <div className="flex flex-col gap-2 text-center sm:text-left">
                <h4 className="font-semibold text-title-md text-primary flex items-center justify-center sm:justify-start gap-2">
                  <span className="w-5 h-5 rounded-none bg-white/10 flex items-center justify-center text-[10px] font-mono border border-white/20">i</span>
                  {t("faq.contact.title")}
                </h4>
                <p className="text-body-sm text-on-surface-variant font-mono">
                  {t("faq.contact.desc")}
                </p>
              </div>
              
              <a href="/contact" className="btn btn-secondary whitespace-nowrap rounded-none">
                {t("faq.contact.button")}
              </a>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
};

export default FAQ;
