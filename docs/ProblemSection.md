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
