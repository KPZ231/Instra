# UseCase Page  Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build 5 UseCase page sections (ProblemSection, HowItWorksSection, WorkflowSection, IntegrationsSection, FAQ reuse) with Framer Motion animations, clip-path design, and full i18n.

**Architecture:** Each section is an isolated client component in `/components/ui/`. i18n keys live in `locales/*/common.json`. The page assembles components in `app/(pages)/usecase/page.tsx`. FAQ reuses existing `FAQ.tsx` with a new `usecase` category added to its hardcoded list.

**Tech Stack:** Next.js 14 App Router, TypeScript, Framer Motion v12, react-i18next, react-icons v5, TailwindCSS v4, clip-path cut-corners.

---

## File Map

| Action | Path | Responsibility |
|--------|------|----------------|
| Modify | `locales/en/common.json` | Add all usecase* keys + faq.usecase |
| Modify | `locales/pl/common.json` | Polish translations |
| Create | `components/ui/ProblemSection.tsx` | Problem + chaos viz section |
| Create | `components/ui/HowItWorksSection.tsx` | 2×2 bento steps |
| Create | `components/ui/WorkflowSection.tsx` | Horizontal/vertical timeline |
| Create | `components/ui/IntegrationsSection.tsx` | Masonry logo grid |
| Modify | `components/ui/FAQ.tsx` | Add usecase to categories array |
| Modify | `app/(pages)/usecase/page.tsx` | Assemble all sections |
| Create | `docs/ProblemSection.md` | Component docs |
| Create | `docs/HowItWorksSection.md` | Component docs |
| Create | `docs/WorkflowSection.md` | Component docs |
| Create | `docs/IntegrationsSection.md` | Component docs |

---

## Task 1: Add i18n Keys

**Files:**
- Modify: `locales/en/common.json`
- Modify: `locales/pl/common.json`

- [ ] **Step 1: Add English usecase keys**

Open `locales/en/common.json`. Before the closing `}` of the root object (after the last key `"featuresSection"`), add a comma and insert:

```json
"usecaseHeader": {
    "label": "// REAL-WORLD APPLICATIONS",
    "heading": "One Platform.\nEvery Workflow.",
    "description": "Marketers and developers use Instra's plugin ecosystem to eliminate context-switching and build unified, automated workflows."
},
"usecaseProblem": {
    "badge": "// THE PROBLEM",
    "heading": "Your tools don't\ntalk to each other.",
    "items": [
        {
            "title": "Constant context-switching",
            "body": "Teams jump between 8–12 tools daily. Every switch kills focus and burns time that should go toward actual work."
        },
        {
            "title": "Data trapped in silos",
            "body": "Analytics live in one tab, CRM in another, comms in a third. Nothing connects, so nothing compounds."
        },
        {
            "title": "Integration tax",
            "body": "Every new tool means a new manual process or a fragile automation chain. The stack grows; the productivity doesn't."
        }
    ]
},
"usecaseHowItWorks": {
    "badge": "// HOW IT WORKS",
    "heading": "Simple by design.\nPowerful by default.",
    "steps": [
        {
            "title": "Choose a plugin",
            "body": "Browse the open registry. Filter by category, compatibility, or team rating. Preview before installing."
        },
        {
            "title": "Install in one click",
            "body": "Plugins load into your workspace instantly. No configuration files, no CLI, no restart required."
        },
        {
            "title": "Connect your tools",
            "body": "Authorize integrations via OAuth or API key. Permissions are scoped  plugins only access what they need."
        },
        {
            "title": "Automate your workflow",
            "body": "Trigger actions across tools using plugin events. Set it once, let it run. Audit every action in the log."
        }
    ]
},
"usecaseWorkflow": {
    "badge": "// YOUR WORKFLOW",
    "heading": "From setup to\nautomation in minutes.",
    "steps": [
        {
            "title": "Choose",
            "body": "Pick from 40+ community and premium plugins in the registry."
        },
        {
            "title": "Install",
            "body": "One-click install directly into your Instra workspace."
        },
        {
            "title": "Connect",
            "body": "Authorize your existing tools with scoped OAuth permissions."
        },
        {
            "title": "Automate",
            "body": "Configure triggers and let your workflow run hands-free."
        }
    ]
},
"usecaseIntegrations": {
    "badge": "// INTEGRATIONS",
    "heading": "Works with the tools\nyou already use.",
    "subtitle": "Connect marketing platforms and dev tools without writing a single line of glue code.",
    "moreLabel": "+ 120 more integrations"
}
```

Also add to `faq.categories`:
```json
"usecase": "Plugins & Workflows"
```

Also add to `faq.questions`:
```json
"usecase": [
    {
        "q": "What plugins are available on the free plan?",
        "a": "The free open-core plan includes all community plugins and core platform capabilities. Pro plugins  advanced automations, priority integrations, enterprise connectors  activate on any paid plan."
    },
    {
        "q": "How do I install a plugin?",
        "a": "Go to the Plugin Registry in your Instra dashboard, click Install on any listed plugin, and it loads into your workspace immediately. No restart or configuration required."
    },
    {
        "q": "Can I connect my existing marketing tools?",
        "a": "Yes. Instra integrates with HubSpot, Mailchimp, Google Analytics, Meta Ads, Slack, and dozens more via scoped OAuth  plugins only access what they need."
    },
    {
        "q": "What developer tools are supported?",
        "a": "The plugin ecosystem supports GitHub, Jira, Vercel, Supabase, Stripe, and more. Dev-focused plugins enable webhook triggers, CI/CD hooks, and custom event pipelines."
    },
    {
        "q": "Is the plugin system really open source?",
        "a": "Yes. The core platform is MIT-licensed and the plugin API is fully open. Any developer can build and submit plugins via a pull request or npm under @instra scope."
    },
    {
        "q": "How are plugins sandboxed?",
        "a": "Plugins communicate exclusively through the PluginContext API  no direct database or env access. Every plugin action is logged to an audit trail."
    },
    {
        "q": "Can I build a custom private plugin?",
        "a": "Absolutely. Private plugins stay within your workspace and are never published to the registry. Write them in TypeScript following the InstraPlugin interface."
    },
    {
        "q": "What happens if a plugin breaks?",
        "a": "Each plugin slot is wrapped in an ErrorBoundary. A failing plugin is isolated and shows an error state  it never crashes the rest of your workspace."
    }
]
```

- [ ] **Step 2: Add Polish usecase keys**

Open `locales/pl/common.json`. Mirror the structure from Step 1 with Polish translations:

```json
"usecaseHeader": {
    "label": "// ZASTOSOWANIA W PRAKTYCE",
    "heading": "Jedna platforma.\nKażdy workflow.",
    "description": "Marketerzy i deweloperzy używają ekosystemu pluginów Instra, by wyeliminować przełączanie kontekstu i budować zunifikowane, zautomatyzowane procesy."
},
"usecaseProblem": {
    "badge": "// PROBLEM",
    "heading": "Twoje narzędzia\nnie rozmawiają ze sobą.",
    "items": [
        {
            "title": "Ciągłe przełączanie kontekstu",
            "body": "Zespoły przeskakują między 8–12 narzędziami dziennie. Każde przełączenie niszczy skupienie i marnuje czas."
        },
        {
            "title": "Dane uwięzione w silosach",
            "body": "Analityka w jednej zakładce, CRM w drugiej, komunikacja w trzeciej. Nic się nie łączy, nic nie kumuluje."
        },
        {
            "title": "Podatek integracyjny",
            "body": "Każde nowe narzędzie to nowy ręczny proces lub kruchy łańcuch automatyzacji. Stack rośnie, produktywność nie."
        }
    ]
},
"usecaseHowItWorks": {
    "badge": "// JAK TO DZIAŁA",
    "heading": "Proste z założenia.\nPotężne z natury.",
    "steps": [
        {
            "title": "Wybierz plugin",
            "body": "Przeglądaj otwarty rejestr. Filtruj po kategorii, kompatybilności lub ocenie. Podgląd przed instalacją."
        },
        {
            "title": "Zainstaluj jednym kliknięciem",
            "body": "Pluginy ładują się do workspace'u natychmiast. Bez plików konfiguracyjnych, bez CLI, bez restartu."
        },
        {
            "title": "Połącz swoje narzędzia",
            "body": "Autoryzuj integracje przez OAuth lub klucz API. Uprawnienia są ograniczone  pluginy dostają tylko co potrzebują."
        },
        {
            "title": "Zautomatyzuj workflow",
            "body": "Wyzwalaj akcje w narzędziach używając zdarzeń pluginu. Ustaw raz, niech działa. Audytuj każdą akcję."
        }
    ]
},
"usecaseWorkflow": {
    "badge": "// TWÓJ WORKFLOW",
    "heading": "Od konfiguracji do\nautomatyzacji w minuty.",
    "steps": [
        {
            "title": "Wybierz",
            "body": "Wybierz spośród 40+ pluginów społecznościowych i premium w rejestrze."
        },
        {
            "title": "Zainstaluj",
            "body": "Instalacja jednym kliknięciem bezpośrednio w Twoim workspace Instra."
        },
        {
            "title": "Połącz",
            "body": "Autoryzuj istniejące narzędzia z uprawnieniami OAuth."
        },
        {
            "title": "Automatyzuj",
            "body": "Skonfiguruj wyzwalacze i pozwól workflow działać bez nadzoru."
        }
    ]
},
"usecaseIntegrations": {
    "badge": "// INTEGRACJE",
    "heading": "Działa z narzędziami,\nktórych już używasz.",
    "subtitle": "Połącz platformy marketingowe i narzędzia deweloperskie bez pisania ani jednej linii kodu kleju.",
    "moreLabel": "+ 120 kolejnych integracji"
}
```

Also add to `faq.categories`: `"usecase": "Pluginy i Workflow"`

Also add to `faq.questions.usecase` (Polish Q&A):
```json
"usecase": [
    {
        "q": "Jakie pluginy są dostępne w darmowym planie?",
        "a": "Darmowy plan open-core zawiera wszystkie pluginy społecznościowe i podstawowe możliwości platformy. Pluginy Pro aktywują się na każdym płatnym planie."
    },
    {
        "q": "Jak zainstalować plugin?",
        "a": "Przejdź do Rejestru Pluginów w dashboardzie Instra, kliknij Zainstaluj przy wybranym pluginie  ładuje się natychmiast. Bez restartu ani konfiguracji."
    },
    {
        "q": "Czy mogę połączyć swoje narzędzia marketingowe?",
        "a": "Tak. Instra integruje się z HubSpot, Mailchimp, Google Analytics, Meta Ads, Slack i dziesiątkami innych przez OAuth z ograniczonymi uprawnieniami."
    },
    {
        "q": "Jakie narzędzia deweloperskie są obsługiwane?",
        "a": "Ekosystem pluginów obsługuje GitHub, Jira, Vercel, Supabase, Stripe i więcej. Pluginy deweloperskie umożliwiają triggery webhook, hooki CI/CD i niestandardowe pipelines zdarzeń."
    },
    {
        "q": "Czy system pluginów jest naprawdę open source?",
        "a": "Tak. Rdzeń platformy jest na licencji MIT, a API pluginów jest w pełni otwarte. Każdy deweloper może budować i publikować pluginy przez pull request lub npm pod @instra."
    },
    {
        "q": "Jak pluginy są izolowane?",
        "a": "Pluginy komunikują się wyłącznie przez PluginContext API  brak dostępu do bazy danych ani zmiennych środowiskowych. Każda akcja pluginu jest zapisywana w logu audytu."
    },
    {
        "q": "Czy mogę zbudować własny prywatny plugin?",
        "a": "Oczywiście. Prywatne pluginy zostają w Twoim workspace i nigdy nie są publikowane w rejestrze. Napisz je w TypeScript zgodnie z interfejsem InstraPlugin."
    },
    {
        "q": "Co się stanie jeśli plugin przestanie działać?",
        "a": "Każdy slot pluginu jest opakowany w ErrorBoundary. Wadliwy plugin jest izolowany i pokazuje stan błędu  nigdy nie crashuje reszty workspace'u."
    }
]
```

- [ ] **Step 3: Commit**

```bash
git add locales/en/common.json locales/pl/common.json
git commit -m "feat(i18n): add usecase page translations for all sections"
```

---

## Task 2: ProblemSection Component

**Files:**
- Create: `components/ui/ProblemSection.tsx`
- Create: `docs/ProblemSection.md`

- [ ] **Step 1: Create the component**

Create `components/ui/ProblemSection.tsx` with the full content below:

```tsx
"use client";

import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import { useTranslation } from "react-i18next";
import { FiShuffle, FiClock, FiSlash } from "react-icons/fi";
import type { ElementType } from "react";

/* ── Types ─────────────────────────────────────────────────────── */

interface ProblemItem {
  title: string;
  body: string;
}

/* ── Constants ──────────────────────────────────────────────────── */

const CLIP = "polygon(0 0, calc(100% - 16px) 0, 100% 16px, 100% 100%, 16px 100%, 0 calc(100% - 16px))";
const CLIP_CHIP = "polygon(0 0, calc(100% - 8px) 0, 100% 8px, 100% 100%, 8px 100%, 0 calc(100% - 8px))";

const PAIN_ICONS: ElementType[] = [FiShuffle, FiClock, FiSlash];

/** Deterministic scattered positions for chaos visualization chips */
const TOOL_POSITIONS = [
  { top: "8%",  left: "5%",  rotate: -8 },
  { top: "22%", left: "55%", rotate:  4 },
  { top: "5%",  left: "70%", rotate: -3 },
  { top: "40%", left: "15%", rotate:  6 },
  { top: "55%", left: "60%", rotate: -12 },
  { top: "70%", left: "30%", rotate:  3 },
  { top: "35%", left: "75%", rotate:  8 },
  { top: "80%", left: "68%", rotate: -5 },
  { top: "15%", left: "35%", rotate: -7 },
  { top: "65%", left: "5%",  rotate: 10 },
  { top: "48%", left: "42%", rotate: -4 },
  { top: "88%", left: "45%", rotate:  6 },
] as const;

const SCATTERED_TOOLS = [
  "Mailchimp", "HubSpot", "Slack", "Notion", "Jira",
  "Analytics", "Meta Ads", "Stripe", "Vercel", "GitHub",
  "Figma", "Zapier",
];

/* ── Framer Motion variants ─────────────────────────────────────── */

const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.13, delayChildren: 0.05 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 28 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] as const },
  },
};

const headerVariants = {
  hidden: { opacity: 0, y: 18 },
  visible: (delay: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, delay, ease: [0.22, 1, 0.36, 1] as const },
  }),
};

/* ── Main component ─────────────────────────────────────────────── */

/**
 * ProblemSection  communicates Instra's core problem: scattered tools
 * causing context-switching and lost productivity.
 * Left: animated pain-point cards. Right: chaos visualization of tool names.
 *
 * @example
 * <ProblemSection />
 */
export default function ProblemSection() {
  const { t } = useTranslation();
  const headerRef = useRef<HTMLDivElement>(null);
  const headerInView = useInView(headerRef, { once: true, margin: "-60px" });
  const cardsRef = useRef<HTMLDivElement>(null);
  const cardsInView = useInView(cardsRef, { once: true, margin: "-80px" });
  const chaosRef = useRef<HTMLDivElement>(null);
  const chaosInView = useInView(chaosRef, { once: true, margin: "-80px" });

  const rawItems = t("usecaseProblem.items", { returnObjects: true });
  const items: ProblemItem[] = Array.isArray(rawItems) ? (rawItems as ProblemItem[]) : [];

  return (
    <section
      className="relative w-full bg-surface-container-lowest overflow-hidden border-t border-white/[0.07]"
      aria-labelledby="problem-section-heading"
    >
      <div className="relative z-10 max-w-[1280px] mx-auto px-5 md:px-16 py-24 md:py-32">
        <div className="flex flex-col lg:flex-row gap-16 lg:gap-24">

          {/* ── Left: header + pain-point cards ───────────────────── */}
          <div className="w-full lg:w-[58%]">
            <div ref={headerRef} className="mb-12">
              <motion.p
                custom={0}
                variants={headerVariants}
                initial="hidden"
                animate={headerInView ? "visible" : "hidden"}
                className="font-['JetBrains_Mono'] text-sm font-medium tracking-[0.06em] uppercase text-on-surface-variant mb-4"
              >
                {t("usecaseProblem.badge")}
              </motion.p>
              <motion.h2
                id="problem-section-heading"
                custom={0.08}
                variants={headerVariants}
                initial="hidden"
                animate={headerInView ? "visible" : "hidden"}
                className="font-['Hanken_Grotesk'] text-4xl md:text-[52px] font-semibold text-white leading-tight"
                style={{ letterSpacing: "-0.03em" }}
              >
                {t("usecaseProblem.heading")
                  .split("\n")
                  .map((line, i) => (
                    <span key={i} className="block">
                      {line}
                    </span>
                  ))}
              </motion.h2>
              <motion.div
                initial={{ scaleX: 0, originX: 0 }}
                animate={headerInView ? { scaleX: 1 } : {}}
                transition={{ duration: 0.75, delay: 0.28, ease: "easeOut" }}
                className="mt-5 h-px w-20 bg-white/20"
              />
            </div>

            <div ref={cardsRef}>
              <motion.div
                className="flex flex-col gap-3"
                variants={containerVariants}
                initial="hidden"
                animate={cardsInView ? "visible" : "hidden"}
              >
                {items.map((item, index) => {
                  const Icon = PAIN_ICONS[index];
                  return (
                    <motion.div
                      key={index}
                      variants={itemVariants}
                      className="group relative p-[1px] bg-white/10 hover:bg-white/20 transition-colors duration-300"
                      style={{ clipPath: CLIP }}
                    >
                      <div
                        className="relative flex gap-4 items-start p-5 bg-surface-container"
                        style={{ clipPath: CLIP }}
                      >
                        <div
                          className="flex items-center justify-center w-9 h-9 shrink-0 border border-white/10 bg-surface-container-high"
                          aria-hidden="true"
                        >
                          {Icon && <Icon size={16} className="text-on-surface-variant" />}
                        </div>
                        <div className="flex flex-col gap-1">
                          <h3 className="font-['Hanken_Grotesk'] text-sm font-semibold text-white">
                            {item.title}
                          </h3>
                          <p className="font-['Hanken_Grotesk'] text-sm text-on-surface-variant leading-relaxed">
                            {item.body}
                          </p>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </motion.div>
            </div>
          </div>

          {/* ── Right: chaos visualization ────────────────────────── */}
          <div
            ref={chaosRef}
            className="hidden lg:block w-full lg:w-[42%] relative min-h-[360px]"
            aria-hidden="true"
          >
            {SCATTERED_TOOLS.map((tool, index) => {
              const pos = TOOL_POSITIONS[index] ?? { top: "50%", left: "50%", rotate: 0 };
              return (
                <motion.div
                  key={tool}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={chaosInView ? { opacity: 1, scale: 1 } : {}}
                  transition={{
                    duration: 0.45,
                    delay: index * 0.06,
                    ease: [0.22, 1, 0.36, 1],
                  }}
                  className="absolute px-3 py-1.5 border border-white/10 bg-surface-container"
                  style={{
                    top: pos.top,
                    left: pos.left,
                    transform: `rotate(${pos.rotate}deg)`,
                    clipPath: CLIP_CHIP,
                  }}
                >
                  <span className="font-['JetBrains_Mono'] text-xs text-on-surface-variant whitespace-nowrap">
                    {tool}
                  </span>
                </motion.div>
              );
            })}
            {/* Decorative dashed connection lines */}
            <svg
              className="absolute inset-0 w-full h-full opacity-10 pointer-events-none"
              aria-hidden="true"
            >
              <line x1="20%" y1="25%" x2="60%" y2="55%" stroke="white" strokeWidth="0.5" strokeDasharray="4 4" />
              <line x1="60%" y1="10%" x2="30%" y2="45%" stroke="white" strokeWidth="0.5" strokeDasharray="4 4" />
              <line x1="75%" y1="38%" x2="50%" y2="65%" stroke="white" strokeWidth="0.5" strokeDasharray="4 4" />
            </svg>
          </div>

        </div>
      </div>
    </section>
  );
}
```

- [ ] **Step 2: Create docs**

Create `docs/ProblemSection.md`:

```markdown
# ProblemSection

Communicates the core user problem Instra solves: scattered tools causing context-switching and lost productivity.

## Technologies
- Next.js (App Router, "use client")
- Framer Motion v12 (`motion`, `useInView`)
- react-i18next (`useTranslation`)
- react-icons/fi (`FiShuffle`, `FiClock`, `FiSlash`)
- TailwindCSS v4

## i18n Keys
- `usecaseProblem.badge`
- `usecaseProblem.heading` (supports `\n` for line breaks)
- `usecaseProblem.items[]`  array of `{ title, body }` (3 items)

## Layout
- 2-column on desktop (58% left / 42% right), stacked on mobile
- Left: eyebrow label + h2 + 3 pain-point cards with clip-path 16px corners
- Right: chaos visualization of scattered tool name chips (hidden on mobile)

## Example
```tsx
<ProblemSection />
```
```

- [ ] **Step 3: Commit**

```bash
git add components/ui/ProblemSection.tsx docs/ProblemSection.md
git commit -m "feat(ui): add ProblemSection component with chaos visualization"
```

---

## Task 3: HowItWorksSection Component

**Files:**
- Create: `components/ui/HowItWorksSection.tsx`
- Create: `docs/HowItWorksSection.md`

- [ ] **Step 1: Create the component**

Create `components/ui/HowItWorksSection.tsx`:

```tsx
"use client";

import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import { useTranslation } from "react-i18next";
import { FiCompass, FiDownload, FiLink2, FiZap } from "react-icons/fi";
import type { ElementType } from "react";

/* ── Types ─────────────────────────────────────────────────────── */

interface HowItWorksStep {
  title: string;
  body: string;
}

/* ── Constants ──────────────────────────────────────────────────── */

const CLIP = "polygon(0 0, calc(100% - 20px) 0, 100% 20px, 100% 100%, 20px 100%, 0 calc(100% - 20px))";

const STEP_ICONS: ElementType[] = [FiCompass, FiDownload, FiLink2, FiZap];

/* ── Framer Motion variants ─────────────────────────────────────── */

const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.12, delayChildren: 0.05 } },
};

const cardVariants = {
  hidden: { opacity: 0, y: 28 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] as const },
  },
};

const headerVariants = {
  hidden: { opacity: 0, y: 18 },
  visible: (delay: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, delay, ease: [0.22, 1, 0.36, 1] as const },
  }),
};

/* ── Main component ─────────────────────────────────────────────── */

/**
 * HowItWorksSection  2×2 bento grid of 4 numbered steps explaining
 * how Instra's plugin workflow operates. Ghost numbers, staggered entrance.
 *
 * @example
 * <HowItWorksSection />
 */
export default function HowItWorksSection() {
  const { t } = useTranslation();
  const headerRef = useRef<HTMLDivElement>(null);
  const headerInView = useInView(headerRef, { once: true, margin: "-60px" });
  const gridRef = useRef<HTMLDivElement>(null);
  const gridInView = useInView(gridRef, { once: true, margin: "-80px" });

  const rawSteps = t("usecaseHowItWorks.steps", { returnObjects: true });
  const steps: HowItWorksStep[] = Array.isArray(rawSteps) ? (rawSteps as HowItWorksStep[]) : [];

  return (
    <section
      className="relative w-full bg-background overflow-hidden border-t border-white/[0.07]"
      aria-labelledby="how-it-works-heading"
    >
      <div className="relative z-10 max-w-[1280px] mx-auto px-5 md:px-16 py-24 md:py-32">

        {/* ── Section header ─────────────────────────────────────── */}
        <div ref={headerRef} className="mb-14">
          <motion.p
            custom={0}
            variants={headerVariants}
            initial="hidden"
            animate={headerInView ? "visible" : "hidden"}
            className="font-['JetBrains_Mono'] text-sm font-medium tracking-[0.06em] uppercase text-on-surface-variant mb-4"
          >
            {t("usecaseHowItWorks.badge")}
          </motion.p>
          <motion.h2
            id="how-it-works-heading"
            custom={0.08}
            variants={headerVariants}
            initial="hidden"
            animate={headerInView ? "visible" : "hidden"}
            className="font-['Hanken_Grotesk'] text-4xl md:text-[52px] font-semibold text-white leading-tight"
            style={{ letterSpacing: "-0.03em" }}
          >
            {t("usecaseHowItWorks.heading")
              .split("\n")
              .map((line, i) => (
                <span key={i} className="block">
                  {line}
                </span>
              ))}
          </motion.h2>
          <motion.div
            initial={{ scaleX: 0, originX: 0 }}
            animate={headerInView ? { scaleX: 1 } : {}}
            transition={{ duration: 0.75, delay: 0.28, ease: "easeOut" }}
            className="mt-5 h-px w-20 bg-white/20"
          />
        </div>

        {/* ── 2×2 bento grid ─────────────────────────────────────── */}
        <div ref={gridRef}>
          <motion.div
            className="grid grid-cols-1 sm:grid-cols-2 gap-3"
            variants={containerVariants}
            initial="hidden"
            animate={gridInView ? "visible" : "hidden"}
          >
            {steps.map((step, index) => {
              const Icon = STEP_ICONS[index];
              const ghost = String(index + 1).padStart(2, "0");
              return (
                <motion.article
                  key={index}
                  variants={cardVariants}
                  className="group relative flex flex-col gap-4 p-6 md:p-8 overflow-hidden cursor-default"
                  style={{ clipPath: CLIP }}
                >
                  {/* Background layer */}
                  <div
                    className="absolute inset-0 bg-surface-container border border-white/10 transition-colors duration-200 group-hover:border-white/40"
                    style={{ clipPath: CLIP }}
                    aria-hidden="true"
                  />
                  {/* Ghost number */}
                  <span
                    className="absolute bottom-4 right-5 font-['JetBrains_Mono'] font-bold text-white select-none pointer-events-none leading-none"
                    style={{ fontSize: "80px", opacity: 0.08 }}
                    aria-hidden="true"
                  >
                    {ghost}
                  </span>
                  {/* Step icon */}
                  <div
                    className="relative z-10 flex items-center justify-center w-10 h-10 border border-white/10 bg-surface-container-high shrink-0"
                    aria-hidden="true"
                  >
                    {Icon && <Icon size={18} className="text-white" />}
                  </div>
                  {/* Content */}
                  <div className="relative z-10 flex flex-col gap-2">
                    <h3
                      className="font-['Hanken_Grotesk'] text-lg font-semibold text-white leading-snug"
                      style={{ letterSpacing: "-0.02em" }}
                    >
                      {step.title}
                    </h3>
                    <p className="font-['Hanken_Grotesk'] text-sm text-on-surface-variant leading-relaxed">
                      {step.body}
                    </p>
                  </div>
                </motion.article>
              );
            })}
          </motion.div>
        </div>

      </div>
    </section>
  );
}
```

- [ ] **Step 2: Create docs**

Create `docs/HowItWorksSection.md`:

```markdown
# HowItWorksSection

2×2 bento grid of 4 numbered steps explaining the Instra plugin workflow.

## Technologies
- Framer Motion v12, react-i18next, react-icons/fi, TailwindCSS v4

## i18n Keys
- `usecaseHowItWorks.badge`
- `usecaseHowItWorks.heading`
- `usecaseHowItWorks.steps[]`  array of `{ title, body }` (4 items)

## Layout
- 2×2 grid on desktop (`sm:grid-cols-2`), single column on mobile
- Each card: ghost number (80px, opacity 8%), icon, title, description
- clip-path 20px corners; border white/10% → white/40% on hover

## Example
```tsx
<HowItWorksSection />
```
```

- [ ] **Step 3: Commit**

```bash
git add components/ui/HowItWorksSection.tsx docs/HowItWorksSection.md
git commit -m "feat(ui): add HowItWorksSection bento grid component"
```

---

## Task 4: WorkflowSection Component

**Files:**
- Create: `components/ui/WorkflowSection.tsx`
- Create: `docs/WorkflowSection.md`

- [ ] **Step 1: Create the component**

Create `components/ui/WorkflowSection.tsx`:

```tsx
"use client";

import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import { useTranslation } from "react-i18next";
import { FiCompass, FiDownload, FiLink2, FiZap } from "react-icons/fi";
import type { ElementType } from "react";

/* ── Types ─────────────────────────────────────────────────────── */

interface WorkflowStep {
  title: string;
  body: string;
}

/* ── Constants ──────────────────────────────────────────────────── */

const STEP_ICONS: ElementType[] = [FiCompass, FiDownload, FiLink2, FiZap];

const CLIP_NODE = "polygon(0 0, calc(100% - 8px) 0, 100% 8px, 100% 100%, 8px 100%, 0 calc(100% - 8px))";
const CLIP_NODE_SM = "polygon(0 0, calc(100% - 6px) 0, 100% 6px, 100% 100%, 6px 100%, 0 calc(100% - 6px))";

/* ── Framer Motion variants ─────────────────────────────────────── */

const headerVariants = {
  hidden: { opacity: 0, y: 18 },
  visible: (delay: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, delay, ease: [0.22, 1, 0.36, 1] as const },
  }),
};

/* ── Main component ─────────────────────────────────────────────── */

/**
 * WorkflowSection  horizontal 4-step timeline on desktop, vertical on mobile.
 * Animated connector line (scaleX/scaleY) triggered by scroll via useInView.
 *
 * @example
 * <WorkflowSection />
 */
export default function WorkflowSection() {
  const { t } = useTranslation();
  const headerRef = useRef<HTMLDivElement>(null);
  const headerInView = useInView(headerRef, { once: true, margin: "-60px" });
  const timelineRef = useRef<HTMLDivElement>(null);
  const timelineInView = useInView(timelineRef, { once: true, margin: "-80px" });

  const rawSteps = t("usecaseWorkflow.steps", { returnObjects: true });
  const steps: WorkflowStep[] = Array.isArray(rawSteps) ? (rawSteps as WorkflowStep[]) : [];

  return (
    <section
      className="relative w-full bg-surface-container-lowest overflow-hidden border-t border-white/[0.07]"
      aria-labelledby="workflow-section-heading"
    >
      <div className="relative z-10 max-w-[1280px] mx-auto px-5 md:px-16 py-24 md:py-32">

        {/* ── Section header ─────────────────────────────────────── */}
        <div ref={headerRef} className="mb-16 md:mb-20">
          <motion.p
            custom={0}
            variants={headerVariants}
            initial="hidden"
            animate={headerInView ? "visible" : "hidden"}
            className="font-['JetBrains_Mono'] text-sm font-medium tracking-[0.06em] uppercase text-on-surface-variant mb-4"
          >
            {t("usecaseWorkflow.badge")}
          </motion.p>
          <motion.h2
            id="workflow-section-heading"
            custom={0.08}
            variants={headerVariants}
            initial="hidden"
            animate={headerInView ? "visible" : "hidden"}
            className="font-['Hanken_Grotesk'] text-4xl md:text-[52px] font-semibold text-white leading-tight"
            style={{ letterSpacing: "-0.03em" }}
          >
            {t("usecaseWorkflow.heading")
              .split("\n")
              .map((line, i) => (
                <span key={i} className="block">
                  {line}
                </span>
              ))}
          </motion.h2>
          <motion.div
            initial={{ scaleX: 0, originX: 0 }}
            animate={headerInView ? { scaleX: 1 } : {}}
            transition={{ duration: 0.75, delay: 0.28, ease: "easeOut" }}
            className="mt-5 h-px w-20 bg-white/20"
          />
        </div>

        {/* ── Timeline ───────────────────────────────────────────── */}
        <div ref={timelineRef}>

          {/* Desktop: horizontal */}
          <div className="hidden lg:block relative">
            {/* Track line */}
            <div className="absolute top-5 left-5 right-5 h-px bg-white/10" aria-hidden="true">
              <motion.div
                className="h-full bg-white/30 origin-left"
                initial={{ scaleX: 0 }}
                animate={timelineInView ? { scaleX: 1 } : {}}
                transition={{ duration: 0.8, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
              />
            </div>

            <div className="grid grid-cols-4 gap-6">
              {steps.map((step, index) => {
                const Icon = STEP_ICONS[index];
                return (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 20 }}
                    animate={timelineInView ? { opacity: 1, y: 0 } : {}}
                    transition={{
                      duration: 0.5,
                      delay: index * 0.12 + 0.1,
                      ease: [0.22, 1, 0.36, 1],
                    }}
                    className="flex flex-col gap-4"
                  >
                    {/* Node icon */}
                    <div
                      className="relative z-10 flex items-center justify-center w-10 h-10 border border-white/30 bg-surface-container-lowest shrink-0"
                      style={{ clipPath: CLIP_NODE }}
                    >
                      {Icon && <Icon size={16} className="text-white" />}
                    </div>
                    {/* Text */}
                    <div className="flex flex-col gap-1.5 pt-4">
                      <span className="font-['JetBrains_Mono'] text-xs font-medium tracking-[0.08em] uppercase text-on-surface-variant">
                        {String(index + 1).padStart(2, "0")}
                      </span>
                      <h3
                        className="font-['Hanken_Grotesk'] text-lg font-semibold text-white leading-snug"
                        style={{ letterSpacing: "-0.02em" }}
                      >
                        {step.title}
                      </h3>
                      <p className="font-['Hanken_Grotesk'] text-sm text-on-surface-variant leading-relaxed">
                        {step.body}
                      </p>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>

          {/* Mobile: vertical */}
          <div className="lg:hidden flex flex-col relative pl-10">
            {/* Track line */}
            <div className="absolute left-[19px] top-0 bottom-0 w-px bg-white/10" aria-hidden="true">
              <motion.div
                className="w-full bg-white/30 origin-top"
                initial={{ scaleY: 0 }}
                animate={timelineInView ? { scaleY: 1 } : {}}
                transition={{ duration: 0.8, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
                style={{ height: "100%" }}
              />
            </div>

            {steps.map((step, index) => {
              const Icon = STEP_ICONS[index];
              return (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: -16 }}
                  animate={timelineInView ? { opacity: 1, x: 0 } : {}}
                  transition={{
                    duration: 0.5,
                    delay: index * 0.12 + 0.1,
                    ease: [0.22, 1, 0.36, 1],
                  }}
                  className="flex gap-5 pb-10 last:pb-0"
                >
                  {/* Node icon  positioned over the track line */}
                  <div
                    className="absolute left-0 flex items-center justify-center w-9 h-9 border border-white/30 bg-surface-container-lowest shrink-0 -translate-x-[1px]"
                    style={{ clipPath: CLIP_NODE_SM, marginTop: "2px" }}
                  >
                    {Icon && <Icon size={14} className="text-white" />}
                  </div>
                  {/* Text */}
                  <div className="flex flex-col gap-1">
                    <span className="font-['JetBrains_Mono'] text-xs text-on-surface-variant tracking-[0.08em] uppercase">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <h3
                      className="font-['Hanken_Grotesk'] text-base font-semibold text-white"
                      style={{ letterSpacing: "-0.01em" }}
                    >
                      {step.title}
                    </h3>
                    <p className="font-['Hanken_Grotesk'] text-sm text-on-surface-variant leading-relaxed">
                      {step.body}
                    </p>
                  </div>
                </motion.div>
              );
            })}
          </div>

        </div>
      </div>
    </section>
  );
}
```

- [ ] **Step 2: Create docs**

Create `docs/WorkflowSection.md`:

```markdown
# WorkflowSection

4-step horizontal timeline (desktop) / vertical timeline (mobile) showing the Instra plugin workflow.

## Technologies
- Framer Motion v12, react-i18next, react-icons/fi, TailwindCSS v4

## i18n Keys
- `usecaseWorkflow.badge`
- `usecaseWorkflow.heading`
- `usecaseWorkflow.steps[]`  array of `{ title, body }` (4 items)

## Animation
- Connector line: `scaleX: 0→1` (desktop) / `scaleY: 0→1` (mobile), 0.8s duration
- Step nodes: staggered `opacity + y` entrance, 0.12s per step

## Example
```tsx
<WorkflowSection />
```
```

- [ ] **Step 3: Commit**

```bash
git add components/ui/WorkflowSection.tsx docs/WorkflowSection.md
git commit -m "feat(ui): add WorkflowSection animated timeline component"
```

---

## Task 5: IntegrationsSection Component

**Files:**
- Create: `components/ui/IntegrationsSection.tsx`
- Create: `docs/IntegrationsSection.md`

- [ ] **Step 1: Create the component**

Create `components/ui/IntegrationsSection.tsx`:

```tsx
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
```

- [ ] **Step 2: Create docs**

Create `docs/IntegrationsSection.md`:

```markdown
# IntegrationsSection

Masonry grid of 10 integration chips (marketing + dev tools) with a "+120 more" chip.

## Technologies
- Framer Motion v12, react-i18next, react-icons/si, react-icons/fi, TailwindCSS v4

## i18n Keys
- `usecaseIntegrations.badge`
- `usecaseIntegrations.heading`
- `usecaseIntegrations.subtitle`
- `usecaseIntegrations.moreLabel`

## Layout
- CSS `columns-2 md:columns-3` for masonry effect
- `break-inside-avoid` on each card prevents column splits
- Featured cards have a tagline → taller → creates masonry height variation
- Mobile: 2 columns; Desktop: 3 columns

## Example
```tsx
<IntegrationsSection />
```
```

- [ ] **Step 3: Commit**

```bash
git add components/ui/IntegrationsSection.tsx docs/IntegrationsSection.md
git commit -m "feat(ui): add IntegrationsSection masonry grid component"
```

---

## Task 6: Update FAQ with UseCase Category

**Files:**
- Modify: `components/ui/FAQ.tsx`

- [ ] **Step 1: Add usecase to categories array**

In `components/ui/FAQ.tsx`, find the `categories` array (lines 14–18):

```typescript
const categories = [
    { id: "general", labelKey: "faq.categories.general" },
    { id: "pricing", labelKey: "faq.categories.pricing" },
    { id: "security", labelKey: "faq.categories.security" },
];
```

Replace it with:

```typescript
const categories = [
    { id: "general",  labelKey: "faq.categories.general"  },
    { id: "pricing",  labelKey: "faq.categories.pricing"  },
    { id: "security", labelKey: "faq.categories.security" },
    { id: "usecase",  labelKey: "faq.categories.usecase"  },
];
```

- [ ] **Step 2: Commit**

```bash
git add components/ui/FAQ.tsx
git commit -m "feat(ui): add Plugins & Workflows category to FAQ component"
```

---

## Task 7: Assemble UseCase Page

**Files:**
- Modify: `app/(pages)/usecase/page.tsx`

- [ ] **Step 1: Replace the empty page**

Replace the full content of `app/(pages)/usecase/page.tsx` with:

```tsx
import type { Metadata } from "next";
import { buildMetadata, pageMetadata } from "@/lib/seo/metadata";
import PageHeader from "@/components/ui/PageHeader";
import ProblemSection from "@/components/ui/ProblemSection";
import HowItWorksSection from "@/components/ui/HowItWorksSection";
import WorkflowSection from "@/components/ui/WorkflowSection";
import IntegrationsSection from "@/components/ui/IntegrationsSection";
import { FAQ } from "@/components/ui/FAQ";
import CTA from "@/components/ui/CTA";

export const metadata: Metadata = buildMetadata(pageMetadata.usecases);

/** UseCase page  communicates problem, solution, workflow, integrations, and FAQs. */
export default function UseCasesPage() {
  return (
    <>
      <PageHeader i18nPrefix="usecaseHeader" headingId="usecase-heading" />
      <ProblemSection />
      <HowItWorksSection />
      <WorkflowSection />
      <IntegrationsSection />
      <FAQ />
      <CTA />
    </>
  );
}
```

- [ ] **Step 2: Verify the page builds**

Run:
```bash
npm run build
```

Expected: No TypeScript errors. Build completes successfully. If there are import errors, verify the component file names match exactly.

- [ ] **Step 3: Commit**

```bash
git add app/(pages)/usecase/page.tsx
git commit -m "feat(pages): assemble UseCase page with all sections"
```

---

## Verification

After all tasks complete:

1. Start dev server: `npm run dev`
2. Navigate to `http://localhost:3000/usecase`
3. Verify each section renders:
   - PageHeader: eyebrow label + large heading
   - ProblemSection: 3 pain-point cards + chaos chips on desktop
   - HowItWorksSection: 2×2 bento grid with ghost numbers
   - WorkflowSection: horizontal timeline on desktop, vertical on mobile
   - IntegrationsSection: masonry grid of 10 chips + "+120 more"
   - FAQ: "Plugins & Workflows" tab visible and loads 8 Q&A items
   - CTA: appears at bottom
4. Scroll through the page to confirm all Framer Motion entrance animations trigger
5. Resize to mobile (375px) to verify responsive layouts
6. Switch language (if language switcher exists) to verify Polish translations load
