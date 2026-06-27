# Language Switcher in Navbar  Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a dropdown language switcher (EN/PL) to the Navbar that calls `i18n.changeLanguage()` on selection.

**Architecture:** A standalone `LanguageSwitcher` client component reads the active language from `react-i18next`, renders a glassmorphism dropdown on click, and updates the i18n instance. It is inserted into the Navbar's desktop auth section and mobile menu.

**Tech Stack:** React 18, framer-motion, react-i18next, Tailwind CSS, TypeScript

## Global Constraints

- TypeScript strict  no `any`
- All UI strings via `t("key")`  no hardcoded labels
- Styling must match existing Navbar glassmorphism: `rgba(26,28,24,0.92)` background, `border: 1px solid rgba(255,255,255,0.08)`
- Components go in `/components/ui/`
- framer-motion for dropdown animation (fade + slide, same as profile dropdown)

---

### Task 1: Add i18n keys for language names

**Files:**
- Modify: `locales/en/common.json`
- Modify: `locales/pl/common.json`

**Interfaces:**
- Produces: `t("lang.en")` → `"English"`, `t("lang.pl")` → `"Polski"`

- [ ] **Step 1: Add keys to English locale**

In `locales/en/common.json`, add at the top level:

```json
"lang": {
  "en": "English",
  "pl": "Polski"
}
```

- [ ] **Step 2: Add keys to Polish locale**

In `locales/pl/common.json`, add at the top level:

```json
"lang": {
  "en": "English",
  "pl": "Polski"
}
```

- [ ] **Step 3: Commit**

```bash
git add locales/en/common.json locales/pl/common.json
git commit -m "feat(i18n): add language name keys for switcher"
```

---

### Task 2: Create `LanguageSwitcher` component

**Files:**
- Create: `components/ui/LanguageSwitcher.tsx`

**Interfaces:**
- Consumes: `supportedLocales` from `lib/i18n/config.ts`, `t("lang.en")` / `t("lang.pl")` from Task 1
- Produces: `<LanguageSwitcher />`  zero props, self-contained

- [ ] **Step 1: Create the component**

Create `components/ui/LanguageSwitcher.tsx`:

```tsx
"use client";

import { useRef, useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import { FaChevronDown, FaCheck } from "react-icons/fa6";
import { supportedLocales, type Locale } from "@/lib/i18n/config";

/**
 * @function LanguageSwitcher
 * @description Dropdown do zmiany języka interfejsu. Używa react-i18next.
 * Styl glassmorphism zgodny z Navbar profile dropdown.
 *
 * @returns {JSX.Element}
 * @example
 * <LanguageSwitcher />
 */
export default function LanguageSwitcher() {
  const { t, i18n } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const currentLocale = i18n.language as Locale;

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function handleSelect(locale: Locale) {
    i18n.changeLanguage(locale);
    setIsOpen(false);
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setIsOpen((p) => !p)}
        aria-label={t("lang.switcher_label", "Change language")}
        aria-expanded={isOpen}
        className="flex items-center gap-1.5 transition-opacity duration-150 hover:opacity-80 cursor-pointer"
        style={{ color: "var(--color-on-surface-variant)" }}
      >
        <span className="font-mono text-xs tracking-widest uppercase">
          {currentLocale}
        </span>
        <FaChevronDown
          size={10}
          style={{ color: "var(--color-outline)" }}
          className={`transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
        />
      </button>

      {isOpen && (
        <motion.div
          initial={{ opacity: 0, y: -6, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.18, ease: "easeOut" }}
          className="absolute right-0 top-full mt-3 min-w-36 py-1 rounded"
          style={{
            background: "rgba(26, 28, 24, 0.92)",
            backdropFilter: "blur(24px) saturate(160%)",
            WebkitBackdropFilter: "blur(24px) saturate(160%)",
            border: "1px solid rgba(255, 255, 255, 0.08)",
            boxShadow: "0 16px 40px rgba(0, 0, 0, 0.55), 0 0 0 0.5px rgba(255,255,255,0.04)",
          }}
        >
          {supportedLocales.map((locale) => {
            const isActive = locale === currentLocale;
            return (
              <button
                key={locale}
                onClick={() => handleSelect(locale)}
                className="w-full flex items-center justify-between px-4 py-2.5 text-sm transition-colors duration-100"
                style={{ color: isActive ? "var(--color-accent-bone)" : "var(--color-on-surface)" }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.04)")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
              >
                <span className="font-sans">{t(`lang.${locale}`)}</span>
                {isActive && <FaCheck size={10} />}
              </button>
            );
          })}
        </motion.div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit 2>&1 | grep "LanguageSwitcher"
```

Expected: no output (no errors in the new file).

- [ ] **Step 3: Commit**

```bash
git add components/ui/LanguageSwitcher.tsx
git commit -m "feat(navbar): add LanguageSwitcher component"
```

---

### Task 3: Integrate `LanguageSwitcher` into Navbar

**Files:**
- Modify: `components/ui/Navbar.tsx`

**Interfaces:**
- Consumes: `<LanguageSwitcher />` from Task 2

- [ ] **Step 1: Import LanguageSwitcher**

In `components/ui/Navbar.tsx`, add import after existing imports:

```tsx
import LanguageSwitcher from "./LanguageSwitcher";
```

- [ ] **Step 2: Insert into desktop auth section**

Find the desktop auth block (line ~108):

```tsx
{/* Desktop auth */}
<div className="hidden md:flex flex-row gap-3 items-center">
```

Add `<LanguageSwitcher />` as the first child, before the auth state conditionals:

```tsx
{/* Desktop auth */}
<div className="hidden md:flex flex-row gap-3 items-center">
  <LanguageSwitcher />

  {authState === "loading" && (
```

- [ ] **Step 3: Insert into mobile menu**

Find the mobile menu auth block (the `motion.div` with `pt-4 flex flex-col gap-2`):

```tsx
<motion.div
  className="pt-4 flex flex-col gap-2"
  ...
>
  {authState === "unauthenticated" && (
```

Add `<LanguageSwitcher />` as the first child:

```tsx
<motion.div
  className="pt-4 flex flex-col gap-2"
  initial={{ opacity: 0 }}
  animate={isMobileMenuOpen ? { opacity: 1 } : { opacity: 0 }}
  transition={{ duration: 0.2, delay: isMobileMenuOpen ? navLinks.length * 0.04 : 0 }}
>
  <LanguageSwitcher />

  {authState === "unauthenticated" && (
```

- [ ] **Step 4: Verify TypeScript compiles**

```bash
npx tsc --noEmit 2>&1 | grep -E "Navbar|LanguageSwitcher"
```

Expected: no output.

- [ ] **Step 5: Commit**

```bash
git add components/ui/Navbar.tsx
git commit -m "feat(navbar): integrate LanguageSwitcher into desktop and mobile nav"
```

---

## Self-Review Checklist

- [x] **Spec coverage:** i18n keys ✓, dropdown component ✓, desktop integration ✓, mobile integration ✓, glassmorphism style ✓, checkmark on active ✓, close on outside click ✓
- [x] **Placeholders:** none
- [x] **Type consistency:** `Locale` type used consistently, `supportedLocales` imported from config
