# FeaturesSection

Bento-grid section showcasing Instra's six core features. Hero tile spans two rows on large screens; five smaller tiles fill the right columns. All cards use the cut-corner clip-path from Values.tsx.

## Technologies
- Next.js (App Router, `"use client"`)
- React, TypeScript
- Framer Motion (`motion`, `useInView`, stagger variants)
- react-i18next
- Tailwind CSS + design tokens from `globals.css`

## Layout

```
[ Hero (2-row) ] [ Small ] [ Small ]
                 [ Small ] [ Small ]
                 [ Small ]
```

On mobile: single-column stack. On md: 2 columns. On lg: 3 columns with hero spanning 2 rows.

## i18n Keys (`featuresSection.*`)

| Key | Type | Description |
|-----|------|-------------|
| `featuresSection.label` | string | Mono label above heading |
| `featuresSection.heading` | string | Section heading |
| `featuresSection.features` | `FeatureItem[]` | Array of feature cards (first = hero) |

### `FeatureItem` shape

```ts
interface FeatureItem {
  id: string;          // Unique key
  icon: string;        // Unicode symbol rendered in icon box
  title: string;       // Card heading
  description: string; // Card body copy
}
```

## Parameters
`FeaturesSection` accepts no props  all data is driven by i18n.

## Example
```tsx
import FeaturesSection from "@/components/ui/FeaturesSection";

<FeaturesSection />
```
