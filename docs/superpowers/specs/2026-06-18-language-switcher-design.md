# Language Switcher in Navbar  Design Spec

**Date:** 2026-06-18  
**Status:** Approved

---

## Goal

Add a language switcher to the Navbar that lets users toggle between **EN** and **PL** at runtime via `react-i18next`.

---

## Supported Locales

Defined in `lib/i18n/config.ts`: `["en", "pl"]`. No new locales are introduced.

---

## Components

### `components/ui/LanguageSwitcher.tsx`

Isolated client component. Responsibilities:
- Read current language via `const { i18n } = useTranslation()`
- Display active language code uppercased (`EN` / `PL`) + chevron icon
- On click: open a dropdown listing all `supportedLocales`
- On locale select: call `i18n.changeLanguage(locale)`, close dropdown
- Close dropdown on outside click (`useRef` + `useEffect`)
- Active locale marked with a checkmark (`✓`)

**Styling:** matches existing profile dropdown  glassmorphism `rgba(26,28,24,0.92)`, `border: 1px solid rgba(255,255,255,0.08)`, `framer-motion` fade-in animation, font-mono labels.

**No persistence**  language resets on page refresh (localStorage persistence is out of scope).

---

## Navbar integration

**Desktop** (`hidden md:flex` auth section): insert `<LanguageSwitcher />` between nav links and auth buttons.

**Mobile menu** (`flex flex-col` mobile section): insert `<LanguageSwitcher />` before the auth buttons block, full-width style consistent with mobile menu items.

---

## i18n keys

Add to `/locales/en/common.json` and `/locales/pl/common.json`:

```json
"lang": {
  "en": "English",
  "pl": "Polski"
}
```

---

## Out of scope

- Persisting language preference to localStorage or user profile
- URL-based locale routing (Next.js i18n routing)
- Adding new languages beyond EN/PL
