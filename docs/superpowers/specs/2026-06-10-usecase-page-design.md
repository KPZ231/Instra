# UseCase Page  Design Spec
**Date:** 2026-06-10  
**Status:** Approved  
**Stack:** Next.js 14, React, TypeScript, Framer Motion v12, react-i18next, TailwindCSS v4

---

## Context

The `/usecase` page is currently an empty skeleton. It targets **marketers and developers** using Instra's open-core plugin platform. The core problem it communicates: users waste time context-switching between scattered, disconnected tools. Instra solves this by providing a plugin system that connects everything into one unified workflow.

---

## Design Direction: Visual-First Interactive

Each section is "show don't tell"  animations and visual metaphors carry the message. Consistent with existing Executive Precision design system: dark surfaces, cut-corner clip-paths (12–20px), Framer Motion scroll-triggered entrance animations, Hanken Grotesk headings + JetBrains Mono data labels.

---

## Page Structure

```
UseCasesPage
├── PageHeader (existing, i18nPrefix="usecaseHeader")
├── ProblemSection
├── HowItWorksSection
├── WorkflowSection
├── IntegrationsSection
├── FAQ (existing, usecase category)
└── CTA (existing)
```

---

## Components

### 1. `ProblemSection.tsx`
**Location:** `/components/ui/ProblemSection.tsx`

**Layout:** 2-column (60/40 split on desktop, stacked on mobile)
- **Left (60%):** Badge "The Problem" + large headline + 3 pain-point cards
  - Each card: icon + short text, 16px clip-path corners, border white/10%
  - Entrance: staggered fade+y(28) with `delay: index * 0.13s`
- **Right (40%):** "Chaos visualization"  scattered tool-name chips overlapping at random rotations, animated in on scroll
- **Background:** `surface-container-lowest` (#0d0f0b)
- **Animation trigger:** `useInView({ once: true, margin: "-80px" })`

**i18n keys:** `usecaseProblem.badge`, `usecaseProblem.heading`, `usecaseProblem.items[0..2].title`, `usecaseProblem.items[0..2].body`

---

### 2. `HowItWorksSection.tsx`
**Location:** `/components/ui/HowItWorksSection.tsx`

**Layout:** 2×2 bento grid (desktop), 1-column (mobile)
- Each card:
  - Ghost number 01–04 (JetBrains Mono, 80px, opacity 8%)
  - React-icon (24px, white)
  - Title (Hanken Grotesk, 600, 18px)
  - Description (body-md, on-surface-variant)
  - 20px clip-path corners
  - Border: `white/10%` → `white/40%` on hover (transition 200ms)
- **Animation:** `containerVariants` stagger, each child `delay: index * 0.12s`, `y: 28 → 0`, `opacity: 0 → 1`

**i18n keys:** `usecaseHowItWorks.badge`, `usecaseHowItWorks.heading`, `usecaseHowItWorks.steps[0..3].icon`, `usecaseHowItWorks.steps[0..3].title`, `usecaseHowItWorks.steps[0..3].body`

---

### 3. `WorkflowSection.tsx`
**Location:** `/components/ui/WorkflowSection.tsx`

**Layout:** Horizontal timeline (desktop), vertical (mobile)
- 4 steps: Choose → Install → Connect → Automate
- **Connector line:** `motion.div` with `scaleX: 0 → 1`, triggered by parent `useInView`, `ease: [0.22, 1, 0.36, 1]`, duration 0.8s
- Each step:
  - Number chip (JetBrains Mono, bone border, no fill)
  - React-icon (32px)
  - Title (headline weight)
  - Short description
- **Active state:** step in view = `border white/40%` + `opacity: 1`; others = `border white/10%` + `opacity: 0.5`
- Mobile: `transformOrigin: top` for vertical connector `scaleY: 0 → 1`

**i18n keys:** `usecaseWorkflow.badge`, `usecaseWorkflow.heading`, `usecaseWorkflow.steps[0..3].number`, `usecaseWorkflow.steps[0..3].title`, `usecaseWorkflow.steps[0..3].body`

---

### 4. `IntegrationsSection.tsx`
**Location:** `/components/ui/IntegrationsSection.tsx`

**Layout:** Masonry grid (CSS columns: 3-col desktop, 2-col tablet, 1-col mobile)
- **10 integration chips** with varied heights to create masonry effect:
  - Marketing row: HubSpot, Mailchimp, Google Analytics, Meta Ads, Slack
  - Dev row: GitHub, Jira, Vercel, Supabase, Stripe
- Each chip: react-icon + name, clip-path 12px corners, border white/10%
- **Hover:** `scale(1.04)` + border white/40% + `box-shadow: 0 0 16px rgba(232,227,217,0.15)`
- Chips have varied padding to create height differences for masonry feel
- **"+120 more" chip:** accent-bone color, dashed border, non-interactive style
- **Staggered entrance:** `delay: index * 0.06s`
- Mobile: 2-column grid (no masonry)

**i18n keys:** `usecaseIntegrations.badge`, `usecaseIntegrations.heading`, `usecaseIntegrations.subtitle`, `usecaseIntegrations.moreLabel`

---

### 5. FAQ (reuse `FAQ.tsx`)
**No new file**  existing `FAQ.tsx` is reused. New i18n category `usecase` added to:
- `faq.categories.usecase`
- `faq.questions.usecase[]` (8 Q&A pairs covering: plugin installation, open-core model, integrations, pricing, self-hosting, API access, support, custom plugins)

---

## i18n Structure (both `en` and `pl`)

New keys to add under top-level sections in `common.json`:

```json
"usecaseProblem": { ... },
"usecaseHowItWorks": { ... },
"usecaseWorkflow": { ... },
"usecaseIntegrations": { ... },
"faq": {
  "categories": { "usecase": "..." },
  "questions": { "usecase": [...] }
}
```

---

## Animation Conventions (matching existing codebase)

| Property | Value |
|----------|-------|
| Entrance easing | `[0.22, 1, 0.36, 1]` |
| Entrance duration | `0.5–0.55s` |
| Stagger delay | `0.12–0.13s per child` |
| Scroll margin | `"-80px"` |
| `once` | `true` |
| Connector line duration | `0.8s` |
| Hover transition | `200ms ease` |

---

## Clip-path Sizes (matching existing codebase)

| Component | Corner size |
|-----------|-------------|
| Pain-point cards | 16px |
| HowItWorks cards | 20px |
| Workflow steps | 16px |
| Integration chips | 12px |

---

## Files to Create/Modify

### New files
- `components/ui/ProblemSection.tsx`
- `components/ui/HowItWorksSection.tsx`
- `components/ui/WorkflowSection.tsx`
- `components/ui/IntegrationsSection.tsx`
- `docs/ProblemSection.md`
- `docs/HowItWorksSection.md`
- `docs/WorkflowSection.md`
- `docs/IntegrationsSection.md`

### Modified files
- `app/(pages)/usecase/page.tsx`  import and assemble all sections
- `locales/en/common.json`  add usecase* keys + faq.usecase
- `locales/pl/common.json`  add Polish translations

---

## Anti-patterns to Avoid

- No hardcoded strings in JSX  all text via `t()`
- No `any` TypeScript types
- No direct `fetch`/Prisma in components
- No emoji as icons  use `react-icons` only
- No `width`/`height` animations  use `transform`/`opacity` only
