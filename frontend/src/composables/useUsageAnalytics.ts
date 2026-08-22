/**
 * Usage analytics state composable — Vue 3 port of CPA Manager Plus
 * (apps/web/src/features/usage-analytics/useUsageAnalytics.ts), adapted to
 * sub2api usage APIs instead of CPA monitoring endpoints.
 *
 * sub2api has no per-key/per-credential analytics endpoints, so the CPA
 * multi-query machinery (per-key timelines, credential trends, heatmap date
 * drilldowns) is reduced to the shared subset:
 * - summary + delta vs previous equal-length window
 * - timeline (trend) with day/hour granularity
 * - model / group rank rows
 *
 * Presentation (summary cards, digest cards, deltas) lives in
 * utils/usageAnalyticsPresentation.ts so it stays unit-testable without
 * mounting components.
 */

import { computed, ref, watch, type Ref } from 'vue'
import { useDebounceFn } from '@vueuse/core'
import { usageAPI } from '@/api/usage'
import type { GroupStat, ModelStat, TrendDataPoint } from '@/types'
import {
  buildUsageEntityDigestCards,
  buildUsageOverviewSummaryCards,
  buildUsageSummaryDelta,
  buildUsageTrendSummaryCards,
  type UsageRankRowLike,
  type UsageSummaryCard
} from '@/utils/usageAnalyticsPresentation'

export type UsageAnalyticsTab = 'overview' | 'trends' | 'models' | 'groups'
export type UsageAnalyticsGranularity = 'day' | 'hour'

const DAY_MS = 24 * 60 * 60 * 1000

/** Translate function shape compatible with vue-i18n's `t`. */
type Translate = (key: string, named?: Record<string, unknown>) => string

function formatDateLocalInput(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

interface SumTokens {
  requests: number
  total_tokens: number
  input_tokens: number
  output_tokens: number
  cache_creation_tokens: number
  cache_read_tokens: number
  cost: number
  actual_cost: number
}

function sumTimeline(points: TrendDataPoint[]): SumTokens {
  return points.reduce<SumTokens>(
    (acc, point) => ({
      requests: acc.requests + (point.requests || 0),
      total_tokens: acc.total_tokens + (point.total_tokens || 0),
      input_tokens: acc.input_tokens + (point.input_tokens || 0),
      output_tokens: acc.output_tokens + (point.output_tokens || 0),
      cache_creation_tokens: acc.cache_creation_tokens + (point.cache_creation_tokens || 0),
      cache_read_tokens: acc.cache_read_tokens + (point.cache_read_tokens || 0),
      cost: acc.cost + (point.cost || 0),
      actual_cost: acc.actual_cost + (point.actual_cost || 0)
    }),
    {
      requests: 0,
      total_tokens: 0,
      input_tokens: 0,
      output_tokens: 0,
      cache_creation_tokens: 0,
      cache_read_tokens: 0,
      cost: 0,
      actual_cost: 0
    }
  )
}

export interface UseUsageAnalyticsOptions {
  /** Translate function (pass `useI18n().t`). */
  t: Translate
}

/**
 * Shared usage-analytics state for dashboard/usage views.
 *
 * The composable owns data fetching only; views keep their own refs in sync
 * through `setDateRange` / `setGranularity` / `setTab` and call `refresh()`.
 */
export function useUsageAnalytics(options: UseUsageAnalyticsOptions) {
  const { t } = options

  // ==================== Filter state ====================
  const startDate = ref(formatDateLocalInput(new Date(Date.now() - 6 * DAY_MS)))
  const endDate = ref(formatDateLocalInput(new Date()))
  const granularity = ref<UsageAnalyticsGranularity>('day')
  const activeTab = ref<UsageAnalyticsTab>('overview')

  // ==================== Data state ====================
  const loading = ref(false)
  const error = ref('')
  const lastRefreshedAt = ref<number | null>(null)
  const trend = ref<TrendDataPoint[]>([])
  const models = ref<ModelStat[]>([])
  const groups = ref<GroupStat[]>([])
  const currentSummary = ref<SumTokens | null>(null)
  const previousSummary = ref<SumTokens | null>(null)

  const summaryDelta = computed(() =>
    buildUsageSummaryDelta(currentSummary.value ?? {}, previousSummary.value)
  )

  function setDateRange(start: string, end: string) {
    startDate.value = start
    endDate.value = end
  }

  function setGranularity(value: UsageAnalyticsGranularity) {
    granularity.value = value
  }

  function setTab(tab: UsageAnalyticsTab) {
    activeTab.value = tab
  }

  async function fetchSummary(params: { start_date: string; end_date: string; granularity: UsageAnalyticsGranularity }) {
    const res = await usageAPI.getDashboardTrend({ ...params })
    const points = res.trend ?? []
    return { summary: sumTimeline(points), timeline: points }
  }

  async function load() {
    loading.value = true
    error.value = ''
    try {
      const windowDays = Math.max(
        1,
        Math.round((new Date(endDate.value).getTime() - new Date(startDate.value).getTime()) / DAY_MS)
      )
      const prevStart = formatDateLocalInput(new Date(new Date(startDate.value).getTime() - windowDays * DAY_MS))
      const prevEnd = formatDateLocalInput(new Date(new Date(startDate.value).getTime() - DAY_MS))

      const [current, previous] = await Promise.all([
        fetchSummary({
          start_date: startDate.value,
          end_date: endDate.value,
          granularity: granularity.value
        }),
        fetchSummary({
          start_date: prevStart,
          end_date: prevEnd,
          granularity: granularity.value
        }).catch(() => null)
      ])

      trend.value = current.timeline
      currentSummary.value = current.summary
      previousSummary.value = previous?.summary ?? null

      if (activeTab.value === 'groups') {
        const res = await usageAPI.getDashboardSnapshotV2({
          start_date: startDate.value,
          end_date: endDate.value,
          granularity: granularity.value,
          include_group_stats: true
        })
        groups.value = res.groups ?? []
      } else {
        const res = await usageAPI.getDashboardModels({ start_date: startDate.value, end_date: endDate.value })
        models.value = res.models ?? []
      }
      lastRefreshedAt.value = Date.now()
    } catch (err) {
      error.value = err instanceof Error ? err.message : String(err)
    } finally {
      loading.value = false
    }
  }

  // Debounced refresh shared across rapid filter changes.
  const debouncedLoad = useDebounceFn(() => void load(), 300)
  watch([startDate, endDate, granularity], () => debouncedLoad())
  watch(activeTab, () => {
    // Tab switches only need the entity lists refreshed, not the whole query.
    void load()
  })

  // ==================== Derived rows ====================

  const modelRows = computed<UsageRankRowLike[]>(() =>
    models.value.map((model) => ({
      id: model.model,
      label: model.model,
      requests: model.requests || 0,
      total_tokens: model.total_tokens || 0,
      input_tokens: model.input_tokens,
      output_tokens: model.output_tokens,
      cache_creation_tokens: model.cache_creation_tokens,
      cache_read_tokens: model.cache_read_tokens,
      cost: model.cost || 0,
      actual_cost: model.actual_cost
    }))
  )

  const groupRows = computed<UsageRankRowLike[]>(() =>
    groups.value.map((group) => ({
      id: group.group_id,
      label: group.group_name,
      requests: group.requests || 0,
      total_tokens: group.total_tokens || 0,
      cost: group.cost || 0,
      actual_cost: group.actual_cost
    }))
  )

  // ==================== Presentation ====================

  const overviewCards = computed<UsageSummaryCard[]>(() =>
    buildUsageOverviewSummaryCards({ t, summary: currentSummary.value ?? {}, summaryDelta: summaryDelta.value })
  )
  const trendCards = computed<UsageSummaryCard[]>(() =>
    buildUsageTrendSummaryCards({
      t,
      timeline: trend.value.map((point) => ({ date: point.date, requests: point.requests })),
      summaryDelta: summaryDelta.value
    })
  )
  const modelDigestCards = computed<UsageSummaryCard[]>(() =>
    buildUsageEntityDigestCards({ t, rows: modelRows.value })
  )
  const groupDigestCards = computed<UsageSummaryCard[]>(() =>
    buildUsageEntityDigestCards({ t, rows: groupRows.value })
  )
  const activeDigestCards = computed<UsageSummaryCard[]>(() =>
    activeTab.value === 'groups' ? groupDigestCards.value : modelDigestCards.value
  )

  return {
    // filter state
    startDate,
    endDate,
    granularity,
    activeTab,
    setDateRange,
    setGranularity,
    setTab,
    // data state
    loading,
    error,
    lastRefreshedAt,
    trend,
    models,
    groups,
    currentSummary,
    previousSummary,
    summaryDelta,
    refresh: () => void load(),
    // derived rows
    modelRows,
    groupRows,
    // presentation
    overviewCards,
    trendCards,
    modelDigestCards,
    groupDigestCards,
    activeDigestCards
  } satisfies Record<string, unknown> & {
    startDate: Ref<string>
    endDate: Ref<string>
    granularity: Ref<UsageAnalyticsGranularity>
    activeTab: Ref<UsageAnalyticsTab>
    loading: Ref<boolean>
    error: Ref<string>
    lastRefreshedAt: Ref<number | null>
    trend: Ref<TrendDataPoint[]>
    models: Ref<ModelStat[]>
    groups: Ref<GroupStat[]>
  }
}

export default useUsageAnalytics
