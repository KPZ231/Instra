# Call To Action (CTA)

## Opis
Komponent `CTA` (Call To Action) zachęca użytkownika do podjęcia kluczowej akcji na stronie. Jego budowa została oparta na dostarczonym designie docelowym (szeroki, centralnie ułożony tekst z przyciskiem) oraz zasadach **Technical Brutalism** i **Minimalism** określonych w systemie `DESIGN.md`. 

Komponent celowo odrzuca krzykliwe tła na rzecz głębokich, technicznych struktur (duże obramowania okręgów z `border-white/10`, ciemne tło `#040503`, siatka konstrukcyjna), łącząc klasyczną strukturę konwersyjną z surową precyzją. Obsługuje mechanizm i18n (`react-i18next`), więc nie posiada zahardkodowanych fraz.

## Kategorie i Wymagania Frontend Design (DFII)
- **Aesthetic name:** Editorial / Technical Brutalism.
- **DFII score:** Wysoki, dostosowany specjalnie do finansowej i marketingowej tematyki platformy Instra. Odrzuca generyczny "szum" na rzecz precyzji w detalach takich jak spacing, odczytywalność danych i stonowane barwy.

## Technologie
- React (Next.js - obsługiwany z dyrektywą `"use client"`)
- `react-i18next` - do ładowania tłumaczeń (np. nagłówków, cech).
- Tailwind CSS v4 (typografia strukturalna, siatki `flex`).
- React Icons (`FiCheck`) dla ikonek kontrolnych.

## Parametry (Props)

### Interfejs `CTAProps`
Wszystkie właściwości są opcjonalne — komponent posiada domyślne klucze tłumaczeń dopasowane do pliku `common.json`.

| Właściwość | Typ | Domyślnie | Opis |
| --- | --- | --- | --- |
| `line1Key` | `string` | `"cta.line1"` | Klucz tłumaczenia dla pierwszego wersu nagłówka. |
| `line2Key` | `string` | `"cta.line2"` | Klucz tłumaczenia dla drugiego wersu nagłówka. |
| `buttonKey` | `string` | `"cta.button"` | Klucz tłumaczenia dla tekstu wewnątrz głównego przycisku CTA. |
| `featuresKeys` | `string[]` | `["cta.feature1", "cta.feature2"]` | Tablica kluczy (i18n) dla listy atrybutów/funkcji wyświetlanych pod spodem. |
| `buttonUrl` | `string` | `"#"` | Odnośnik docelowy, do którego prowadzi przycisk. |

## Przykład Użycia

\`\`\`tsx
import { CTA } from "@/components/ui/CTA";

export default function MarketingPage() {
  return (
    <div className="w-full">
      {/* Użycie z domyślnymi kluczami konfiguracyjnymi */}
      <CTA />
      
      {/* Lub nadpisanie kluczy dla innej sekcji i innego zestawu funkcji */}
      <CTA 
        line1Key="pricing.cta.line1" 
        line2Key="pricing.cta.line2"
        buttonKey="pricing.cta.button"
        buttonUrl="/signup"
        featuresKeys={["pricing.feat1", "pricing.feat2", "pricing.feat3"]}
      />
    </div>
  );
}
\`\`\`
