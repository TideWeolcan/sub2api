import { describe, expect, it } from 'vitest'
import {
  USAGE_MODEL_LONG_TAIL_SHARE,
  USAGE_MODEL_TOP_SHARE_THRESHOLD,
  buildUsageEntityDigestCards,
  buildUsageOverviewSummaryCards,
  buildUsageSummaryDelta,
  buildUsageTrendSummaryCards,
  computeCacheHitRate,
  computeRowCacheHitRate,
  formatCompactNumberSafe,
  formatDeltaPercent,
  formatPercentRatio,
  formatUsageDurationMs,
  formatUsageMetricValue,
  formatUsd,
  getUsageCacheTokens,
  type UsageRankRowLike
} from '../usageAnalyticsPresentation'

const t = (key: string) => key

describe('格式化函数', () => {
  it('formatCompactNumberSafe 按 K/M/B 压缩并容忍非法输入', () => {
    expect(formatCompactNumberSafe(0)).toBe('0')
    expect(formatCompactNumberSafe(999)).toBe('999')
    expect(formatCompactNumberSafe(1500)).toBe('1.5K')
    expect(formatCompactNumberSafe(2_500_000)).toBe('2.5M')
    expect(formatCompactNumberSafe(1_250_000_000)).toBe('1.3B')
    expect(formatCompactNumberSafe(Number.NaN)).toBe('0')
  })

  it('formatUsd 小额保留 4 位小数', () => {
    expect(formatUsd(1.234)).toBe('$1.23')
    expect(formatUsd(0.005)).toBe('$0.0050')
    expect(formatUsd(Number.NaN)).toBe('$0.00')
  })

  it('formatPercentRatio / formatDeltaPercent', () => {
    expect(formatPercentRatio(0.1234)).toBe('12.3%')
    expect(formatDeltaPercent(0.1234)).toBe('+12.3%')
    expect(formatDeltaPercent(-0.04)).toBe('-4.0%')
    expect(formatDeltaPercent(0)).toBe('0.0%')
  })

  it('formatUsageDurationMs 区分毫秒与秒', () => {
    expect(formatUsageDurationMs(850)).toBe('850ms')
    expect(formatUsageDurationMs(1500)).toBe('1.5s')
    expect(formatUsageDurationMs(2000)).toBe('2s')
    expect(formatUsageDurationMs(null)).toBe('-')
    expect(formatUsageDurationMs(Number.NaN)).toBe('-')
  })

  it('formatUsageMetricValue 成本走美元、其余走压缩数字', () => {
    expect(formatUsageMetricValue('cost', 12.5)).toBe('$12.50')
    expect(formatUsageMetricValue('requests', 12_500)).toBe('12.5K')
  })
})

describe('缓存指标', () => {
  it('getUsageCacheTokens 汇总创建+读取缓存 token', () => {
    expect(getUsageCacheTokens({ cache_creation_tokens: 10, cache_read_tokens: 5 })).toBe(15)
    expect(getUsageCacheTokens({})).toBe(0)
  })

  it('computeCacheHitRate = cache_read / input 并夹取到 0..1', () => {
    expect(computeCacheHitRate({ input_tokens: 100, cache_read_tokens: 25 })).toBe(0.25)
    expect(computeCacheHitRate({ input_tokens: 0, cache_read_tokens: 25 })).toBe(0)
    expect(computeCacheHitRate({ input_tokens: 10, cache_read_tokens: 100 })).toBe(1)
  })

  it('computeRowCacheHitRate 基于行的 token 字段', () => {
    const row: UsageRankRowLike = {
      id: 1,
      label: 'm',
      requests: 1,
      total_tokens: 100,
      input_tokens: 100,
      cache_read_tokens: 50,
      cost: 0
    }
    expect(computeRowCacheHitRate(row)).toBe(0.5)
  })
})

describe('buildUsageSummaryDelta', () => {
  it('无对比周期时 hasComparison=false', () => {
    expect(buildUsageSummaryDelta({ requests: 10 })).toEqual({
      hasComparison: false,
      requests: 0,
      totalTokens: 0,
      cost: 0
    })
  })

  it('计算相对上一周期的比例变化', () => {
    const delta = buildUsageSummaryDelta(
      { requests: 150, total_tokens: 300, actual_cost: 3 },
      { requests: 100, total_tokens: 100, actual_cost: 2 }
    )
    expect(delta.hasComparison).toBe(true)
    expect(delta.requests).toBeCloseTo(0.5)
    expect(delta.totalTokens).toBeCloseTo(2)
    expect(delta.cost).toBeCloseTo(0.5)
  })

  it('上一周期为 0 时不产生除零', () => {
    const delta = buildUsageSummaryDelta({ requests: 10 }, { requests: 0 })
    expect(delta.hasComparison).toBe(true)
    expect(delta.requests).toBe(0)
  })
})

describe('buildUsageOverviewSummaryCards', () => {
  it('生成请求/费用/Token/缓存卡片', () => {
    const cards = buildUsageOverviewSummaryCards({
      t,
      summary: {
        requests: 1500,
        total_tokens: 8000,
        input_tokens: 5000,
        output_tokens: 3000,
        cache_read_tokens: 1000,
        cache_creation_tokens: 200,
        actual_cost: 1.5
      }
    })

    expect(cards.map((card) => card.label)).toEqual([
      'dashboard.usageAnalytics.metricRequests',
      'dashboard.usageAnalytics.metricEstimatedCost',
      'dashboard.usageAnalytics.metricTotalTokens',
      'dashboard.usageAnalytics.metricInputTokens',
      'dashboard.usageAnalytics.metricOutputTokens',
      'dashboard.usageAnalytics.metricCachedTokens'
    ])
    expect(cards[0].value).toBe('1.5K')
    expect(cards[1].value).toBe('$1.50')
    expect(cards[3].meta).toContain('62.5%')
    // 缓存读取率 = 1000/5000
    expect(cards[5].meta).toContain('20.0%')
    expect(cards[3].variant).toBe('secondary')
  })

  it('有对比周期时 meta 展示 delta，否则回退到 summaryMeta', () => {
    const base = { requests: 200, total_tokens: 400, actual_cost: 4 }
    const withDelta = buildUsageOverviewSummaryCards({
      t,
      summary: base,
      summaryDelta: { hasComparison: true, requests: 0.5, totalTokens: 0, cost: -0.25 }
    })
    expect(withDelta[0].meta).toContain('+50.0%')
    expect(withDelta[0].meta).toContain('dashboard.usageAnalytics.vsPrevious')
    expect(withDelta[1].meta).toContain('-25.0%')

    const withoutDelta = buildUsageOverviewSummaryCards({ t, summary: base })
    expect(withoutDelta[0].meta).toBe('dashboard.usageAnalytics.summaryMeta')
  })

  it('空数据不抛错且输出 0 值', () => {
    const cards = buildUsageOverviewSummaryCards({ t, summary: {} })
    expect(cards[0].value).toBe('0')
    expect(cards[1].value).toBe('$0.00')
  })
})

describe('buildUsageTrendSummaryCards', () => {
  it('找出峰值时段并计算平均请求', () => {
    const cards = buildUsageTrendSummaryCards({
      t,
      timeline: [
        { date: '2026-01-01', requests: 10 },
        { date: '2026-01-02', requests: 40 },
        { date: '2026-01-03', requests: 20 }
      ]
    })
    expect(cards[0].value).toBe('2026-01-02')
    expect(cards[0].meta).toContain('40')
    expect(cards[1].value).toBe('23')
  })

  it('空时间线输出占位符', () => {
    const cards = buildUsageTrendSummaryCards({ t, timeline: [] })
    expect(cards[0].value).toBe('-')
    expect(cards[0].meta).toBe('-')
    expect(cards[1].value).toBe('0')
  })

  it('无对比周期时变化卡片显示占位符', () => {
    const cards = buildUsageTrendSummaryCards({
      t,
      timeline: [{ date: '2026-01-01', requests: 5 }]
    })
    expect(cards[2].value).toBe('-')
    expect(cards[3].value).toBe('-')
    expect(cards[4].value).toBe('-')
  })
})

describe('buildUsageEntityDigestCards', () => {
  const rows: UsageRankRowLike[] = [
    { id: 'a', label: 'model-a', requests: 900, total_tokens: 100, cost: 0.9, actual_cost: 0.9 },
    { id: 'b', label: 'model-b', requests: 90, total_tokens: 100, cost: 0.09, actual_cost: 0.09 },
    { id: 'c', label: 'model-c', requests: 10, total_tokens: 100, cost: 0.01, actual_cost: 0.01 }
  ]

  it('计算活跃条目数、最高占比与长尾占比', () => {
    const cards = buildUsageEntityDigestCards({ t, rows })
    expect(cards[0].value).toBe('3')
    // top cost share = 0.9 / 1.0
    expect(cards[1].value).toBe('90.0%')
    expect(cards[1].meta).toBe('model-a')
    // top request share = 900 / 1000
    expect(cards[2].value).toBe('90.0%')
    // 长尾 = 请求占比 < 8% 的条目：b 为 9% 不算，仅 c (1%) → 1%
    expect(cards[3].value).toBe('1.0%')
  })

  it('占比达到集中阈值时给出 warn 色调', () => {
    const cards = buildUsageEntityDigestCards({ t, rows })
    expect(cards[1].tone).toBe('warn')
    expect(USAGE_MODEL_TOP_SHARE_THRESHOLD).toBe(0.45)
    expect(USAGE_MODEL_LONG_TAIL_SHARE).toBe(0.08)
  })

  it('单一条目不触发集中警告', () => {
    const cards = buildUsageEntityDigestCards({ t, rows: [rows[0]] })
    expect(cards[1].tone).toBeUndefined()
    expect(cards[1].value).toBe('100.0%')
  })

  it('空列表不抛错', () => {
    const cards = buildUsageEntityDigestCards({ t, rows: [] })
    expect(cards[0].value).toBe('0')
    expect(cards[1].value).toBe('0.0%')
  })
})
