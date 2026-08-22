<template>
  <section class="cpa-card">
    <div class="cpa-card-head">
      <h3 class="cpa-card-title">{{ t('admin.dashboard.systemOverview') }}</h3>
    </div>
    <div v-if="loading" class="grid grid-cols-2 gap-3">
      <div v-for="i in 4" :key="i" class="skeleton h-16 rounded-xl" />
    </div>
    <div v-else class="grid grid-cols-2 gap-3">
      <div class="cpa-mini-stat">
        <div class="cpa-mini-label">{{ t('admin.dashboard.appVersion') }}</div>
        <div class="cpa-mini-value flex items-center gap-2">
          <span class="truncate">{{ appVersion || t('admin.dashboard.versionUnknown') }}</span>
          <a
            v-if="appVersion"
            :href="managerReleaseUrl"
            target="_blank"
            rel="noopener noreferrer"
            class="text-cpa-blue hover:underline text-xs"
            >↗</a
          >
          <button
            type="button"
            class="text-xs text-cpa-blue hover:underline disabled:opacity-50"
            :disabled="checkingApp"
            :title="t('admin.dashboard.versionCheck')"
            @click="checkAppVersion"
          >
            {{ checkingApp ? '…' : t('common.refresh') }}
          </button>
        </div>
        <span v-if="appBadge" :class="['badge mt-1 text-[10px]', appBadge.ok ? 'badge-success' : 'badge-warning']">
          {{ appBadge.label }}
        </span>
      </div>
      <div class="cpa-mini-stat">
        <div class="cpa-mini-label">{{ t('admin.dashboard.apiVersion') }}</div>
        <div class="cpa-mini-value flex items-center gap-2">
          <span class="truncate">{{ apiVersion || t('admin.dashboard.versionUnknown') }}</span>
          <a
            v-if="apiVersion"
            :href="coreReleaseUrl"
            target="_blank"
            rel="noopener noreferrer"
            class="text-cpa-blue hover:underline text-xs"
            >↗</a
          >
          <button
            type="button"
            class="text-xs text-cpa-blue hover:underline disabled:opacity-50"
            :disabled="checkingApi"
            :title="t('admin.dashboard.versionCheck')"
            @click="checkApiVersion"
          >
            {{ checkingApi ? '…' : t('common.refresh') }}
          </button>
        </div>
        <span v-if="apiBadge" :class="['badge mt-1 text-[10px]', apiBadge.ok ? 'badge-success' : 'badge-warning']">
          {{ apiBadge.label }}
        </span>
      </div>
      <div class="cpa-mini-stat">
        <div class="cpa-mini-label">{{ t('admin.dashboard.buildTime') }}</div>
        <div class="cpa-mini-value">{{ buildTimeDisplay }}</div>
      </div>
      <div class="cpa-mini-stat">
        <div class="cpa-mini-label">{{ t('admin.dashboard.uptime') }}</div>
        <div class="cpa-mini-value">{{ uptimeDisplay }}</div>
      </div>
    </div>
    <div v-if="error" class="mt-3 text-xs text-red-600">{{ error }}</div>
  </section>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { systemAPI } from '@/api/admin/system'

const props = withDefaults(defineProps<{
  appVersion?: string
  apiVersion?: string
  uptimeSeconds?: number
  serverBuildDate?: string
  loading?: boolean
  error?: string
}>(), { appVersion: '', apiVersion: '', uptimeSeconds: 0, serverBuildDate: '', loading: false, error: '' })

const { t } = useI18n()
// vue-i18n's `locale` may be absent in test doubles; fall back safely.
const locale = computed(() => {
  try {
    return (useI18n().locale?.value as string) || undefined
  } catch {
    return undefined
  }
})

const checkingApp = ref(false)
const checkingApi = ref(false)
const latestApp = ref('')
const latestApi = ref('')

const buildTimeDisplay = computed(() => {
  if (!props.serverBuildDate) return '—'
  try { return new Date(props.serverBuildDate).toLocaleString(locale.value) } catch { return props.serverBuildDate }
})

const uptimeDisplay = computed(() => {
  if (!props.uptimeSeconds) return '—'
  const s = Math.floor(props.uptimeSeconds)
  const d = Math.floor(s / 86400)
  const h = Math.floor((s % 86400) / 3600)
  const m = Math.floor((s % 3600) / 60)
  if (d > 0) return `${d}d ${h}h`
  if (h > 0) return `${h}h ${m}m`
  return `${m}m`
})

function versionTag(v: string) {
  return v.trim().replace(/^[vV]+/, '')
}

const appBadge = computed(() => {
  if (!latestApp.value || !props.appVersion) return null
  const cmp = compareVersions(versionTag(latestApp.value), versionTag(props.appVersion))
  if (cmp === null || cmp < 0) return null
  if (cmp > 0) return { label: t('admin.dashboard.versionUpdate', { version: `v${versionTag(latestApp.value)}` }), ok: false }
  return { label: t('admin.dashboard.versionLatest'), ok: true }
})
const apiBadge = computed(() => {
  if (!latestApi.value || !props.apiVersion) return null
  const cmp = compareVersions(versionTag(latestApi.value), versionTag(props.apiVersion))
  if (cmp === null || cmp < 0) return null
  if (cmp > 0) return { label: t('admin.dashboard.versionUpdate', { version: `v${versionTag(latestApi.value)}` }), ok: false }
  return { label: t('admin.dashboard.versionLatest'), ok: true }
})

const managerReleaseUrl = computed(() => `https://github.com/jiucongtang/CPA-Manager-Plus/releases/tag/${encodeURIComponent(props.appVersion || '')}`)
const coreReleaseUrl = computed(() => `https://github.com/jiucongtang/sub2api/releases/tag/${encodeURIComponent(props.apiVersion || '')}`)

function compareVersions(a: string, b: string): number | null {
  const pa = a.split('.').map((x) => parseInt(x, 10))
  const pb = b.split('.').map((x) => parseInt(x, 10))
  if (pa.some((n) => Number.isNaN(n)) || pb.some((n) => Number.isNaN(n))) return null
  const len = Math.max(pa.length, pb.length)
  for (let i = 0; i < len; i++) {
    const da = pa[i] ?? 0; const db = pb[i] ?? 0
    if (da > db) return 1
    if (da < db) return -1
  }
  return 0
}

async function checkAppVersion() {
  checkingApp.value = true
  try {
    const data = await systemAPI.checkUpdates(true)
    latestApp.value = data.latest_version || ''
  } catch { /* ignore */ } finally { checkingApp.value = false }
}
async function checkApiVersion() {
  checkingApi.value = true
  try {
    const data = await systemAPI.checkUpdates(true)
    latestApi.value = data.latest_version || ''
  } catch { /* ignore */ } finally { checkingApi.value = false }
}
</script>

<style scoped>
.cpa-card { @apply rounded-2xl border bg-white p-4 dark:bg-dark-800/60 dark:border-dark-700; border-color: var(--cpa-app-border, rgba(15,23,42,.08)); }
.cpa-card-head { @apply mb-3 flex items-center justify-between; }
.cpa-card-title { @apply text-sm font-semibold text-gray-900 dark:text-white; }
.cpa-mini-stat { @apply rounded-xl bg-gray-50 p-3 dark:bg-dark-900/40; }
.cpa-mini-label { @apply text-[11px] font-medium text-gray-500 dark:text-gray-400; }
.cpa-mini-value { @apply mt-1 text-sm font-semibold text-gray-900 dark:text-white; }
</style>
