<template>
  <section class="cpa-card">
    <div class="cpa-card-head">
      <h3 class="cpa-card-title">{{ t('admin.dashboard.healthAlerts') }}</h3>
      <span v-if="loading" class="skeleton h-4 w-10 rounded" />
    </div>
    <div v-if="loading && !items.length" class="space-y-2">
      <div v-for="i in 4" :key="i" class="skeleton h-10 rounded-xl" />
    </div>
    <template v-else>
      <div v-if="!items.length" class="py-6 text-center text-sm text-gray-500">
        <EmptyState :title="t('admin.dashboard.noAlerts')" />
      </div>
      <ul v-else class="space-y-2">
        <li
          v-for="(it, idx) in items.slice(0, 5)"
          :key="idx"
          class="flex items-start gap-3 rounded-xl border px-3 py-2 dark:border-dark-700"
          :style="{ borderColor: 'var(--cpa-app-border)' }"
        >
          <span :class="['mt-1.5 h-2 w-2 shrink-0 rounded-full', toneDot(it.tone)]" />
          <div class="min-w-0 flex-1">
            <div class="truncate text-sm font-medium text-gray-900 dark:text-white">{{ it.label }}</div>
            <div v-if="it.detail" class="truncate text-xs text-gray-500">{{ it.detail }}</div>
          </div>
          <span v-if="it.value" class="shrink-0 text-xs font-medium" :class="toneText(it.tone)">{{ it.value }}</span>
        </li>
      </ul>
    </template>
  </section>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import EmptyState from '@/components/common/EmptyState.vue'

export type HealthAlertItem = { label: string; detail?: string; value?: string; tone?: 'ok' | 'warn' | 'error' | 'muted' }

withDefaults(defineProps<{ items?: HealthAlertItem[]; loading?: boolean }>(), { items: () => [], loading: false })
const { t } = useI18n()

function toneDot(tone?: string) {
  if (tone === 'error') return 'bg-red-500'
  if (tone === 'warn') return 'bg-amber-500'
  if (tone === 'ok') return 'bg-emerald-500'
  return 'bg-gray-300 dark:bg-dark-600'
}
function toneText(tone?: string) {
  if (tone === 'error') return 'text-red-600'
  if (tone === 'warn') return 'text-amber-600'
  if (tone === 'ok') return 'text-emerald-600'
  return 'text-gray-500'
}
</script>

<style scoped>
.cpa-card { @apply rounded-2xl border bg-white p-4 dark:bg-dark-800/60 dark:border-dark-700; border-color: var(--cpa-app-border, rgba(15,23,42,.08)); }
.cpa-card-head { @apply mb-3 flex items-center justify-between gap-2; }
.cpa-card-title { @apply text-sm font-semibold text-gray-900 dark:text-white; }
</style>
