"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { FiCheck, FiX } from "react-icons/fi";

interface PricingFeature {
  name: string;
  included: boolean;
}

interface PricingPlan {
  name: string;
  badge?: string;
  price: { monthly: number; annual: number };
  period: string;
  billedYearly: string;
  desc: string;
  button: string;
  features: PricingFeature[];
}

export const PricingPlans = () => {
  const { t } = useTranslation();
  const [isAnnual, setIsAnnual] = useState(false);

  const planKeys = ["basic", "pro", "enterprise"];

  return (
    <motion.section
      className="w-full max-w-[1280px] mx-auto px-5 md:px-6 my-16 md:my-32 font-sans relative"
      initial={{ opacity: 0, y: 32 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.1 }}
      transition={{ duration: 0.7, ease: "easeOut" }}
    >
      {/* Nagłówek i przełącznik */}
      <motion.div
        className="flex flex-col md:flex-row items-center justify-between mb-12 md:mb-16 gap-6"
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6, ease: "easeOut", delay: 0.1 }}
      >
        <h2 className="text-headline-lg-mobile md:text-headline-lg font-semibold text-primary tracking-tight">
          {t("pricing.title")}
        </h2>

        {/* Toggle (Annual / Monthly) */}
        <div className="flex items-center bg-surface-container p-1 rounded-full border border-white/5">
          <button
            onClick={() => setIsAnnual(true)}
            className={`px-6 py-2 rounded-full text-sm font-medium transition-colors ${
              isAnnual ? "bg-[#1E201B] text-primary shadow-sm" : "text-on-surface-variant hover:text-on-surface"
            }`}
          >
            {t("pricing.billing.annual")}
          </button>
          <button
            onClick={() => setIsAnnual(false)}
            className={`px-6 py-2 rounded-full text-sm font-medium transition-colors ${
              !isAnnual ? "bg-[#1E201B] text-primary shadow-sm" : "text-on-surface-variant hover:text-on-surface"
            }`}
          >
            {t("pricing.billing.monthly")}
          </button>
        </div>
      </motion.div>

      {/* Karty Cenowe */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8 items-stretch mt-8">
        {planKeys.map((key, idx) => {
          // Pobieramy plan z JSON
          const rawPlan = t(`pricing.plans.${key}`, { returnObjects: true });
          const plan: PricingPlan = typeof rawPlan === 'object' && rawPlan !== null ? (rawPlan as PricingPlan) : null as any;

          if (!plan) return null;

          const isHighlighted = key === "pro";
          const currentPrice = isAnnual ? plan.price.annual : plan.price.monthly;

          return (
            <motion.div
              key={key}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, ease: "easeOut", delay: 0.15 + idx * 0.1 }}
              className={`relative flex flex-col transition-all duration-300 p-[1px] group ${
                isHighlighted
                  ? "bg-white/20 shadow-2xl scale-100 md:scale-105 z-10"
                  : "bg-white/5 hover:bg-white/15"
              }`}
              style={{
                // Brutalist cutout: Top-Right and Bottom-Left corners cut by 24px
                clipPath: "polygon(0 0, calc(100% - 24px) 0, 100% 24px, 100% 100%, 24px 100%, 0 calc(100% - 24px))"
              }}
            >
              <div 
                className={`relative flex flex-col h-full w-full p-8 md:p-10 ${
                  isHighlighted ? "bg-[#121410]" : "bg-[#0A0B09]"
                }`}
                style={{
                  clipPath: "polygon(0 0, calc(100% - 24px) 0, 100% 24px, 100% 100%, 24px 100%, 0 calc(100% - 24px))"
                }}
              >
                {/* Odznaka (Badge) dla wyróżnienia - ostrzejsze krawędzie, odsunięte od cięcia */}
                {plan.badge && (
                  <div className={`absolute top-0 right-[40px] px-3 py-1.5 rounded-b-sm text-xs font-mono font-medium border-x border-b border-white/10 ${
                    isHighlighted ? "bg-primary text-background border-primary" : "bg-[#1a1c18] text-on-surface-variant"
                  }`}>
                    {plan.badge}
                  </div>
                )}

                {/* Nagłówek Karty */}
                <h3 className="text-title-lg text-primary font-semibold mb-4 mt-2">
                  {plan.name}
                </h3>
                
                <div className="flex items-end gap-2 mb-2">
                  <span className="text-[48px] leading-none font-semibold text-primary tracking-tighter">
                    ${currentPrice}
                  </span>
                  <span className="text-body-sm text-on-surface-variant mb-2">
                    {plan.period}
                  </span>
                </div>
                
                <p className="text-xs font-mono text-on-surface-variant mb-6 h-4">
                  {isAnnual && plan.billedYearly}
                </p>

                <p className="text-body-sm text-on-surface mb-8 leading-relaxed">
                  {plan.desc}
                </p>

                {/* Linia oddzielająca */}
                <div className="w-full h-px bg-gradient-to-r from-transparent via-white/10 to-transparent mb-8 border-dashed border-t border-white/10"></div>

                {/* Lista Funkcji */}
                <ul className="flex flex-col gap-4 flex-grow mb-10">
                  {Array.isArray(plan.features) && plan.features.map((feat, idx) => (
                    <li key={idx} className="flex items-start gap-3">
                      <div className={`mt-1 flex-shrink-0 w-4 h-4 rounded-sm flex items-center justify-center ${
                        feat.included ? "bg-primary/10 text-primary" : "text-white/20"
                      }`}>
                        {feat.included ? <FiCheck size={12} strokeWidth={3} /> : <FiX size={12} strokeWidth={3} />}
                      </div>
                      <span className={`text-sm font-mono ${feat.included ? "text-on-surface" : "text-on-surface-variant/50"}`}>
                        {feat.name}
                      </span>
                    </li>
                  ))}
                </ul>

                {/* Przycisk */}
                <button className={`w-full py-4 rounded-sm font-medium transition-colors ${
                  isHighlighted 
                    ? "bg-primary text-background hover:bg-primary/90" 
                    : "bg-[#1a1c18] text-primary hover:bg-white/10"
                }`}>
                  {plan.button}
                </button>
              </div>
            </motion.div>
          );
        })}
      </div>

    </motion.section>
  );
};

export default PricingPlans;
