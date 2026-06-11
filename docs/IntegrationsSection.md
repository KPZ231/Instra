# IntegrationsSection

Masonry grid of 10 integration chips (marketing + dev tools) with a "+120 more" chip.

## Technologies
- Framer Motion v12, react-i18next, react-icons/si, react-icons/fi, TailwindCSS v4

## i18n Keys
- `usecaseIntegrations.badge`
- `usecaseIntegrations.heading`
- `usecaseIntegrations.subtitle`
- `usecaseIntegrations.moreLabel`

## Layout
- CSS `columns-2 md:columns-3` for masonry effect
- `break-inside-avoid` on each card prevents column splits
- Featured cards have a tagline → taller → creates masonry height variation
- Mobile: 2 columns; Desktop: 3 columns

## Example
```tsx
<IntegrationsSection />
```
