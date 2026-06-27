# DownloadInstra

**Path:** `components/ui/DownloadInstra.tsx`

Two bento cards presenting Instra CLI and Instra Desktop Agent with download/install actions. Matches the site's dark design system (clip-path bento, framer-motion stagger, semantic Tailwind tokens).

## Technologies
- Next.js (App Router), React, TypeScript
- framer-motion (stagger entrance)
- react-i18next (`download.*` keys)
- react-icons/fi (`FiTerminal`, `FiMonitor`, `FiCopy`, `FiCheck`, `FiExternalLink`)
- `navigator.clipboard` for copy-to-clipboard

## Props
None  all copy from i18n, all URLs from inline constants at top of file.

## i18n keys
`download.badge`, `download.heading`, `download.cli.*`, `download.agent.*`, `installGuide.copy`, `installGuide.copied`

## Example
```tsx
<DownloadInstra />
```
