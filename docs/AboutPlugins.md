# AboutPlugins

Editorial section explaining Instra's open-core + subscription plugin model. Left column: prose copy with a tier diagram and stats. Right column: stagger-animated plugin card grid (4 cards + "more" placeholder).

## Technologies
- Next.js (App Router, `"use client"`)
- React, TypeScript
- Framer Motion (`motion`, `useInView`, stagger variants)
- react-i18next
- Tailwind CSS + design tokens from `globals.css`

## i18n Keys (`aboutPlugins.*`)

| Key | Type | Description |
|-----|------|-------------|
| `aboutPlugins.label` | string | Mono label above heading |
| `aboutPlugins.heading` | string | Section heading |
| `aboutPlugins.body1` | string | Lead paragraph |
| `aboutPlugins.body2` | string | Secondary paragraph |
| `aboutPlugins.modelLabel` | string | Diagram box label |
| `aboutPlugins.tierFree` | string | Free tier label in diagram |
| `aboutPlugins.tierPro` | string | Pro tier label in diagram |
| `aboutPlugins.modelDesc` | string | Model description |
| `aboutPlugins.stat1` | `{ value, label }` | Left stat |
| `aboutPlugins.stat2` | `{ value, label }` | Right stat |
| `aboutPlugins.morePlugins` | string | Footer card heading |
| `aboutPlugins.morePluginsHint` | string | Footer card sub-text |
| `aboutPlugins.plugins` | `PluginItem[]` | Array of plugin cards |

### `PluginItem` shape

```ts
interface PluginItem {
  name: string;       // Plugin display name
  tier: "free" | "pro";
  description: string;
  icon: string;       // Unicode symbol rendered in icon box
}
```

## Parameters
`AboutPlugins` accepts no props — all data is driven by i18n.

## Example
```tsx
import AboutPlugins from "@/components/ui/AboutPlugins";

<AboutPlugins />
```
