# InstallGuide

**Path:** `components/ui/InstallGuide.tsx`

Tabbed installation instructions for Instra CLI and Desktop Agent across macOS, Windows, and Linux. Each step renders a copyable command block (inline `CopyButton` subcomponent using `navigator.clipboard`).

## Technologies
- Next.js (App Router), React, TypeScript
- framer-motion (stagger re-triggered on tab change via `key={activeOS}`)
- react-i18next (`installGuide.*` keys with `returnObjects: true`)
- react-icons/fi (`FiCopy`, `FiCheck`)

## Props
None  all copy and commands from i18n (`installGuide.<os>.steps[]`).

## i18n keys
`installGuide.badge`, `installGuide.heading`, `installGuide.tabs.*`, `installGuide.copy`, `installGuide.copied`, `installGuide.macos.steps`, `installGuide.windows.steps`, `installGuide.linux.steps`

## Example
```tsx
<InstallGuide />
```
