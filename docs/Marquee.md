# Marquee

## Opis
Komponent `Marquee` służy do renderowania nieskończenie przewijanej listy opinii (testimonials). Został zaprojektowany zgodnie z systemem designu ("Executive Precision", "Minimalism", "Technical Brutalism"). Komponent jest w pełni zintegrowany z mechanizmem tłumaczeń (`react-i18next`), co pozwala uniknąć twardych ciągów znaków (hardcoded strings) zgodnie z wytycznymi w `CLAUDE.md`.

Obejmuje dwa eksportowane komponenty:
1. `TestimonialCard` - Karta pojedynczej opinii klienta wspierająca i18n przez hook `useTranslation()`.
2. `Marquee` - Główny kontener zarządzający ruchem.

## Technologie
- React (Next.js - obsługiwany z dyrektywą `"use client"`)
- `react-i18next` - do ładowania tłumaczeń za pomocą kluczy (np. `t("marquee.adroll.quote")`).
- Tailwind CSS v4 (do stylizacji, kolorów, typografii)
- Custom CSS Keyframes (`@keyframes`)

## Parametry (Props)

### Interfejs `Testimonial`
| Właściwość | Typ | Opis |
| --- | --- | --- |
| `company` | `string` | Nazwa firmy klienta (nie tłumaczona). |
| `quoteKey` | `string` | **Klucz tłumaczenia** dla treści opinii. |
| `author` | `string` | Imię i nazwisko autora opinii. |
| `titleKey` | `string` | **Klucz tłumaczenia** dla stanowiska autora. |
| `linkTextKey` | `string` | **Klucz tłumaczenia** dla tekstu linku. |
| `linkUrl` | `string` | Adres URL docelowy. |

### Interfejs `MarqueeProps`
| Właściwość | Typ | Domyślnie | Opis |
| --- | --- | --- | --- |
| `items` | `Testimonial[]` | Wymagane | Lista opinii (z kluczami) do wyświetlenia. |
| `speed` | `number` | `40` | Czas trwania animacji pełnego przesunięcia (w sekundach). |
| `reverse` | `boolean` | `false` | Jeśli `true`, opinie przesuwają się od lewej do prawej. |

## Przykład Użycia

\`\`\`tsx
import { Marquee, Testimonial } from "@/components/ui/Marquee";
import { useTranslation } from "react-i18next";

const testimonials: Testimonial[] = [
  {
    company: "AdRoll",
    quoteKey: "marquee.adroll.quote",
    author: "Kevin Garcia",
    titleKey: "marquee.adroll.title",
    linkTextKey: "marquee.adroll.linkText",
    linkUrl: "/case-studies/adroll"
  },
  {
    company: "Fireclay Tile",
    quoteKey: "marquee.fireclay.quote",
    author: "Jamie Chappell",
    titleKey: "marquee.fireclay.title",
    linkTextKey: "marquee.fireclay.linkText",
    linkUrl: "/case-studies/fireclay"
  }
];

export default function MarketingPage() {
  const { t } = useTranslation();

  return (
    <div className="w-full">
      <h2 className="text-headline-lg font-sans mb-8 px-8">
        {t("marquee.heading")}
      </h2>
      <Marquee items={testimonials} speed={50} />
    </div>
  );
}
\`\`\`
