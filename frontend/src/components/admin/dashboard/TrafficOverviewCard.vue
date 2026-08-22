<template>
  <section class="cpa-card">
    <div class="cpa-card-head">
      <h3 class="cpa-card-title">{{ t('admin.dashboard.trafficOverview') }}</h3>
      <div class="flex items-center gap-3 text-[11px] text-gray-500 dark:text-gray-400">
        <span class="flex items-center gap-1.5"><i class="dot" style="background: var(--cpa-data-blue-base)" />{{ t('admin.dashboard.requests') }}</span>
        <span class="flex items-center gap-1.5"><i class="dot" style="background: var(--cpa-data-emerald-base)" />{{ t('admin.dashboard.tokens') }}</span>
      </div>
    </div>
    <!-- CPA layout: bars+line chart on the left, token mix ranking on the right -->
    <div class="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_240px]">
      <div>
        <div v-if="loading" class="skeleton h-48 rounded-xl" />
        <div v-else-if="!chartData" class="flex h-48 items-center justify-center rounded-xl">
          <EmptyState :title="t('admin.dashboard.noDataAvailable')" />
        </div>
        <div v-else class="relative h-48">
          <Bar :data="chartData" :options="chartOptions" />
        </div>
      </div>
      <div v-if="showTokenMix" class="lg:border-l lg:pl-4" style="border-color: var(--cpa-app-border)">
        <div class="mb-2 flex items-baseline justify-between">
          <span class="text-[11px] font-medium text-gray-500 dark:text-gray-400">{{ t('admin.dashboard.tokenMixToday') }}</span>
          <strong class="text-xs font-semibold text-gray-900 dark:text-white">{{ fmtCompact(tokenTotal) }}</strong>
        </div>
        <div v-if="loading && !tokenSegments.length" class="space-y-2">
          <div v-for="i in 4" :key="i" class="skeleton h-8 rounded-lg" />
        </div>
        <template v-else-if="tokenSegments.length">
          <button
            v-for="seg in tokenSegments"
            :key="seg.key"
            type="button"
            class="token-row"
            :style="{ '--share': maxShare > 0 ? seg.value / maxShare : 0, '--color': seg.color }"
          >
            <span class="token-row-head">
              <span class="flex min-w-0 items-center gap-1.5">
                <i class="swatch" :style="{ background: seg.color }" />
                <span class="truncate">{{ seg.label }}</span>
              </span>
              <span class="shrink-0 tabular-nums">
                <strong>{{ fmtCompact(seg.value) }}</strong>
                <span class="ml-1 opacity-70">{{ sharePercent(seg.value) }}</span>
              </span>
            </span>
            <span class="track"><span class="bar" /></span>
          </button>
        </template>
        <div v-else class="py-6 text-center text-sm text-gray-500">{{ t('admin.dashboard.noDataAvailable') }}</div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { Bar } from 'vue-chartjs'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
} from 'chart.js'
import EmptyState from '@/components/common/EmptyState.vue'
import type { ChartDataset } from 'chart.js'
import type { TrendDataPoint } from '@/types'

ChartJS.register(CategoryScale, LinearScale, BarElement, PointElement, LineElement, Tooltip, Legend)

const props = withDefaults(defineProps<{
  points?: TrendDataPoint[]
  loading?: boolean
  /** When false the right-hand token-mix column is hidden entirely. */
  showTokenMix?: boolean
}>(), { points: () => [], loading: false, showTokenMix: true })

const { t } = useI18n()

const isDark = computed(() => typeof document !== 'undefined' && document.documentElement.classList.contains('dark'))

function fmtCompact(n: number) {
  if (!Number.isFinite(n)) return '—'
  if (n >= 1e9) return `${(n / 1e9).toFixed(2)}B`
  if (n >= 1e6) return `${(n / 1e6).toFixed(2)}M`
  if (n >= 1e3) return `${(n / 1e3).toFixed(2)}K`
  return String(n)
}

// CPA traffic model: tokens as bars (left axis), requests as a line overlay (right axis)
const chartData = computed(() => {
  const pts = props.points
  if (!pts.length) return null
  // vue-chartjs accepts mixed charts; the line dataset is typed via ChartDataset<'line'> and cast
  const datasets: ChartDataset<'bar', number[]>[] = [
    {
      label: t('admin.dashboard.tokens'),
      data: pts.map((p) => p.total_tokens),
      backgroundColor: isDark.value ? 'rgba(52,211,153,.45)' : 'rgba(16,185,129,.75)',
      borderRadius: 4,
      maxBarThickness: 20,
      yAxisID: 'y',
      order: 2
    },
    {
      label: t('admin.dashboard.requests'),
      data: pts.map((p) => p.requests),
      type: 'line',
      borderColor: '#60a5fa',
      backgroundColor: 'rgba(96,165,250,.12)',
      borderWidth: 2,
      pointRadius: pts.length <= 24 ? 2 : 0,
      pointBackgroundColor: '#60a5fa',
      tension: 0.22,
      fill: true,
      yAxisID: 'y1',
      order: 1
    } as unknown as ChartDataset<'bar', number[]>
  ]
  return {
    labels: pts.map((p) => p.date),
    datasets
  }
})

const chartOptions = computed(() => ({
  responsive: true,
  maintainAspectRatio: false,
  interaction: { intersect: false, mode: 'index' as const },
  plugins: {
    legend: { display: false },
    tooltip: {
      callbacks: {
        label: (ctx: { dataset: { label?: string }; raw: unknown }) =>
          `${ctx.dataset.label ?? ''}: ${Number(ctx.raw).toLocaleString()}`
      }
    }
  },
  scales: {
    x: {
      stacked: true,
      grid: { display: false },
      ticks: { color: isDark.value ? '#e5e7eb' : '#374151', font: { size: 10 }, maxRotation: 0, autoSkipPadding: 12 }
    },
    y: {
      grid: { color: isDark.value ? 'rgba(255,255,255,.08)' : '#f3f4f6' },
      ticks: { color: isDark.value ? '#34d399' : '#059669', font: { size: 10 }, callback: (v: string | number) => fmtCompact(Number(v)) }
    },
    y1: {
      position: 'right' as const,
      grid: { display: false },
      ticks: { color: isDark.value ? '#60a5fa' : '#2563eb', font: { size: 10 }, callback: (v: string | number) => fmtCompact(Number(v)) }
    }
  }
}))

// sub2api trend points carry input/output/cache token splits — map them to CPA's mix rows
interface TokenSegment { key: string; label: string; value: number; color: string }

const tokenSegments = computed<TokenSegment[]>(() => {
  const pts = props.points
  if (!pts.length) return []
  const sum = (pick: (p: TrendDataPoint) => number) => pts.reduce((acc, p) => acc + (pick(p) || 0), 0)
  return [
    { key: 'input', label: t('admin.dashboard.input'), value: sum((p) => p.input_tokens), color: 'var(--cpa-data-blue-base)' },
    { key: 'output', label: t('admin.dashboard.output'), value: sum((p) => p.output_tokens), color: 'var(--cpa-data-emerald-base)' },
    { key: 'cache_read', label: t('admin.dashboard.cacheRead'), value: sum((p) => p.cache_read_tokens), color: 'var(--cpa-data-amber-base)' },
    {
      key: 'cache_creation',
      label: t('admin.dashboard.cacheCreation'),
      value: sum((p) => p.cache_creation_tokens),
      color: 'var(--cpa-data-violet-base)'
    }
  ].filter((s) => s.value > 0).sort((a, b) => b.value - a.value)
})

const tokenTotal = computed(() => tokenSegments.value.reduce((acc, s) => acc + s.value, 0))
const maxShare = computed(() => tokenSegments.value.reduce((max, s) => Math.max(max, s.value), 0))
const sharePercent = (value: number) => (tokenTotal.value > 0 ? `${((value / tokenTotal.value) * 100).toFixed(1)}%` : '0%')
</script>

<style scoped>
.cpa-card { @apply rounded-2xl border bg-white p-4 dark:bg-dark-800/60 dark:border-dark-700; border-color: var(--cpa-app-border, rgba(15,23,42,.08)); }
.cpa-card-head { @apply mb-3 flex items-center justify-between gap-2; }
.cpa-card-title { @apply text-sm font-semibold text-gray-900 dark:text-white; }
.dot { @apply inline-block h-2 w-2 rounded-full; }
.token-row { @apply mb-2 block w-full cursor-default rounded-lg px-1 py-1 text-left transition-colors; }
.token-row:hover { background: color-mix(in srgb, var(--color) 8%, transparent); }
.token-row-head { @apply flex items-center justify-between gap-2 text-[11px] text-gray-600 dark:text-gray-300; }
.swatch { @apply inline-block h-2 w-2 shrink-0 rounded-full; }
.track { @apply mt-1 block h-1 overflow-hidden rounded-full; background: var(--cpa-data-track-bg); }
.bar { @apply block h-full rounded-full; width: calc(var(--share) * 100%); background: var(--color); }
</style>
