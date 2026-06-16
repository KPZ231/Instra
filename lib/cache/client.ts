import { Redis } from '@upstash/redis'

let redis: Redis | null = null

/** Returns (and lazily creates) the shared Redis connection, reusing Upstash credentials. */
export function getRedis(): Redis {
  if (!redis) {
    redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL!,
      token: process.env.UPSTASH_REDIS_REST_TOKEN!,
    })
  }
  return redis
}
