import type { Duration } from '@upstash/ratelimit'

export interface RateLimitPreset {
  /** Maximum number of requests allowed in the window. */
  limit: number
  /** Sliding window duration (e.g. "1 m", "10 m", "1 h"). */
  window: Duration
}

/**
 * Central registry of rate-limit presets.
 * One place to audit and tune all limits — add a new entry here and use the key in rateLimit().
 */
export const RATE_LIMIT_PRESETS = {
  login:          { limit: 5,  window: '1 m'  },
  register:       { limit: 3,  window: '10 m' },
  forgotPassword: { limit: 3,  window: '15 m' },
  verifyEmail:    { limit: 10, window: '5 m'  },
  resendCode:      { limit: 2,  window: '1 m'  },
  createPost:      { limit: 10, window: '1 h'  },
  toggleLike:      { limit: 60, window: '1 m'  },
  publishPost:     { limit: 10, window: '1 h'  },
  socialConnect:   { limit: 5,  window: '15 m' },
  changeUsername:  { limit: 5,  window: '1 h'  },
  recordMetrics:   { limit: 60, window: '1 h'  },
  generateCaption:    { limit: 20, window: '1 h'  }, // free-model tier throttles hard
  updatePreferences:  { limit: 10, window: '1 h'  },
} satisfies Record<string, RateLimitPreset>

export type RateLimitPresetKey = keyof typeof RATE_LIMIT_PRESETS
