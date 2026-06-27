# SEO Metadata System

## Opis

Centralny system metadanych SEO dla Instra oparty na Next.js App Router. Zamiast definiować `metadata` osobno w każdej stronie, wszystkie definicje żyją w jednym pliku  `lib/seo/metadata.ts`. Każda strona importuje gotowy obiekt i opcjonalnie go nadpisuje.

System automatycznie generuje: canonical URL, hreflang (en/pl), Open Graph, Twitter Card, metadataBase, oraz domyślne pola autora/publishera.

## Technologie

- Next.js App Router  `export const metadata` (server-side, nie React component)
- TypeScript  pełne typowanie przez `Metadata` z `next`
- `lib/seo/metadata.ts`  jedyne miejsce edycji metadanych per-strona

## API

### `buildMetadata(overrides)`

Helper scalający domyślne pola z overrides per-strona.

| Parametr | Typ | Opis |
|---|---|---|
| `overrides` | `Partial<Metadata> & { slug?: string }` | Pola do nałożenia na defaults. `slug` służy do budowania canonical URL. |

**Automatycznie ustawia:**
- `metadataBase` → `https://instra.app`
- `alternates.canonical` → `https://instra.app/{slug}`
- `alternates.languages` → en/pl warianty
- `openGraph.siteName`, `openGraph.type`, `openGraph.url`
- `twitter.card` → `summary_large_image`

### `pageMetadata`

Obiekt z gotowymi definicjami dla każdej strony. Klucze:

| Klucz | Strona | robots |
|---|---|---|
| `pageMetadata.home` | `/` | index |
| `pageMetadata.about` | `/about` | index |
| `pageMetadata.features` | `/features` | index |
| `pageMetadata.usecases` | `/usecases` | index |
| `pageMetadata.docs` | `/docs` | index |
| `pageMetadata.signin` | `/signin` | noindex |
| `pageMetadata.signup` | `/signup` | noindex |
| `pageMetadata.forgotPassword` | `/forgot-password` | noindex |

## Przykład użycia

### Podstawowe  importuj i użyj gotowego obiektu

```ts
// app/(pages)/about/page.tsx
import type { Metadata } from "next";
import { buildMetadata, pageMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = buildMetadata(pageMetadata.about);

export default function AboutPage() { ... }
```

### Nadpisanie wybranych pól lokalnie

```ts
export const metadata: Metadata = buildMetadata({
  ...pageMetadata.about,
  title: "Instra  Kim jesteśmy",
});
```

### Dynamiczne metadata (np. dla `/docs/[...slug]`)

```ts
// app/docs/[...slug]/page.tsx
import type { Metadata } from "next";
import { buildMetadata } from "@/lib/seo/metadata";

export async function generateMetadata({ params }: { params: { slug: string[] } }): Promise<Metadata> {
  const title = params.slug.at(-1) ?? "Docs";
  return buildMetadata({
    slug: `docs/${params.slug.join("/")}`,
    title: `${title}  Instra Docs`,
    description: `Dokumentacja: ${title}`,
  });
}
```

## Edycja metadanych strony

Aby zmienić tytuł lub opis konkretnej strony, edytuj odpowiedni wpis w `lib/seo/metadata.ts`:

```ts
export const pageMetadata = {
  about: {
    slug: "about",
    title: "Nowy tytuł  Instra",        // max 60 znaków
    description: "Nowy opis strony.",     // 120–155 znaków
    openGraph: { ... },
    twitter: { ... },
  },
  // ...
};
```

## Wymagania SEO (zgodnie z CLAUDE.md)

- `title`: 50–60 znaków
- `description`: 120–155 znaków
- Każda strona marketingowa: `robots: index`
- Strony auth: `robots: noindex, nofollow`
- Canonical i hreflang generowane automatycznie przez `buildMetadata`
