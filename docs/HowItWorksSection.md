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
