/**
 * Usage analytics presentation helpers.
 *
 * Ported from CPA Manager Plus
 * (apps/web/src/features/usage-analytics/usageAnalyticsPresentation.ts)
 * and adapted to sub2api usage contracts:
 * - metrics use sub2api snake_case fields (input_tokens, cache_read_tokens,
 *   actual_cost ...) instead of CPA camelCase monitoring rows
 * - i18n uses vue-i18n's `t` (a plain translate function), not i18next TFunction
 * - currency/tokens formatting reuses sub2api utils where practical
 *
 * All builders are pure functions so they can be unit tested without mounting
 * components.
 */

// ==================== Shared metric types ====================
// Structural mirrors of the shapes produced by sub2api usage APIs
// (/types TrendDataPoint / ModelStat / UserDashboardStats). Kept structural
// so callers can pass API objects directly without casts.

export interface UsageSummaryMetricsLike {
  requests?: number
  total_tokens?: number
  input_tokens?: number
  output_tokens?: number
  cache_creation_tokens?: number
  cache_read_tokens?: number
  cost?: number
  actual_cost?: number
}

export interface UsageRankRowLike {
  id: string | number
  label: string
  requests: number
  total_tokens: number
  input_tokens?: number
  output_tokens?: number
  cache_creation_tokens?: number
  cache_read_tokens?: number
  cost: number
  actual_cost?: number
}

export interface UsageTimelinePointLike extends UsageSummaryMetricsLike {
  date: string
}

export type UsageMetricKey =
  | 'requests'
  | 'totalTokens'
  | 'inputTokens'
  | 'outputTokens'
  | 'cachedTokens'
  | 'cost'

export interface UsageSummaryCard {
  label: string
  value: string
  meta?: string
  tone?: 'good' | 'warn' | 'bad'
  title?: string
  variant?: 'primary' | 'secondary'
}

/** Translate function shape compatible with vue-i18n's `t`. */
type Translate = (key: string, named?: Record<string, unknown>) => string

// ==================== Thresholds (from CPA usageAnalyticsModel) ====================

export const USAGE_MODEL_TOP_SHARE_THRESHOLD = 0.45
export const USAGE_MODEL_LONG_TAIL_SHARE = 0.08

// ==================== Formatting ====================

const toFiniteNumber = (value: unknown): number =>
  typeof value === 'number' && Number.isFinite(value) ? value : 0

/**
 * Compact K/M/B number format matching sub2api's `formatCompactNumber`
 * (utils/format.ts) but tolerant of nullish/NaN input.
 */
export function formatCompactNumberSafe(value: number): string {
  const num = toFiniteNumber(value)
  if (Math.abs(num) >= 1_000_000_000) return `${(num / 1_000_000_000).toFixed(1)}B`
  if (Math.abs(num) >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M`
  if (Math.abs(num) >= 1_000) return `${(num / 1_000).toFixed(1)}K`
  return String(Math.round(num))
}

/** `$1.23` style cost; small values keep up to 4 decimals before rounding to 2. */
export function formatUsd(value: number): string {
  const num = toFiniteNumber(value)
  const abs = Math.abs(num)
  const digits = abs > 0 && abs < 0.01 ? 4 : 2
  return `$${num.toFixed(digits)}`
}

/** `12.3%` percent from a 0..1 ratio. */
export function formatPercentRatio(ratio: number): string {
  return `${((toFiniteNumber(ratio)) * 100).toFixed(1)}%`
}

/** Signed delta percentage like `+12.3%` / `-4.0%`. */
export function formatDeltaPercent(delta: number): string {
  const num = toFiniteNumber(delta)
  return `${num > 0 ? '+' : ''}${(num * 100).toFixed(1)}%`
}

/** Duration in ms rendered as `850ms` or `1.5s`. */
export function formatUsageDurationMs(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(Number(value))) return '-'
  const parsed = Number(value)
  if (parsed < 0) return '-'
  if (parsed < 1000) return `${Math.round(parsed)}ms`
  return `${(parsed / 1000).toFixed(parsed % 1000 === 0 ? 0 : 1)}s`
}

/** Metric formatter keyed by metric kind, mirroring CPA `formatMetricValue`. */
export function formatUsageMetricValue(key: UsageMetricKey, value: number): string {
  if (key === 'cost') return formatUsd(value)
  return formatCompactNumberSafe(value)
}

// ==================== Cache metrics ====================

export function getUsageCacheTokens(tokens: {
  cache_creation_tokens?: number
  cache_read_tokens?: number
}): number {
  return Math.max(toFiniteNumber(tokens.cache_creation_tokens), 0) + Math.max(toFiniteNumber(tokens.cache_read_tokens), 0)
}

/**
 * Cache hit ratio = cached tokens / input tokens, clamped to 0..1.
 * Mirrors CPA `calculateCacheHitRateFromTotals`.
 */
export function computeCacheHitRate(tokens: {
  input_tokens?: number
  cache_creation_tokens?: number
  cache_read_tokens?: number
}): number {
  const input = Math.max(toFiniteNumber(tokens.input_tokens), 0)
  if (input <= 0) return 0
  const hit = Math.max(toFiniteNumber(tokens.cache_read_tokens), 0)
  return Math.min(1, hit / input)
}

export function computeRowCacheHitRate(row: UsageRankRowLike): number {
  return computeCacheHitRate({
    input_tokens: row.input_tokens,
    cache_read_tokens: row.cache_read_tokens,
    cache_creation_tokens: row.cache_creation_tokens
  })
}

// ==================== Summary derivation ====================

export interface UsageSummaryDelta {
  hasComparison: boolean
  requests: number
  totalTokens: number
  cost: number
}

/**
 * Delta between current and previous period summaries (fractions of change).
 * Mirrors CPA `buildUsageSummaryDelta`.
 */
export function buildUsageSummaryDelta(
  current: UsageSummaryMetricsLike,
  previous?: UsageSummaryMetricsLike | null
): UsageSummaryDelta {
  if (!previous) {
    return { hasComparison: false, requests: 0, totalTokens: 0, cost: 0 }
  }
  const deltaOf = (now: number, before: number) => (before > 0 ? (now - before) / before : 0)
  return {
    hasComparison: true,
    requests: deltaOf(Math.max(toFiniteNumber(current.requests), 0), Math.max(toFiniteNumber(previous.requests), 0)),
    totalTokens: deltaOf(Math.max(toFiniteNumber(current.total_tokens), 0), Math.max(toFiniteNumber(previous.total_tokens), 0)),
    cost: deltaOf(
      Math.max(toFiniteNumber(current.actual_cost ?? current.cost), 0),
      Math.max(toFiniteNumber(previous.actual_cost ?? previous.cost), 0)
    )
  }
}

const deltaMeta = (
  delta: UsageSummaryDelta,
  key: keyof Omit<UsageSummaryDelta, 'hasComparison'>,
  t: Translate,
  fallback: string
) => (delta.hasComparison ? `${formatDeltaPercent(delta[key])} ${t('dashboard.usageAnalytics.vsPrevious')}` : fallback)

// ==================== Card builders ====================

interface OverviewCardsInput {
  t: Translate
  summary: UsageSummaryMetricsLike
  summaryDelta?: UsageSummaryDelta | null
}

const fullNumber = (value: number) => new Intl.NumberFormat().format(Math.round(toFiniteNumber(value)))

const EMPTY_DELTA: UsageSummaryDelta = { hasComparison: false, requests: 0, totalTokens: 0, cost: 0 }

/** Overview period summary cards — ported from CPA buildUsageOverviewSummaryCards. */
export function buildUsageOverviewSummaryCards({
  t,
  summary,
  summaryDelta
}: OverviewCardsInput): UsageSummaryCard[] {
  const requests = Math.max(toFiniteNumber(summary.requests), 0)
  const totalTokens = Math.max(toFiniteNumber(summary.total_tokens), 0)
  const delta = summaryDelta ?? EMPTY_DELTA
  const inputShare = totalTokens > 0 ? toFiniteNumber(summary.input_tokens) / totalTokens : 0
  const outputShare = totalTokens > 0 ? toFiniteNumber(summary.output_tokens) / totalTokens : 0
  const cacheTokens = getUsageCacheTokens(summary)

  return [
    {
      label: t('dashboard.usageAnalytics.metricRequests'),
      meta: deltaMeta(delta, 'requests', t, t('dashboard.usageAnalytics.summaryMeta')),
      title: fullNumber(requests),
      value: formatUsageMetricValue('requests', requests)
    },
    {
      label: t('dashboard.usageAnalytics.metricEstimatedCost'),
      meta: deltaMeta(delta, 'cost', t, t('dashboard.usageAnalytics.summaryCostMeta')),
      value: formatUsageMetricValue('cost', toFiniteNumber(summary.actual_cost ?? summary.cost))
    },
    {
      label: t('dashboard.usageAnalytics.metricTotalTokens'),
      meta: t('dashboard.usageAnalytics.summaryMeta'),
      title: fullNumber(totalTokens),
      value: formatUsageMetricValue('totalTokens', totalTokens)
    },
    {
      label: t('dashboard.usageAnalytics.metricInputTokens'),
      meta: `${t('dashboard.usageAnalytics.share')} ${formatPercentRatio(inputShare)}`,
      title: fullNumber(toFiniteNumber(summary.input_tokens)),
      value: formatUsageMetricValue('totalTokens', toFiniteNumber(summary.input_tokens)),
      variant: 'secondary'
    },
    {
      label: t('dashboard.usageAnalytics.metricOutputTokens'),
      meta: `${t('dashboard.usageAnalytics.share')} ${formatPercentRatio(outputShare)}`,
      title: fullNumber(toFiniteNumber(summary.output_tokens)),
      value: formatUsageMetricValue('totalTokens', toFiniteNumber(summary.output_tokens)),
      variant: 'secondary'
    },
    {
      label: t('dashboard.usageAnalytics.metricCachedTokens'),
      meta: `${t('dashboard.usageAnalytics.cacheReadRate')} ${formatPercentRatio(computeCacheHitRate(summary))}`,
      title: fullNumber(cacheTokens),
      value: formatUsageMetricValue('totalTokens', cacheTokens),
      variant: 'secondary'
    }
  ]
}

// ==================== Trend cards ====================

interface TrendCardsInput {
  t: Translate
  timeline: UsageTimelinePointLike[]
  summaryDelta?: UsageSummaryDelta | null
}

const maxTimelineBy = (
  timeline: UsageTimelinePointLike[],
  valueOf: (point: UsageTimelinePointLike) => number
): UsageTimelinePointLike | null => {
  let best: UsageTimelinePointLike | null = null
  for (const point of timeline) {
    if (!best || valueOf(point) > valueOf(best)) best = point
  }
  return best
}

/** Trend tab summary cards — ported from CPA buildUsageTrendSummaryCards. */
export function buildUsageTrendSummaryCards({
  t,
  timeline,
  summaryDelta
}: TrendCardsInput): UsageSummaryCard[] {
  const delta = summaryDelta ?? EMPTY_DELTA
  const peakRequests = maxTimelineBy(timeline, (point) => toFiniteNumber(point.requests))
  const averageRequests =
    timeline.length > 0
      ? timeline.reduce((sum, point) => sum + Math.max(toFiniteNumber(point.requests), 0), 0) / timeline.length
      : 0

  return [
    {
      label: t('dashboard.usageAnalytics.trendPeakBucket'),
      meta:
        peakRequests && toFiniteNumber(peakRequests.requests) > 0
          ? `${formatCompactNumberSafe(toFiniteNumber(peakRequests.requests))} ${t('dashboard.usageAnalytics.metricRequests')}`
          : '-',
      value: peakRequests?.date ?? '-'
    },
    {
      label: t('dashboard.usageAnalytics.trendAverageBucket'),
      meta: t('dashboard.usageAnalytics.summaryMeta'),
      value: formatCompactNumberSafe(averageRequests)
    },
    {
      label: t('dashboard.usageAnalytics.trendRequestChange'),
      meta: t('dashboard.usageAnalytics.vsPrevious'),
      value: delta.hasComparison ? formatDeltaPercent(delta.requests) : '-'
    },
    {
      label: t('dashboard.usageAnalytics.trendTokenChange'),
      meta: t('dashboard.usageAnalytics.vsPrevious'),
      value: delta.hasComparison ? formatDeltaPercent(delta.totalTokens) : '-'
    },
    {
      label: t('dashboard.usageAnalytics.trendCostChange'),
      meta: t('dashboard.usageAnalytics.vsPrevious'),
      value: delta.hasComparison ? formatDeltaPercent(delta.cost) : '-'
    }
  ]
}

// ==================== Entity (model / API key) digest cards ====================

interface EntityCardsInput {
  t: Translate
  rows: UsageRankRowLike[]
}

function rankBy(rows: UsageRankRowLike[], metric: 'cost' | 'requests'): { top: UsageRankRowLike | null; share: number } {
  const sorted = [...rows].sort((a, b) => {
    if (metric === 'cost') {
      return toFiniteNumber(b.actual_cost ?? b.cost) - toFiniteNumber(a.actual_cost ?? a.cost)
    }
    return toFiniteNumber(b.requests) - toFiniteNumber(a.requests)
  })
  const total =
    metric === 'cost'
      ? rows.reduce((sum, row) => sum + toFiniteNumber(row.actual_cost ?? row.cost), 0)
      : rows.reduce((sum, row) => sum + toFiniteNumber(row.requests), 0)
  const top = sorted[0] ?? null
  const topValue =
    top == null ? 0 : metric === 'cost' ? toFiniteNumber(top.actual_cost ?? top.cost) : toFiniteNumber(top.requests)
  return { top, share: total > 0 ? topValue / total : 0 }
}

/**
 * Entity dimension digest — ported from CPA buildUsageModelSummaryCards /
 * buildUsageApiKeySummaryCards (top cost share + concentration warnings).
 */
export function buildUsageEntityDigestCards({ t, rows }: EntityCardsInput): UsageSummaryCard[] {
  const costRank = rankBy(rows, 'cost')
  const requestRank = rankBy(rows, 'requests')
  const longTailRows = rows.filter((row) => rankShareOf(rows, row, 'requests') < USAGE_MODEL_LONG_TAIL_SHARE)
  const longTailShare = longTailRows.reduce((sum, row) => sum + rankShareOf(rows, row, 'requests'), 0)

  return [
    {
      label: t('dashboard.usageAnalytics.activeEntities'),
      meta: t('dashboard.usageAnalytics.summaryMeta'),
      value: formatCompactNumberSafe(rows.length),
      title: fullNumber(rows.length)
    },
    {
      label: t('dashboard.usageAnalytics.topCostShare'),
      meta: costRank.top?.label ?? t('dashboard.usageAnalytics.summaryMeta'),
      tone: costRank.share >= USAGE_MODEL_TOP_SHARE_THRESHOLD && rows.length >= 2 ? 'warn' : undefined,
      value: formatPercentRatio(costRank.share)
    },
    {
      label: t('dashboard.usageAnalytics.topRequestShare'),
      meta: requestRank.top?.label ?? t('dashboard.usageAnalytics.summaryMeta'),
      tone: requestRank.share >= USAGE_MODEL_TOP_SHARE_THRESHOLD && rows.length >= 2 ? 'warn' : undefined,
      value: formatPercentRatio(requestRank.share)
    },
    {
      label: t('dashboard.usageAnalytics.longTailShare'),
      meta: t('dashboard.usageAnalytics.longTailMeta'),
      value: formatPercentRatio(longTailShare)
    }
  ]
}

function rankShareOf(rows: UsageRankRowLike[], row: UsageRankRowLike, metric: 'cost' | 'requests'): number {
  if (metric === 'cost') {
    const total = rows.reduce((sum, r) => sum + toFiniteNumber(r.actual_cost ?? r.cost), 0)
    return total > 0 ? toFiniteNumber(row.actual_cost ?? row.cost) / total : 0
  }
  const total = rows.reduce((sum, r) => sum + toFiniteNumber(r.requests), 0)
  return total > 0 ? toFiniteNumber(row.requests) / total : 0
}

