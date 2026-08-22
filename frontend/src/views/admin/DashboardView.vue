<template>
  <AppLayout>
    <div class="space-y-6">
      <!-- Loading State -->
      <div v-if="loading" class="flex items-center justify-center py-12">
        <LoadingSpinner />
      </div>

      <template v-else-if="stats">
        <!-- CPA-style dashboard grid -->
        <div class="grid grid-cols-1 gap-4 xl:grid-cols-2">
          <!-- Left column: metrics + traffic -->
          <div class="space-y-4 xl:col-span-1">
            <UsageMetricsCard
              :stats="stats"
              :loading="loading"
              :last-refreshed-at="lastRefreshedAt"
            />
            <TrafficOverviewCard
              :points="trendData"
              :loading="chartsLoading"
              :show-token-mix="true"
            />
          </div>

          <!-- Right column: system overview / collector / health alerts -->
          <div class="space-y-4 xl:col-span-1">
            <VersionCard
              :app-version="appVersion"
              :api-version="apiVersion"
              :uptime-seconds="stats.uptime"
              :server-build-date="buildTime"
              :loading="systemLoading"
              :error="systemError"
            />
            <CollectorStatusCard
              :enabled="collectorEnabled"
              :mode="collectorMode"
              :queue="collectorQueue"
              :events="collectorEvents"
              :dead-letters="collectorDeadLetters"
              :total-inserted="collectorTotalInserted"
              :total-skipped="collectorTotalSkipped"
              :last-error="collectorLastError"
              :loading="opsLoading"
            />
            <HealthAlertsCard :items="healthAlerts" :loading="opsLoading" />
          </div>
        </div>

        <!-- Quick Actions -->
        <div class="card p-4">
          <div class="mb-3 flex items-center justify-between">
            <h2 class="text-sm font-semibold text-gray-900 dark:text-white">
              {{ t('admin.dashboard.quickActions') }}
            </h2>
          </div>
          <div class="grid grid-cols-1 gap-3 md:grid-cols-2">
            <button
              v-if="canUseBatchImage"
              type="button"
              class="group flex items-center gap-3 rounded-lg bg-gray-50 p-3 text-left transition-colors hover:bg-sky-50 dark:bg-dark-800/50 dark:hover:bg-sky-900/20"
              @click="router.push('/batch-image')"
            >
              <span class="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-sky-100 text-sky-600 dark:bg-sky-900/30 dark:text-sky-400">
                <Icon name="sparkles" size="md" :stroke-width="2" />
              </span>
              <span class="min-w-0 flex-1">
                <span class="block text-sm font-medium text-gray-900 dark:text-white">
                  {{ t('admin.dashboard.batchImage') }}
                </span>
                <span class="block text-xs text-gray-500 dark:text-gray-400">
                  {{ t('admin.dashboard.batchImageDesc') }}
                </span>
              </span>
              <Icon name="chevronRight" size="sm" class="text-gray-400 group-hover:text-sky-500" />
            </button>
            <button
              type="button"
              class="group flex items-center gap-3 rounded-lg bg-gray-50 p-3 text-left transition-colors hover:bg-emerald-50 dark:bg-dark-800/50 dark:hover:bg-emerald-900/20"
              @click="router.push('/admin/groups')"
            >
              <span class="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400">
                <Icon name="grid" size="md" :stroke-width="2" />
              </span>
              <span class="min-w-0 flex-1">
                <span class="block text-sm font-medium text-gray-900 dark:text-white">
                  {{ t('admin.dashboard.groupPricing') }}
                </span>
                <span class="block text-xs text-gray-500 dark:text-gray-400">
                  {{ t('admin.dashboard.groupPricingDesc') }}
                </span>
              </span>
              <Icon name="chevronRight" size="sm" class="text-gray-400 group-hover:text-emerald-500" />
            </button>
          </div>
        </div>

        <!-- Charts Section -->
        <div class="space-y-6">
          <!-- Date Range Filter -->
          <div class="card p-4">
            <div class="flex flex-wrap items-center gap-4">
              <div class="flex items-center gap-2">
                <span class="text-sm font-medium text-gray-700 dark:text-gray-300"
                  >{{ t('admin.dashboard.timeRange') }}:</span
                >
                <DateRangePicker
                  v-model:start-date="startDate"
                  v-model:end-date="endDate"
                  @change="onDateRangeChange"
                />
              </div>
              <button @click="loadDashboardStats" :disabled="chartsLoading" class="btn btn-secondary">
                {{ t('common.refresh') }}
              </button>
              <div class="ml-auto flex items-center gap-2">
                <span class="text-sm font-medium text-gray-700 dark:text-gray-300"
                  >{{ t('admin.dashboard.granularity') }}:</span
                >
                <SegmentedTabs
                  v-model:model-value="granularity"
                  :items="[
                    { id: 'day', label: t('admin.dashboard.day') },
                    { id: 'hour', label: t('admin.dashboard.hour') }
                  ]"
                  :ariaLabel="t('admin.dashboard.granularity')"
                  id-base="admin-dashboard-granularity"
                  equal-width
                  @change="loadChartData"
                />
              </div>
            </div>
          </div>

          <!-- Charts Grid -->
          <div class="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <ModelDistributionChart
              :model-stats="modelStats"
              :enable-ranking-view="true"
              :ranking-items="rankingItems"
              :ranking-total-actual-cost="rankingTotalActualCost"
              :ranking-total-requests="rankingTotalRequests"
              :ranking-total-tokens="rankingTotalTokens"
              :loading="chartsLoading"
              :ranking-loading="rankingLoading"
              :ranking-error="rankingError"
              :start-date="startDate"
              :end-date="endDate"
              @ranking-click="goToUserUsage"
            />
            <TokenUsageTrend :trend-data="trendData" :loading="chartsLoading" />
          </div>

          <!-- User Usage Trend (Full Width) -->
          <div class="card p-4">
            <h3 class="mb-4 text-sm font-semibold text-gray-900 dark:text-white">
              {{ t('admin.dashboard.recentUsage') }} (Top 12)
            </h3>
            <div class="h-64">
              <div v-if="userTrendLoading" class="flex h-full items-center justify-center">
                <LoadingSpinner size="md" />
              </div>
              <Line v-else-if="userTrendChartData" :data="userTrendChartData" :options="lineOptions" />
              <div
                v-else
                class="flex h-full items-center justify-center text-sm text-gray-500 dark:text-gray-400"
              >
                {{ t('admin.dashboard.noDataAvailable') }}
              </div>
            </div>
          </div>
        </div>
      </template>
    </div>
  </AppLayout>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import { useAppStore } from '@/stores/app'

const { t } = useI18n()
import { adminAPI } from '@/api/admin'
import { systemAPI, opsAPI } from '@/api/admin'

import type {
  DashboardStats,
  TrendDataPoint,
  ModelStat,
  UserUsageTrendPoint,
  UserSpendingRankingItem,
} from '@/types'
import type { OpsDashboardOverview } from '@/api/admin/ops'
import AppLayout from '@/components/layout/AppLayout.vue'
import LoadingSpinner from '@/components/common/LoadingSpinner.vue'
import Icon from '@/components/icons/Icon.vue'
import DateRangePicker from '@/components/common/DateRangePicker.vue'
import SegmentedTabs from '@/components/common/SegmentedTabs.vue'
import ModelDistributionChart from '@/components/charts/ModelDistributionChart.vue'
import TokenUsageTrend from '@/components/charts/TokenUsageTrend.vue'
import UsageMetricsCard from '@/components/admin/dashboard/UsageMetricsCard.vue'
import TrafficOverviewCard from '@/components/admin/dashboard/TrafficOverviewCard.vue'
import VersionCard from '@/components/admin/dashboard/VersionCard.vue'
import CollectorStatusCard from '@/components/admin/dashboard/CollectorStatusCard.vue'
import HealthAlertsCard, { type HealthAlertItem } from '@/components/admin/dashboard/HealthAlertsCard.vue'
import { useBatchImageAccess } from '@/composables/useBatchImageAccess'

import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
  Filler
} from 'chart.js'
import { Line } from 'vue-chartjs'

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
  Filler
)

const appStore = useAppStore()
const router = useRouter()
const { canUseBatchImage, refreshBatchImageAccess } = useBatchImageAccess()
const stats = ref<DashboardStats | null>(null)
const loading = ref(false)
const chartsLoading = ref(false)
const userTrendLoading = ref(false)
const rankingLoading = ref(false)
const rankingError = ref(false)

// Chart data
const trendData = ref<TrendDataPoint[]>([])
const modelStats = ref<ModelStat[]>([])
const userTrend = ref<UserUsageTrendPoint[]>([])
const rankingItems = ref<UserSpendingRankingItem[]>([])
const rankingTotalActualCost = ref(0)
const rankingTotalRequests = ref(0)
const rankingTotalTokens = ref(0)
let chartLoadSeq = 0
let usersTrendLoadSeq = 0
let rankingLoadSeq = 0
const rankingLimit = 12

// ── System overview (VersionCard) ──────────────────────────────
const appVersion = ref('')
const apiVersion = ref('')
const buildTime = ref('')
const systemLoading = ref(true)
const systemError = ref('')
const lastRefreshedAt = ref<Date | null>(null)

const loadSystemInfo = async () => {
  systemLoading.value = true
  systemError.value = ''
  try {
    const version = await systemAPI.getVersion()
    apiVersion.value = version.version || ''
    appVersion.value = version.version || ''
    try {
      const updates = await systemAPI.checkUpdates(false)
      if (!updates.has_update && updates.current_version) {
        // check-updates echoes current_version; prefer it when present
        apiVersion.value = updates.current_version
      }
    } catch { /* update check is best-effort */ }
  } catch (error) {
    console.error('Error loading system info:', error)
    systemError.value = t('admin.dashboard.failedToLoad')
  } finally {
    systemLoading.value = false
  }
}

// ── Collector status & health alerts (Ops API) ─────────────────
const opsLoading = ref(false)
const collectorEnabled = ref(true)
const collectorMode = ref('')
const collectorQueue = ref('')
const collectorEvents = ref<number | undefined>(undefined)
const collectorDeadLetters = ref<number | undefined>(undefined)
const collectorTotalInserted = ref<number | undefined>(undefined)
const collectorTotalSkipped = ref<number | undefined>(undefined)
const collectorLastError = ref('')
const healthAlerts = ref<HealthAlertItem[]>([])

const buildHealthAlerts = (overview: OpsDashboardOverview): HealthAlertItem[] => {
  const alerts: HealthAlertItem[] = []
  const totalAccounts = stats.value?.total_accounts ?? 0

  if ((overview.error_rate ?? 0) > 0.05) {
    alerts.push({
      label: t('admin.dashboard.alertHighErrorRate'),
      detail: `${t('admin.dashboard.requests')}: ${overview.request_count_total.toLocaleString()}`,
      value: `${((overview.error_rate ?? 0) * 100).toFixed(1)}%`,
      tone: 'error'
    })
  }
  if (overview.upstream_429_count > 0) {
    alerts.push({
      label: t('admin.dashboard.alertRateLimited'),
      value: String(overview.upstream_429_count),
      tone: 'warn'
    })
  }
  const abnormalAccounts =
    (stats.value?.error_accounts ?? 0) +
    (stats.value?.ratelimit_accounts ?? 0) +
    (stats.value?.overload_accounts ?? 0)
  if (abnormalAccounts > 0 && totalAccounts > 0) {
    alerts.push({
      label: t('admin.dashboard.alertAbnormalAccounts'),
      detail: `${abnormalAccounts} / ${totalAccounts}`,
      value: `${((abnormalAccounts / totalAccounts) * 100).toFixed(0)}%`,
      tone: abnormalAccounts / totalAccounts > 0.3 ? 'error' : 'warn'
    })
  }
  if (typeof overview.health_score === 'number' && overview.health_score < 80) {
    alerts.push({
      label: t('admin.dashboard.alertLowHealthScore'),
      value: String(Math.round(overview.health_score)),
      tone: 'warn'
    })
  }

  // Always-on summary rows when nothing is wrong
  if (!alerts.length) {
    alerts.push({
      label: t('admin.dashboard.allNormal'),
      detail: `QPS ${overview.qps?.current?.toFixed?.(2) ?? overview.qps?.current ?? 0} · ${t('admin.dashboard.avgResponse')} ${Math.round(overview.duration?.avg_ms ?? 0)}ms`,
      tone: 'ok'
    })
  }
  return alerts
}

const loadOpsStatus = async () => {
  opsLoading.value = true
  try {
    const overview = await opsAPI.getDashboardOverview({ time_range: '30m' })
    collectorEnabled.value = true
    collectorMode.value = 'HTTP'
    collectorEvents.value = overview.success_count
    collectorDeadLetters.value = overview.error_count_total
    collectorTotalInserted.value = overview.token_consumed
    collectorTotalSkipped.value = overview.business_limited_count
    collectorLastError.value = ''
    healthAlerts.value = buildHealthAlerts(overview)
  } catch (error) {
    console.warn('Ops overview unavailable on this deployment:', error)
    collectorEnabled.value = false
    collectorLastError.value = ''
    healthAlerts.value = []
  } finally {
    opsLoading.value = false
  }
}
let opsPollTimer: ReturnType<typeof setInterval> | null = null

// Helper function to format date in local timezone
const formatLocalDate = (date: Date): string => {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

const getLast24HoursRangeDates = (): { start: string; end: string } => {
  const end = new Date()
  const start = new Date(end.getTime() - 24 * 60 * 60 * 1000)
  return {
    start: formatLocalDate(start),
    end: formatLocalDate(end)
  }
}

// Date range
const granularity = ref<'day' | 'hour'>('hour')
const defaultRange = getLast24HoursRangeDates()
const startDate = ref(defaultRange.start)
const endDate = ref(defaultRange.end)

// Granularity is rendered as SegmentedTabs (day / hour) — same control as the user dashboard.

// Dark mode detection
const isDarkMode = computed(() => {
  return document.documentElement.classList.contains('dark')
})

// Chart colors
const chartColors = computed(() => ({
  text: isDarkMode.value ? '#e5e7eb' : '#374151',
  grid: isDarkMode.value ? '#374151' : '#e5e7eb'
}))

// Line chart options (for user trend chart)
const lineOptions = computed(() => ({
  responsive: true,
  maintainAspectRatio: false,
  interaction: {
    intersect: false,
    mode: 'index' as const
  },
  plugins: {
    legend: {
      position: 'top' as const,
      labels: {
        color: chartColors.value.text,
        usePointStyle: true,
        pointStyle: 'circle',
        padding: 15,
        font: {
          size: 11
        }
      }
    },
    tooltip: {
      itemSort: (a: any, b: any) => {
        const aValue = typeof a?.raw === 'number' ? a.raw : Number(a?.parsed?.y ?? 0)
        const bValue = typeof b?.raw === 'number' ? b.raw : Number(b?.parsed?.y ?? 0)
        return bValue - aValue
      },
      callbacks: {
        label: (context: any) => {
          return `${context.dataset.label}: ${formatTokens(context.raw)}`
        }
      }
    }
  },
  scales: {
    x: {
      grid: {
        color: chartColors.value.grid
      },
      ticks: {
        color: chartColors.value.text,
        font: {
          size: 10
        }
      }
    },
    y: {
      grid: {
        color: chartColors.value.grid
      },
      ticks: {
        color: chartColors.value.text,
        font: {
          size: 10
        },
        callback: (value: string | number) => formatTokens(Number(value))
      }
    }
  }
}))

// User trend chart data
const userTrendChartData = computed(() => {
  if (!userTrend.value?.length) return null

  const getDisplayName = (point: UserUsageTrendPoint): string => {
    const username = point.username?.trim()
    if (username) {
      return username
    }

    const email = point.email?.trim()
    if (email) {
      return email
    }

    return t('admin.redeem.userPrefix', { id: point.user_id })
  }

  // Group by user_id to avoid merging different users with the same display name
  const userGroups = new Map<number, { name: string; data: Map<string, number> }>()
  const allDates = new Set<string>()

  userTrend.value.forEach((point) => {
    allDates.add(point.date)
    const key = point.user_id
    if (!userGroups.has(key)) {
      userGroups.set(key, { name: getDisplayName(point), data: new Map() })
    }
    userGroups.get(key)!.data.set(point.date, point.tokens)
  })

  const sortedDates = Array.from(allDates).sort()
  const colors = [
    '#3b82f6',
    '#10b981',
    '#f59e0b',
    '#ef4444',
    '#8b5cf6',
    '#ec4899',
    '#14b8a6',
    '#f97316',
    '#6366f1',
    '#84cc16',
    '#06b6d4',
    '#a855f7'
  ]

  const datasets = Array.from(userGroups.values()).map((group, idx) => ({
    label: group.name,
    data: sortedDates.map((date) => group.data.get(date) || 0),
    borderColor: colors[idx % colors.length],
    backgroundColor: `${colors[idx % colors.length]}20`,
    fill: false,
    tension: 0.3
  }))

  return {
    labels: sortedDates,
    datasets
  }
})

// Format helpers
const formatTokens = (value: number | undefined): string => {
  if (value === undefined || value === null) return '0'
  if (value >= 1_000_000_000) {
    return `${(value / 1_000_000_000).toFixed(2)}B`
  } else if (value >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(2)}M`
  } else if (value >= 1_000) {
    return `${(value / 1_000).toFixed(2)}K`
  }
  return value.toLocaleString()
}

const goToUserUsage = (item: UserSpendingRankingItem) => {
  void router.push({
    path: '/admin/usage',
    query: {
      user_id: String(item.user_id),
      start_date: startDate.value,
      end_date: endDate.value
    }
  })
}

// Date range change handler
const onDateRangeChange = (range: {
  startDate: string
  endDate: string
  preset: string | null
}) => {
  // Auto-select granularity based on date range
  const start = new Date(range.startDate)
  const end = new Date(range.endDate)
  const daysDiff = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))

  // If range is 1 day, use hourly granularity
  if (daysDiff <= 1) {
    granularity.value = 'hour'
  } else {
    granularity.value = 'day'
  }

  loadChartData()
}

// Load data
const loadDashboardSnapshot = async (includeStats: boolean) => {
  const currentSeq = ++chartLoadSeq
  if (includeStats && !stats.value) {
    loading.value = true
  }
  chartsLoading.value = true
  try {
    const response = await adminAPI.dashboard.getSnapshotV2({
      start_date: startDate.value,
      end_date: endDate.value,
      granularity: granularity.value,
      include_stats: includeStats,
      include_trend: true,
      include_model_stats: true,
      include_group_stats: false,
      include_users_trend: false
    })
    if (currentSeq !== chartLoadSeq) return
    if (includeStats && response.stats) {
      stats.value = response.stats
      lastRefreshedAt.value = new Date()
    }
    trendData.value = response.trend || []
    modelStats.value = response.models || []
  } catch (error) {
    if (currentSeq !== chartLoadSeq) return
    appStore.showError(t('admin.dashboard.failedToLoad'))
    console.error('Error loading dashboard snapshot:', error)
  } finally {
    if (currentSeq === chartLoadSeq) {
      loading.value = false
      chartsLoading.value = false
    }
  }
}

const loadUsersTrend = async () => {
  const currentSeq = ++usersTrendLoadSeq
  userTrendLoading.value = true
  try {
    const response = await adminAPI.dashboard.getUserUsageTrend({
      start_date: startDate.value,
      end_date: endDate.value,
      granularity: granularity.value,
      limit: 12
    })
    if (currentSeq !== usersTrendLoadSeq) return
    userTrend.value = response.trend || []
  } catch (error) {
    if (currentSeq !== usersTrendLoadSeq) return
    console.error('Error loading users trend:', error)
    userTrend.value = []
  } finally {
    if (currentSeq === usersTrendLoadSeq) {
      userTrendLoading.value = false
    }
  }
}

const loadUserSpendingRanking = async () => {
  const currentSeq = ++rankingLoadSeq
  rankingLoading.value = true
  rankingError.value = false
  try {
    const response = await adminAPI.dashboard.getUserSpendingRanking({
      start_date: startDate.value,
      end_date: endDate.value,
      limit: rankingLimit
    })
    if (currentSeq !== rankingLoadSeq) return
    rankingItems.value = response.ranking || []
    rankingTotalActualCost.value = response.total_actual_cost || 0
    rankingTotalRequests.value = response.total_requests || 0
    rankingTotalTokens.value = response.total_tokens || 0
  } catch (error) {
    if (currentSeq !== rankingLoadSeq) return
    console.error('Error loading user spending ranking:', error)
    rankingItems.value = []
    rankingTotalActualCost.value = 0
    rankingTotalRequests.value = 0
    rankingTotalTokens.value = 0
    rankingError.value = true
  } finally {
    if (currentSeq === rankingLoadSeq) {
      rankingLoading.value = false
    }
  }
}

const loadDashboardStats = async () => {
  await Promise.all([
    loadDashboardSnapshot(true),
    loadUsersTrend(),
    loadUserSpendingRanking(),
    loadOpsStatus()
  ])
}

const loadChartData = async () => {
  await Promise.all([
    loadDashboardSnapshot(false),
    loadUsersTrend(),
    loadUserSpendingRanking()
  ])
}

onMounted(() => {
  void refreshBatchImageAccess()
  loadDashboardStats()
  void loadSystemInfo()
  // Light polling keeps collector/health cards fresh without reloading charts
  opsPollTimer = setInterval(() => {
    void loadOpsStatus()
  }, 60_000)
})

onBeforeUnmount(() => {
  if (opsPollTimer) {
    clearInterval(opsPollTimer)
    opsPollTimer = null
  }
})
</script>

<style scoped>
</style>
