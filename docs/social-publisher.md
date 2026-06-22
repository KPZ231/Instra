# Social Publisher

## Opis
Moduł do publikowania postów na platformach społecznościowych (Facebook, Instagram, LinkedIn).

## Pliki
- `lib/social/publisher.ts` — orkiestrator: pobiera post, wywołuje platformy równolegle, zapisuje statusy
- `lib/social/meta.ts` — Facebook Graph API v19.0 (feed + photos) i Instagram Content Publishing API (single/carousel)
- `lib/social/linkedin.ts` — LinkedIn rest/posts API (wersja 202401)
- `lib/social/refresh.ts` — leniwy auto-refresh tokenów Meta
- `lib/social/crypto.ts` — AES-256-GCM szyfrowanie tokenów w DB
- `lib/social/types.ts` — typy: `SocialPlatform`, `PublishResult`, `SocialPostPayload`

## Technologie
- Meta Graph API v19.0
- LinkedIn REST API (versioned `202401`) — `rest/posts`, `rest/images`
- LinkedIn OpenID Connect — `/v2/userinfo` do profilu użytkownika
- Prisma ORM (tabele `Post`, `SocialAccount`, `SocialPostStatus`)

## LinkedIn API (aktualne endpointy)

### Autoryzacja OAuth
- **Scope:** `openid profile w_member_social`
- **Profil:** `GET https://api.linkedin.com/v2/userinfo` → `{ sub, name }`
- `platformUserId = urn:li:person:<sub>`

### Publikacja
- **Upload obrazu:** `POST https://api.linkedin.com/rest/images?action=initializeUpload`
  - Nagłówek: `LinkedIn-Version: 202401`
  - Body: `{ initializeUploadRequest: { owner: personUrn } }`
  - Odpowiedź: `{ value: { uploadUrl, image: urn } }` → PUT bytes → URN używany w poście
- **Post:** `POST https://api.linkedin.com/rest/posts`
  - Jedno zdjęcie: `content.media.id = imageUrn`
  - Wiele zdjęć: `content.multiImage.images = [{ id }, ...]`
  - Post ID z nagłówka `x-restli-id`

> ⚠ LinkedIn basic tier ("Share on LinkedIn") nie udostępnia refresh tokenów. Po wygaśnięciu tokena user musi reconnectować konto ręcznie.

## Meta — auto-refresh tokenów

Obsługiwany przez `lib/social/refresh.ts` → `ensureFreshToken(account)`:

- Jeśli `expiresAt > teraz + 7 dni` lub `expiresAt = null` → zwraca token bez wywołania API
- Jeśli FACEBOOK/INSTAGRAM i wygasa <7 dni → `fb_exchange_token` (POST `graph.facebook.com/v19.0/oauth/access_token`)
  - Nowy token + expiresAt zapisywane przez `upsertSocialAccount`
  - Dla FACEBOOK: odświeża też pageAccessToken przez `/me/accounts`
- Jeśli LINKEDIN wygasł → rzuca błędem z instrukcją reconnect

## Statusy postów

Tabela `SocialPostStatus` z polami: `postId`, `platform`, `status`, `platformPostId`, `error`, `publishedAt`

Stany: `PENDING → PUBLISHING → PUBLISHED / FAILED`

## Przykład
```ts
const results = await publishPost(postId, userId)
// results: [{ platform: 'FACEBOOK', success: true, platformPostId: '...' }, ...]
```
