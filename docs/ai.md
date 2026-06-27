# AI Module

## Overview

Thin AI core that generates social-media captions via [OpenRouter](https://openrouter.ai/).
Built on the [Vercel AI SDK](https://sdk.vercel.ai/). One model, one action, no abstraction overhead.

## Technologies

- `ai` (Vercel AI SDK)  `generateText`
- `@openrouter/ai-sdk-provider`  OpenRouter adapter
- Default model: `openai/gpt-oss-120b:free`

## Files

| Path | Purpose |
|------|---------|
| `lib/ai/client.ts` | Server-only provider + `generateCaption()` |
| `features/ai/actions/generateCaption.ts` | Server Action (auth → rate-limit → validate → call) |
| `features/ai/validation.ts` | Zod schema for action input |
| `features/ai/types.ts` | `GenerateCaptionState` |
| `features/ai/index.ts` | Public barrel |
| `components/ui/posts/AiCaptionButton.tsx` | UI button wired into PostComposer |

## Env Vars

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `OPENROUTER_API_KEY` | ✅ |  | OpenRouter account key |
| `OPENROUTER_MODEL` | ❌ | `openai/gpt-oss-120b:free` | Model slug  swap with one env change |

### Swapping Models

Change `OPENROUTER_MODEL` in `.env` to any OpenRouter model slug, e.g.:
```
OPENROUTER_MODEL=anthropic/claude-haiku-4-5
```

No code change required.

## Rate Limiting

`generateCaption` preset: **20 calls / 1 hour / user** (tuned for free-model tier limits).
Defined in `lib/rate-limit/config.ts`. Increase if a paid model is used.

## Action Flow

```
verifySession() → rateLimit('generateCaption') → Zod safeParse → generateCaption() → { text } | { errors }
```

Errors from the LLM call are caught and returned as `{ errors: { _form: ['ai.error'] } }`  no stack traces exposed.

## Parameters

### `generateCaption` (lib/ai/client.ts)

| Param | Type | Description |
|-------|------|-------------|
| `prompt` | `string` | Topic / draft text (max 500 chars) |
| `language` | `'pl' \| 'en'` | Output language |

Returns: `Promise<string>`  trimmed caption.

## Example

```ts
import { generateCaption } from '@/features/ai'

const result = await generateCaption({}, { prompt: 'morning coffee ritual', language: 'en' })
// result.text → "There's nothing like that first sip. ☕ #MorningVibes"
```
