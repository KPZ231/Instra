# Social Media Publishing — Design Spec
**Data:** 2026-06-18  
**Status:** Approved

---

## Cel

Umożliwienie użytkownikom Instry połączenia swoich kont Instagram, Facebook i LinkedIn, a następnie publikowania postów (tekst + media) na tych platformach bezpośrednio z poziomu aplikacji.

---

## Model danych

### Nowe modele Prisma

```prisma
enum Platform {
  FACEBOOK
  INSTAGRAM
  LINKEDIN
}

enum PublishStatus {
  PENDING
  PUBLISHING
  PUBLISHED
  FAILED
}

model SocialAccount {
  id                String    @id @default(cuid())
  userId            String
  platform          Platform
  accessToken       String    // zaszyfrowany AES-256
  refreshToken      String?   // zaszyfrowany AES-256
  expiresAt         DateTime?
  platformUserId    String
  platformUsername  String
  pageId            String?   // tylko Facebook — ID strony
  pageAccessToken   String?   // tylko Facebook — zaszyfrowany AES-256

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@unique([userId, platform])
  @@index([userId])
}

model SocialPostStatus {
  id             String        @id @default(cuid())
  postId         String
  platform       Platform
  status         PublishStatus @default(PENDING)
  platformPostId String?       // ID posta na zewnętrznej platformie
  error          String?
  publishedAt    DateTime?

  post Post @relation(fields: [postId], references: [id], onDelete: Cascade)

  createdAt DateTime @default(now())

  @@unique([postId, platform])
  @@index([postId])
}
```

### Zmiana w modelu Post

Dodanie relacji:

```prisma
model Post {
  // ... istniejące pola
  socialStatuses SocialPostStatus[]
}
```

---

## Architektura

### Struktura plików

```
lib/
  social/
    crypto.ts          — szyfrowanie/deszyfrowanie tokenów (AES-256, klucz z env)
    types.ts           — wspólne typy (PublishResult, SocialMediaPost)
    meta.ts            — klient Meta Graph API (Facebook + Instagram)
    linkedin.ts        — klient LinkedIn API
    publisher.ts       — orkiestrator publikacji

lib/api/
  socialAccounts.ts    — CRUD dla SocialAccount (z cache Redis)

features/social/
  actions.ts           — server actions: publishPost, disconnectAccount
  index.ts             — barrel export

app/api/social/
  connect/[platform]/route.ts    — inicjuje OAuth redirect
  callback/[platform]/route.ts   — odbiera code, wymienia na token, zapisuje w DB
  disconnect/[platform]/route.ts — usuwa SocialAccount

app/(dashboard)/settings/social/
  page.tsx             — strona zarządzania połączonymi kontami

components/ui/
  SocialConnectCard.tsx    — karta połącz/rozłącz per platforma
  SocialPublishButton.tsx  — przycisk "Opublikuj na social media" na poście
  SocialStatusBadge.tsx    — znaczek PUBLISHED / FAILED / PENDING per platforma
```

---

## Przepływ OAuth

### Meta (Facebook + Instagram)

1. Użytkownik klika "Połącz Facebook/Instagram" → `GET /api/social/connect/facebook`
2. Redirect do `https://www.facebook.com/v19.0/dialog/oauth` z uprawnieniami:
   - `pages_manage_posts`, `pages_read_engagement` (Facebook)
   - `instagram_basic`, `instagram_content_publish` (Instagram)
3. Meta wraca na `/api/social/callback/facebook?code=...`
4. Serwer wymienia `code` na krótki token, następnie wywołuje endpoint długoterminowego tokenu (60 dni)
5. Pobiera listę Pages użytkownika, wybiera pierwszą (lub pyta użytkownika)
6. Pobiera Instagram Business Account powiązany ze stroną
7. Tokeny szyfrowane AES-256, zapisywane w `SocialAccount` (osobny rekord dla FACEBOOK i INSTAGRAM)

### LinkedIn

1. Użytkownik klika "Połącz LinkedIn" → `GET /api/social/connect/linkedin`
2. Redirect do `https://www.linkedin.com/oauth/v2/authorization` z uprawnieniami:
   - `w_member_social`, `r_liteprofile`
3. LinkedIn wraca na `/api/social/callback/linkedin?code=...`
4. Serwer wymienia `code` na `access_token` (60 dni)
5. Pobiera profil użytkownika (`/v2/me`) dla `platformUserId`
6. Token zaszyfrowany AES-256, zapisywany w `SocialAccount`

---

## Przepływ publikacji

1. Użytkownik klika "Opublikuj na social media" na poście
2. Server action `publishPost(postId)` wywoływana
3. Pobierany `Post` z relacją `media[]` i `platforms[]`
4. Dla każdej platformy w `platforms[]`:
   - Sprawdzane czy istnieje `SocialAccount` dla użytkownika
   - Sprawdzane czy token nie wygasł (`expiresAt`)
   - Tworzony/aktualizowany rekord `SocialPostStatus` ze statusem `PUBLISHING`
5. `publisher.ts` wywołuje `meta.ts` i/lub `linkedin.ts` równolegle (`Promise.allSettled`)
6. Wyniki zapisywane do `SocialPostStatus` (PUBLISHED lub FAILED z komunikatem błędu)
7. Cache `SocialPostStatus` invalidowany

### Publikacja z mediami

- **Zdjęcia:** URL z Supabase Storage przekazywany bezpośrednio do Meta Graph API / LinkedIn API
- **Instagram carousel:** max 10 zdjęć — tworzone jako `media objects`, potem `carousel post`
- **Facebook:** Post z załącznikiem photo/video
- **LinkedIn:** Post z `shareMediaCategory: IMAGE` lub `VIDEO`

---

## Obsługa błędów

| Sytuacja | Zachowanie |
|---|---|
| Brak połączonego konta | `status = FAILED`, błąd: "Brak połączonego konta" |
| Wygasły token | `status = FAILED`, błąd: "Token wygasł — połącz konto ponownie" |
| Błąd API platformy | `status = FAILED`, błąd: treść z odpowiedzi API |
| Sukces jednej, błąd drugiej | Niezależne statusy per platforma |
| Przekroczony rate limit | `status = FAILED`, błąd z kodem 429 |

---

## Bezpieczeństwo

- Tokeny szyfrowane AES-256 (`lib/social/crypto.ts`), klucz w `SOCIAL_ENCRYPTION_KEY` w `.env`
- Tokeny nigdy nie wychodzą przez API do frontendu
- OAuth state parameter (CSRF protection) — losowy UUID zapisywany w sesji, weryfikowany w callbacku
- Rate limiting na akcję `publishPost`: 10 postów/godzinę per użytkownik (istniejąca warstwa `/lib/rate-limit/`)

---

## Zmienne środowiskowe

```env
# Meta (Facebook + Instagram)
META_APP_ID=
META_APP_SECRET=

# LinkedIn
LINKEDIN_CLIENT_ID=
LINKEDIN_CLIENT_SECRET=

# Szyfrowanie tokenów
SOCIAL_ENCRYPTION_KEY=   # 32-bajtowy klucz hex (openssl rand -hex 32)

# Callback URL (np. https://instra.app)
NEXT_PUBLIC_APP_URL=
```

---

## Komponenty UI

### `SocialConnectCard`

Karta per platforma w `settings/social/page.tsx`:
- Stan: połączona (nazwa konta + przycisk "Rozłącz") / niepołączona (przycisk "Połącz")
- Ikona platformy, status połączenia, data wygaśnięcia tokenu

### `SocialPublishButton`

Przycisk na widoku posta:
- Aktywny tylko gdy post ma wybrane platformy (`platforms[]` niepuste)
- Stan ładowania podczas publikacji
- Pokazuje `SocialStatusBadge` per platforma po zakończeniu

### `SocialStatusBadge`

Mały znaczek: `PUBLISHED` (zielony), `FAILED` (czerwony + tooltip z błędem), `PUBLISHING` (spinner), `PENDING` (szary)

---

## i18n

Nowe klucze w `/locales/{en,pl}/common.json` dla wszystkich tekstów UI.
