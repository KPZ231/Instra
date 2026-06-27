/**
 * Heuristic engagement prediction engine.
 * Uses EWMA (Exponentially Weighted Moving Average) when sufficient history is available,
 * falls back to a content-feature-based estimate otherwise.
 * No external dependencies  pure TypeScript.
 */

import type { MetricDataPoint, EngagementPrediction } from '../types'

const EWMA_ALPHA = 0.3
const MIN_POINTS_FOR_MEDIUM = 3
const MIN_POINTS_FOR_HIGH = 14
/** Number of future points to predict */
const PREDICT_STEPS = 7

/**
 * Determines confidence level based on available data points.
 *
 * @param seriesLength - Number of historical data points
 * @returns Confidence level
 */
function getConfidence(seriesLength: number): EngagementPrediction['confidence'] {
  if (seriesLength >= MIN_POINTS_FOR_HIGH) return 'high'
  if (seriesLength >= MIN_POINTS_FOR_MEDIUM) return 'medium'
  return 'low'
}

/**
 * Adds N days to an ISO date string (YYYY-MM-DD) without using Date mutators.
 *
 * @param isoDate - YYYY-MM-DD string
 * @param days    - Number of days to add
 * @returns New YYYY-MM-DD string
 */
function addDays(isoDate: string, days: number): string {
  const [y, m, d] = isoDate.split('-').map(Number)
  const ms = Date.UTC(y, m - 1, d) + days * 86_400_000
  return new Date(ms).toISOString().slice(0, 10)
}

/**
 * Runs EWMA over a value series and returns the last smoothed value.
 *
 * @param values - Historical values (oldest first)
 * @returns EWMA-smoothed estimate
 */
function ewma(values: number[]): number {
  return values.reduce((prev, curr) => EWMA_ALPHA * curr + (1 - EWMA_ALPHA) * prev)
}

/**
 * Computes a simple linear regression slope for future trend direction.
 * Returns 0 if fewer than 2 points.
 *
 * @param values - Historical values (oldest first)
 * @returns Slope (positive = growing, negative = declining)
 */
function linearSlope(values: number[]): number {
  if (values.length < 2) return 0
  const n = values.length
  const xMean = (n - 1) / 2
  const yMean = values.reduce((s, v) => s + v, 0) / n
  let num = 0, den = 0
  for (let i = 0; i < n; i++) {
    num += (i - xMean) * (values[i] - yMean)
    den += (i - xMean) ** 2
  }
  return den === 0 ? 0 : num / den
}

/**
 * Predicts future engagement data points from a historical series.
 * Uses EWMA baseline + linear slope for trend direction.
 *
 * @param series       - Historical data points (oldest first), may be empty
 * @param fallbackBase - Fallback base value (0–100) used when series is empty
 * @returns Prediction with confidence level and future date points
 *
 * @example
 * predictEngagement(series, 15)
 */
export function predictEngagement(
  series: MetricDataPoint[],
  fallbackBase = 10,
): EngagementPrediction {
  const lastDate = series.length > 0 ? series[series.length - 1].date : null
  const values = series.map((p) => p.value)
  const confidence = getConfidence(series.length)

  if (series.length === 0) {
    // No data  use content-feature fallback with gentle growth assumption
    const startDate = new Date().toISOString().slice(0, 10)
    return {
      confidence: 'low',
      points: Array.from({ length: PREDICT_STEPS }, (_, i) => ({
        date: addDays(startDate, i + 1),
        value: Math.min(100, Math.max(0, fallbackBase + i * 0.5)),
      })),
    }
  }

  const baseline = ewma(values)
  const slope = linearSlope(values)
  // Dampen slope for far-future predictions to avoid runaway extrapolation
  const dampening = 0.7

  const points = Array.from({ length: PREDICT_STEPS }, (_, i) => {
    const rawValue = baseline + slope * (i + 1) * dampening
    return {
      date: addDays(lastDate!, i + 1),
      value: Math.min(100, Math.max(0, rawValue)),
    }
  })

  return { confidence, points }
}
