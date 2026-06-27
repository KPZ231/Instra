# PageHeader

Reusable page header  mono eyebrow label, large display heading (supports `\n` line breaks), animated rule, optional description paragraph. All copy resolved from i18n via `i18nPrefix`.

## Technologies
- Next.js (App Router, `"use client"`)
- React, TypeScript
- Framer Motion (`motion`, `useInView`)
- react-i18next
- Tailwind CSS + design tokens from `globals.css`

## Props

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `i18nPrefix` | `string` | Yes | i18n key namespace. Reads `.label`, `.heading`, `.description` under this prefix. |
| `headingId` | `string` | No | `id` attribute on the `<h1>`. Use with `aria-labelledby` on the surrounding `<main>`. |

## i18n Keys

For a given `i18nPrefix` (e.g. `"featuresHeader"`):

| Key | Required | Description |
|-----|----------|-------------|
| `${prefix}.label` | Yes | Mono eyebrow text (e.g. `"// CAPABILITIES"`) |
| `${prefix}.heading` | Yes | Display heading. Use `\n` for line breaks. |
| `${prefix}.description` | No | Optional subtitle paragraph (max ~52 chars wide) |

## Example

```json
// locales/en/common.json
"pricingHeader": {
  "label": "// PRICING",
  "heading": "Simple,\nTransparent",
  "description": "One plan for every team size. No hidden fees."
}
```

```tsx
import PageHeader from "@/components/ui/PageHeader";

<PageHeader i18nPrefix="pricingHeader" headingId="pricing-heading" />
```
