# WhyUs

Full-width stat section displaying three key platform metrics as bold, animated cards  description on the left, large percentage value on the right. Matches the `Executive Precision` dark design system.

## Technologies
- Next.js (App Router, `"use client"`)
- React, TypeScript
- Framer Motion (`motion`, `useInView`)
- react-i18next
- Tailwind CSS + design tokens from `globals.css`

## i18n Keys (`whyUs.*`)
| Key | Description |
|-----|-------------|
| `whyUs.label` | Small mono label above heading |
| `whyUs.heading` | Section heading |
| `whyUs.items` | Array of `{ value: string, description: string }` |

## Parameters
`WhyUs` takes no props  all data is driven by the `whyUs.items` i18n array.

`StatRow` (internal):
| Prop | Type | Description |
|------|------|-------------|
| `item` | `WhyUsStatItem` | `{ value, description }` |
| `index` | `number` | Stagger delay index |

## Example
```tsx
import WhyUs from "@/components/ui/WhyUs";

// inside a page or layout:
<WhyUs />
```
