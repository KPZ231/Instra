/**
 * Post Analytics feature  public barrel export.
 * Import from this file only; do not import from internal lib/* directly.
 */

export type {
  EngagementMetrics,
  AggregatedMetrics,
  MetricDataPoint,
  EngagementPrediction,
  ContentScore,
  ContentIssue,
  DailyTip,
  PostAnalytics,
  AnalyticsOverviewData,
} from './types'

export { computeEngagementRate, aggregateSnapshots, buildSeries, formatMetricValue } from './lib/engagement'
export { predictEngagement } from './lib/predict'
export { scoreContent } from './lib/contentScore'
export type { ScoringInput } from './lib/contentScore'
export { buildDailyTip } from './lib/dailyTip'
export { recordMetrics } from './actions/recordMetrics'
export type { RecordMetricsInput, RecordMetricsState } from './actions/recordMetrics'
