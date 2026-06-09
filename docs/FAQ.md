# Frequently Asked Questions (FAQ)

## Opis
Komponent `FAQ` służy do prezentacji najczęściej zadawanych pytań i odpowiedzi w zorganizowany, minimalistyczny sposób. Bazując na koncepcjach **Technical Brutalism** oraz systemie językowym (i18n), implementuje widok z dwiema kolumnami: wyborem kategorii (po lewej) oraz listą pytań i odpowiedzi (po prawej) w formie rozwijanego akordeonu.

Na samym dole sekcji z pytaniami znajduje się wyraźna, wyróżniona belka kontaktowa („Still have a question?”), dostosowana do wytycznych wizualnych (ciemne tło `#040503`, wyraźne kąty, fonty systemowe).

## Kategorie i Wymagania Frontend Design (DFII)
- **Aesthetic name:** Executive Precision / Technical Brutalism. Odrzucono "hand-drawn squiggles" z obrazka poglądowego na rzecz precyzyjnych linii, minimalnych borderów (`border-white/10`) i mocnych kontrastów.
- **DFII score:** Wysoki - uwzględniono m.in. animacje przy rozwijaniu akordeonu (CSS transitions dla max-height), czytelność kategorii oraz monospaced font (`JetBrains Mono`) w odpowiedziach, co buduje klimat platformy dla developerów i marketerów B2B.

## Technologie
- React (stan `useState` dla aktywnej kategorii oraz otwartego pytania)
- `react-i18next` - renderowanie kluczy tłumaczeniowych i dynamicznych struktur JSON
- Tailwind CSS v4

## Struktura JSON i Translacje
Aby dodawać nowe pytania i kategorie, modyfikuje się odpowiednie wpisy w `locales/[lang]/common.json`:
- `faq.categories` - słownik z nazwami kategorii
- `faq.questions.[id]` - tablica pytań (obiekty z kluczami `q` i `a`)

## Przykład Użycia

\`\`\`tsx
import FAQ from "@/components/ui/FAQ";

export default function Page() {
  return (
    <main>
      <FAQ />
    </main>
  );
}
\`\`\`
