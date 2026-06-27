"use client";

import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import { useTranslation } from "react-i18next";
import {
  SiHubspot,
  SiMailchimp,
  SiSlack,
  SiGithub,
  SiVercel,
  SiStripe,
  SiSupabase,
  SiJira,
} from "react-icons/si";
import { FiBarChart2, FiTarget } from "react-icons/fi";
import type { ElementType } from "react";

/* ── Types ─────────────────────────────────────────────────────── */

interface Integration {
  name: string;
  category: "marketing" | "dev";
  Icon: ElementType;
  tagline: string;
  featured?: boolean;
}

/* ── Constants ──────────────────────────────────────────────────── */

const CLIP_CARD = "polygon(0 0, calc(100% - 12px) 0, 100% 12px, 100% 100%, 12px 100%, 0 calc(100% - 12px))";

/** 10 integrations with featured=true cards showing a tagline (creates height variation for masonry) */
const INTEGRATIONS: Integration[] = [
  { name: "HubSpot",    category: "marketing", Icon: SiHubspot,    tagline: "CRM & Marketing Hub",   featured: true  },
  { name: "Slack",      category: "marketing", Icon: SiSlack,      tagline: "Team Communication"                    },
  { name: "Analytics",  category: "marketing", Icon: FiBarChart2,  tagline: "Traffic & Conversions", featured: true  },
  { name: "Mailchimp",  category: "marketing", Icon: SiMailchimp,  tagline: "Email Marketing"                       },
  { name: "Meta Ads",   category: "marketing", Icon: FiTarget,     tagline: "Social Advertising",    featured: true  },
  { name: "GitHub",     category: "dev",       Icon: SiGithub,     tagline: "Version Control"                       },
  { name: "Vercel",     category: "dev",       Icon: SiVercel,     tagline: "Deployment & Hosting",  featured: true  },
  { name: "Stripe",     category: "dev",       Icon: SiStripe,     tagline: "Payment Processing"                    },
  { name: "Supabase",   category: "dev",       Icon: SiSupabase,   tagline: "Backend & Database",    featured: true  },
  { name: "Jira",       category: "dev",       Icon: SiJira,       tagline: "Project Management"                    },
];

/* ── Sub-components ─────────────────────────────────────────────── */

/**
 * Single integration chip. Featured cards show a tagline below the name,
 * creating height variation that drives the masonry layout.
 * @param integration - Integration data
 * @param index - Position index for stagger animation delay
 * @param inView - Whether parent container is in viewport
 */
function IntegrationCard({
  integration,
  index,
  inView,
}: {
  readonly integration: Integration;
  readonly index: number;
  readonly inView: boolean;
}) {
  const { Icon } = integration;
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.45, delay: index * 0.06, ease: [0.22, 1, 0.36, 1] }}
      whileHover={{ scale: 1.02 }}
      className="group relative p-[1px] bg-white/10 hover:bg-white/20 transition-colors duration-200 mb-3 break-inside-avoid cursor-default"
      style={{ clipPath: CLIP_CARD }}
    >
      <div
        className="flex flex-col gap-2 p-4 bg-surface-container"
        style={{ clipPath: CLIP_CARD }}
      >
        <div className="flex items-center gap-3">
          <div
            className="flex items-center justify-center w-8 h-8 border border-white/10 bg-surface-container-high shrink-0"
            aria-hidden="true"
          >
            <Icon
              size={15}
              className="text-on-surface-variant group-hover:text-white transition-colors duration-200"
            />
          </div>
          <span className="font-['Hanken_Grotesk'] text-sm font-semibold text-white">
            {integration.name}
          </span>
          <span className="ml-auto font-['JetBrains_Mono'] text-[10px] tracking-widest uppercase text-on-surface-variant/60 border border-white/10 px-1.5 py-0.5">
            {integration.category === "marketing" ? "mktg" : "dev"}
          </span>
        </div>
        {integration.featured && (
          <p className="font-['JetBrains_Mono'] text-xs text-on-surface-variant leading-snug pl-11">
            {integration.tagline}
          </p>
        )}
      </div>
    </motion.div>
  );
}

/* ── Main component ─────────────────────────────────────────────── */

/**
 * IntegrationsSection  masonry grid (CSS columns) of 10 integration chips
 * across marketing and dev tool categories, plus a "+120 more" chip.
 *
 * @example
 * <IntegrationsSection />
 */
export default function IntegrationsSection() {
  const { t } = useTranslation();
  const headerRef = useRef<HTMLDivElement>(null);
  const headerInView = useInView(headerRef, { once: true, margin: "-60px" });
  const gridRef = useRef<HTMLDivElement>(null);
  const gridInView = useInView(gridRef, { once: true, margin: "-80px" });

  return (
    <section
      className="relative w-full bg-background overflow-hidden border-t border-white/[0.07]"
      aria-labelledby="integrations-heading"
    >
      <div className="relative z-10 max-w-[1280px] mx-auto px-5 md:px-16 py-24 md:py-32">

        {/* ── Section header ─────────────────────────────────────── */}
        <div ref={headerRef} className="mb-14">
          <motion.p
            initial={{ opacity: 0, y: 18 }}
            animate={headerInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            className="font-['JetBrains_Mono'] text-sm font-medium tracking-[0.06em] uppercase text-on-surface-variant mb-4"
          >
            {t("usecaseIntegrations.badge")}
          </motion.p>
          <motion.h2
            id="integrations-heading"
            initial={{ opacity: 0, y: 18 }}
            animate={headerInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.08, ease: [0.22, 1, 0.36, 1] }}
            className="font-['Hanken_Grotesk'] text-4xl md:text-[52px] font-semibold text-white leading-tight"
            style={{ letterSpacing: "-0.03em" }}
          >
            {t("usecaseIntegrations.heading")
              .split("\n")
              .map((line, i) => (
                <span key={i} className="block">
                  {line}
                </span>
              ))}
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 18 }}
            animate={headerInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.16, ease: [0.22, 1, 0.36, 1] }}
            className="mt-4 font-['Hanken_Grotesk'] text-base text-on-surface-variant max-w-xl"
          >
            {t("usecaseIntegrations.subtitle")}
          </motion.p>
          <motion.div
            initial={{ scaleX: 0, originX: 0 }}
            animate={headerInView ? { scaleX: 1 } : {}}
            transition={{ duration: 0.75, delay: 0.28, ease: "easeOut" }}
            className="mt-5 h-px w-20 bg-white/20"
          />
        </div>

        {/* ── Masonry grid via CSS columns ───────────────────────── */}
        <div ref={gridRef}>
          <div className="columns-2 md:columns-3" style={{ columnGap: "12px" }}>
            {INTEGRATIONS.map((integration, index) => (
              <IntegrationCard
                key={integration.name}
                integration={integration}
                index={index}
                inView={gridInView}
              />
            ))}

            {/* "+120 more" chip */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={gridInView ? { opacity: 1, y: 0 } : {}}
              transition={{
                duration: 0.45,
                delay: INTEGRATIONS.length * 0.06,
                ease: [0.22, 1, 0.36, 1],
              }}
              className="break-inside-avoid mb-3 flex items-center justify-center p-4 border border-dashed border-accent-bone/20"
              style={{ clipPath: CLIP_CARD }}
            >
              <span className="font-['JetBrains_Mono'] text-xs font-medium tracking-[0.06em] uppercase text-accent-bone/60">
                {t("usecaseIntegrations.moreLabel")}
              </span>
            </motion.div>
          </div>
        </div>

      </div>
    </section>
  );
}
