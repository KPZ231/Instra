# Pricing Plans

## Opis
Komponent `PricingPlans` to kluczowa sekcja sprzedażowa prezentująca pakiety cenowe dla użytkowników. Został zaimplementowany zgodnie z wytycznymi designu **Technical Brutalism**, w odcieniach głębokiej czerni i szarości, odrzucając generyczne "płaskie" i "przestarzałe" wizualizacje (typu jasne cienie) na rzecz wyrazistego minimalizmu i strukturalności (np. przerywane border-linie odgradzające elementy). 

Posiada wbudowany mechanizm przełączania między płatnością miesięczną a roczną (Monthly / Annual) oraz wykorzystuje pełne tłumaczenia (i18n) z wstrzykiwaniem dynamicznych wartości ze struktury JSON. Środkowa karta jest wyróżniona m.in. delikatnym efektem skalowania (`scale-105`), wzmocnionym tłem (Level 1) oraz kontrastowym przyciskiem i odznaką (Badge).

## Technologie
- **React**: Hook `useState` do kontrolowania cyklu rozliczeniowego (Annual/Monthly).
- **react-i18next**: Wyciąganie kompleksowych bloków JSONowych konfiguracji z wykorzystaniem opcji `{ returnObjects: true }`.
- **react-icons**: Użycie `FiCheck` oraz `FiX` dla ikonek potwierdzających / wykluczających dany featuer w tabeli funkcji.
- **Tailwind CSS v4**: Zaawansowane gridy i użycie design tokenów (np. `bg-surface-container`, `text-primary`).

## Integracja Translacji
Komponent iteruje po kluczach planów (dla przykładu: `"basic"`, `"pro"`, `"enterprise"`) umieszczonych w pliku `locales/[lang]/common.json` w sekcji `"pricing.plans"`. 
Zmiana cen, tekstów, dodawanie i usuwanie funkcji, polega wyłącznie na modyfikacji pliku JSON, a nie na edytowaniu kodu `.tsx`.

## Przykład Użycia

\`\`\`tsx
import PricingPlans from "@/components/ui/PricingPlans";

export default function MarketingPage() {
  return (
    <main>
      {/* Renderowanie sekcji cennika na stronie */}
      <PricingPlans />
    </main>
  );
}
\`\`\`
