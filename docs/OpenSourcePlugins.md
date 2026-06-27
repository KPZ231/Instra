# OpenSourcePlugins

Editorial section explaining Instra's open plugin system and how developers can contribute.
Left column: heading + 3-step guide with icon rows and connector lines.
Right column: decorative static code block (manifest.json + index.ts snippet).
Bottom: full-width CTA bar with a primary "Go to Docs" link (`/docs`) and a secondary GitHub link.

## Technologies
- Next.js (App Router, `"use client"`, `next/link`)
- React, TypeScript
- Framer Motion (`motion`, `useInView`, stagger variants)
- react-i18next
- react-icons/fi (`FiCode`, `FiPackage`, `FiSend`, `FiArrowUpRight`, `FiGithub`)
- Tailwind CSS + design tokens from `globals.css`

## i18n Keys (`openSourcePlugins.*`)

| Key | Type | Description |
|-----|------|-------------|
| `openSourcePlugins.label` | string | Mono eyebrow label |
| `openSourcePlugins.heading` | string | Display heading (supports `\n` for line breaks) |
| `openSourcePlugins.body` | string | Lead paragraph |
| `openSourcePlugins.ctaTagline` | string | Short line in the bottom CTA bar |
| `openSourcePlugins.docsButton` | string | Primary button label |
| `openSourcePlugins.githubButton` | string | Secondary button label |
| `openSourcePlugins.githubAriaLabel` | string | Accessible label for the GitHub link |
| `openSourcePlugins.steps` | `PluginStep[]` | Array of 3 steps |

### `PluginStep` shape

```ts
interface PluginStep {
  icon: "code" | "package" | "send"; // maps to FiCode / FiPackage / FiSend
  title: string;
  description: string;
}
```

## Parameters
`OpenSourcePlugins` accepts no props  all data is driven by i18n.

## Example
```tsx
import OpenSourcePlugins from "@/components/ui/OpenSourcePlugins";

<OpenSourcePlugins />
```
