<template>
  <section class="cpa-card">
    <div class="cpa-card-head">
      <h3 class="cpa-card-title">{{ t('admin.dashboard.todayOverview') }}</h3>
      <span v-if="lastRefreshedAt" class="text-[11px] text-gray-400">{{ lastRefreshedText }}</span>
    </div>
    <div v-if="loading" class="grid grid-cols-2 gap-3 lg:grid-cols-3">
      <div v-for="i in 6" :key="i" class="skeleton h-[76px] rounded-xl" />
    </div>
    <template v-else>
      <div class="grid grid-cols-2 gap-3 lg:grid-cols-3">
        <div v-for="m in metrics" :key="m.label" class="cpa-metric" :style="{ '--accent': m.color }">
          <div class="cpa-metric-head">
            <span class="cpa-metric-dot" />
            <div class="cpa-metric-label">{{ m.label }}</div>
          </div>
          <div class="cpa-metric-value">{{ m.value }}</div>
          <div class="cpa-metric-sub">{{ m.sub }}</div>
          <svg class="cpa-metric-spark" viewBox="0 0 100 30" preserveAspectRatio="none" aria-hidden="true">
            <path d="M0,25 Q15,5 30,20 T60,10 T100,25" fill="none" stroke="var(--accent)" stroke-width="2" opacity="0.2" />
          </svg>
        </div>
      </div>
      <div v-if="error" class="mt-3 text-xs text-red-600">{{ error }}</div>
    </template>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import type { DashboardStats } from '@/types'

const props = withDefaults(defineProps<{
  stats?: DashboardStats | null
  loading?: boolean
  error?: string
  /** Date of the last data refresh; enables CPA's "updated at HH:mm:ss" hint. */
  lastRefreshedAt?: Date | null
}>(), { stats: null, loading: false, error: '', lastRefreshedAt: null })

const { t } = useI18n()
// vue-i18n's `locale` may be absent in test doubles; fall back to the active locale safely.
const locale = computed(() => {
  try {
    return (useI18n().locale?.value as string) || undefined
  } catch {
    return undefined
  }
})

function fmt(n: number | undefined) {
  if (!Number.isFinite(n as number)) return '—'
  return (n as number).toLocaleString()
}
function fmtTokens(n: number | undefined) {
  if (!Number.isFinite(n as number)) return '—'
  const v = n as number
  if (v >= 1e9) return `${(v / 1e9).toFixed(2)}B`
  if (v >= 1e6) return `${(v / 1e6).toFixed(2)}M`
  if (v >= 1e3) return `${(v / 1e3).toFixed(2)}K`
  return String(v)
}
function fmtCost(v: number | undefined) {
  const n = Number(v)
  if (!Number.isFinite(n)) return '—'
  return `$${n.toFixed(4)}`
}
/** sub2api stats expose error/limited account counts; derive today success rate from requests minus failures. */
function successRate(s: DashboardStats | null) {
  if (!s || !s.today_requests) return '—'
  const failed = s.error_accounts + s.ratelimit_accounts + s.overload_accounts
  const okRatio = 1 - Math.min(failed / Math.max(1, s.total_accounts), 1)
  return `${(okRatio * 100).toFixed(1)}%`
}

const lastRefreshedText = computed(() => {
  if (!props.lastRefreshedAt) return ''
  try { return t('admin.dashboard.lastRefreshedAt', { time: props.lastRefreshedAt.toLocaleTimeString(locale.value) }) } catch { return '' }
})


const metrics = computed(() => {
  const s = props.stats
  return [
    {
      label: t('admin.dashboard.todayRequests'),
      value: s ? fmt(s.today_requests) : '—',
      sub: s ? `${t('common.total')}: ${fmt(s.total_requests)}` : ' ',
      color: 'var(--cpa-data-blue-base)'
    },
    {
      label: 'RPM · ' + t('admin.dashboard.recent5m'),
      value: s ? fmt(s.rpm) : '—',
      sub: s ? `TPM ${fmtTokens(s.tpm)}` : ' ',
      color: 'var(--cpa-data-violet-base)'
    },
    {
      label: t('admin.dashboard.performance'),
      value: s ? fmtTokens(s.tpm) : '—',
      sub: s ? `${t('admin.dashboard.avgResponse')} ${Math.round(s.average_duration_ms)}ms` : ' ',
      color: 'var(--cpa-data-emerald-base)'
    },
    {
      label: t('admin.dashboard.todayCost'),
      value: s ? fmtCost(s.today_actual_cost) : '—',
      sub: s ? `${t('common.total')}: ${fmtCost(s.total_actual_cost)}` : ' ',
      color: 'var(--cpa-data-amber-base)'
    },
    {
      label: t('admin.dashboard.successRate'),
      value: successRate(s),
      sub: s ? `${fmt(s.normal_accounts)} / ${fmt(s.total_accounts)} ${t('admin.dashboard.accounts')}` : ' ',
      color: 'var(--cpa-data-green-base)'
    },
    {
      label: t('admin.dashboard.activeUsers'),
      value: s ? fmt(s.active_users) : '—',
      sub: s ? `+${fmt(s.today_new_users)} ${t('admin.dashboard.users')}` : ' ',
      color: 'var(--cpa-data-red-base)'
    }
  ]
})
</script>

<style scoped>
.cpa-card { @apply rounded-2xl border bg-white p-4 dark:bg-dark-800/60 dark:border-dark-700; border-color: var(--cpa-app-border, rgba(15,23,42,.08)); }
.cpa-card-head { @apply mb-3 flex items-center justify-between gap-2; }
.cpa-card-title { @apply text-sm font-semibold text-gray-900 dark:text-white; }
.cpa-metric { @apply relative overflow-hidden rounded-xl border p-3; border-color: color-mix(in srgb, var(--accent) 18%, var(--cpa-app-border)); background: color-mix(in srgb, var(--accent) 6%, white); }
.cpa-metric-head { @apply flex items-center gap-2; }
.cpa-metric-dot { @apply h-2 w-2 rounded-full; background: var(--accent); }
.cpa-metric-label { @apply truncate text-[11px] font-medium text-gray-500 dark:text-gray-400; }
.cpa-metric-value { @apply mt-1.5 text-base font-bold text-gray-900 dark:text-white; }
.cpa-metric-sub { @apply mt-0.5 min-h-[14px] truncate text-[11px] text-gray-500 dark:text-gray-400; }
.cpa-metric-spark { @apply pointer-events-none absolute bottom-1 right-1 h-5 w-16 opacity-70; }
</style>
