<template>
  <section class="cpa-card">
    <div class="cpa-card-head">
      <h3 class="cpa-card-title">{{ t('admin.dashboard.collectorStatus') }}</h3>
      <span v-if="loading" class="skeleton h-4 w-14 rounded" />
      <span v-else :class="['badge text-[11px]', toneClass]"><i class="status-dot" />{{ statusLabel }}</span>
    </div>
    <div v-if="loading && !rows.length" class="space-y-2">
      <div v-for="i in 6" :key="i" class="skeleton h-6 rounded" />
    </div>
    <div v-else class="space-y-2 text-sm">
      <div v-for="row in rows" :key="row.label" class="flex justify-between gap-3">
        <span class="text-gray-500 dark:text-gray-400">{{ row.label }}</span>
        <span class="min-w-0 truncate font-medium text-gray-900 dark:text-white">{{ row.value }}</span>
      </div>
      <div v-if="lastError" class="rounded-lg bg-amber-50 p-2 text-xs text-amber-800 dark:bg-amber-900/20 dark:text-amber-200">
        <span class="font-medium">{{ t('admin.dashboard.collectorLastError') }}: </span>{{ lastError }}
      </div>
    </div>
    <div v-if="error && !lastError" class="mt-3 text-xs text-red-600">{{ t('admin.dashboard.collectorUnavailable') }}</div>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

export type CollectorRow = { label: string; value: string }

const props = withDefaults(defineProps<{
  enabled?: boolean
  mode?: string
  queue?: string
  events?: number
  deadLetters?: number
  totalInserted?: number
  totalSkipped?: number
  lastError?: string
  loading?: boolean
  error?: string
}>(), { enabled: true, mode: '', queue: '', events: undefined, deadLetters: undefined, totalInserted: undefined, totalSkipped: undefined, lastError: '', loading: false, error: '' })

const { t } = useI18n()
function fmt(v: number | undefined) {
  return Number.isFinite(v as number) ? (v as number).toLocaleString() : '—'
}

const rows = computed<CollectorRow[]>(() => [
  { label: t('admin.dashboard.collectorMode'), value: props.mode || '—' },
  { label: t('admin.dashboard.healthQueueStatus'), value: queueStatus.value },
  { label: t('admin.dashboard.collectorEvents'), value: fmt(props.events) },
  { label: t('admin.dashboard.collectorDeadLetters'), value: fmt(props.deadLetters) },
  { label: t('admin.dashboard.collectorTotalInserted'), value: fmt(props.totalInserted) },
  { label: t('admin.dashboard.collectorTotalSkipped'), value: fmt(props.totalSkipped) }
])

const queueOk = computed(() => props.enabled && !props.error && !props.lastError)
const queueStatus = computed(() => {
  if (!props.enabled) return t('common.disabled')
  if (props.error) return t('admin.dashboard.collectorUnavailable')
  if (props.lastError) return t('common.warning')
  return props.queue || t('admin.dashboard.ok')
})
const statusLabel = computed(() => queueStatus.value)
const toneClass = computed(() => (queueOk.value ? 'badge-success' : 'badge-warning'))
</script>

<style scoped>
.cpa-card { @apply rounded-2xl border bg-white p-4 dark:bg-dark-800/60 dark:border-dark-700; border-color: var(--cpa-app-border, rgba(15,23,42,.08)); }
.cpa-card-head { @apply mb-3 flex items-center justify-between gap-2; }
.cpa-card-title { @apply text-sm font-semibold text-gray-900 dark:text-white; }
.status-dot { @apply mr-1.5 inline-block h-1.5 w-1.5 rounded-full align-middle; background: currentColor; }
</style>
