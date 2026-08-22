<template>
  <div class="space-y-2">
    <div
      v-for="(entry, index) in entries"
      :key="entry.key"
      class="flex flex-col gap-1"
    >
      <div class="flex items-center gap-2">
        <input
          v-model="entry.name"
          type="text"
          :placeholder="t('admin.modelAliasEditor.namePlaceholder')"
          :disabled="disabled"
          class="input flex-1"
          :aria-label="t('admin.modelAliasEditor.namePlaceholder')"
          @input="emitUpdate"
        />
        <Icon name="arrowRight" size="sm" class="shrink-0 text-primary-300 dark:text-primary-700" />
        <input
          v-model="entry.alias"
          type="text"
          :placeholder="t('admin.modelAliasEditor.aliasPlaceholder')"
          :disabled="disabled"
          class="input flex-1"
          :aria-label="t('admin.modelAliasEditor.aliasPlaceholder')"
          @input="emitUpdate"
        />
        <button
          type="button"
          :disabled="disabled || entries.length <= 1"
          class="btn btn-xs btn-ghost shrink-0 p-1 text-gray-400 transition-colors hover:text-red-500 disabled:opacity-40"
          :title="t('common.delete')"
          :aria-label="t('common.delete')"
          @click="removeEntry(index)"
        >
          <Icon name="x" size="sm" />
        </button>
      </div>
      <p
        v-for="issue in issuesByEntry[entry.key] ?? []"
        :key="`${entry.key}:${issue}`"
        class="text-xs text-red-500 dark:text-red-400"
      >
        {{ issue }}
      </p>
    </div>

    <button
      type="button"
      :disabled="disabled"
      class="btn btn-secondary btn-sm w-fit"
      :title="addButtonTitle"
      :aria-label="addButtonTitle"
      @click="addEntry"
    >
      <Icon name="plus" size="sm" />
      {{ addButtonTitle }}
    </button>
  </div>
</template>

<script setup lang="ts">
/**
 * Model alias mapping editor — Vue port of CPA Manager Plus ModelInputList
 * (apps/web/src/components/ui/ModelInputList.tsx) plus its modelInputListUtils
 * trim/alias-drop semantics, with added validation and duplicate detection:
 * - rows are trimmed on emit; an alias equal to the name is dropped
 * - blank names are ignored in the emitted model list but kept for editing
 * - duplicate names / conflicting aliases surface inline errors and set
 *   `hasDuplicates` so parents can block submission
 */
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import Icon from '@/components/icons/Icon.vue'

export interface ModelAliasValue {
  name: string
  alias?: string
}

interface EntryRow {
  key: number
  name: string
  alias: string
}

const props = withDefaults(
  defineProps<{
    modelValue?: ModelAliasValue[]
    disabled?: boolean
    addButtonTitle?: string
  }>(),
  {
    modelValue: () => [],
    disabled: false,
    addButtonTitle: undefined
  }
)

const emit = defineEmits<{
  'update:modelValue': [value: ModelAliasValue[]]
  duplicates: [hasDuplicates: boolean]
}>()

const { t } = useI18n()

let nextKey = 1
const toRows = (models: ModelAliasValue[]): EntryRow[] =>
  models.length > 0
    ? models.map((model) => ({
        key: nextKey++,
        name: model.name ?? '',
        alias: model.alias && model.alias !== model.name ? model.alias : ''
      }))
    : [{ key: nextKey++, name: '', alias: '' }]

const entries = ref<EntryRow[]>(toRows(props.modelValue))

watch(
  () => props.modelValue,
  (next) => {
    const normalized = normalizeModels(entries.value)
    const incoming = next ?? []
    const sameShape =
      incoming.length === normalized.length &&
      incoming.every((model, index) => model.name === normalized[index].name && model.alias === normalized[index].alias)
    if (!sameShape) {
      entries.value = toRows(incoming)
    }
  },
  { deep: true }
)

function normalizeModels(rows: EntryRow[]): ModelAliasValue[] {
  return rows
    .map((row) => ({ name: row.name.trim(), alias: row.alias.trim() }))
    .filter((row) => row.name !== '')
    .map((row) => (row.alias !== '' && row.alias !== row.name ? { name: row.name, alias: row.alias } : { name: row.name }))
}

const emitUpdate = () => {
  emit('update:modelValue', normalizeModels(entries.value))
}

const addEntry = () => {
  entries.value.push({ key: nextKey++, name: '', alias: '' })
  emitUpdate()
}

const removeEntry = (index: number) => {
  entries.value.splice(index, 1)
  if (entries.value.length === 0) {
    entries.value.push({ key: nextKey++, name: '', alias: '' })
  }
  emitUpdate()
}

// ==================== Validation / dedup ====================

/** Duplicate names or aliases across non-blank, fully-filled rows. */
const duplicates = computed(() => {
  const filled = entries.value.filter((row) => row.name.trim() !== '')
  const seenName = new Set<string>()
  const seenAlias = new Set<string>()
  const dupNames = new Set<string>()
  const dupAliases = new Set<string>()

  for (const row of filled) {
    const name = row.name.trim()
    const alias = row.alias.trim()
    if (seenName.has(name)) {
      dupNames.add(name)
    } else {
      seenName.add(name)
    }
    // An alias identical to its own name is dropped at emit time — not a conflict.
    if (alias !== '' && alias.toLowerCase() !== name.toLowerCase()) {
      if (seenAlias.has(alias.toLowerCase())) {
        dupAliases.add(alias)
      } else {
        seenAlias.add(alias.toLowerCase())
      }
    }
  }
  return { dupNames, dupAliases }
})

const issuesByEntry = computed<Record<number, string[]>>(() => {
  const result: Record<number, string[]> = {}
  for (const row of entries.value) {
    const issues: string[] = []
    const name = row.name.trim()
    const alias = row.alias.trim()
    if (name !== '' && duplicates.value.dupNames.has(name)) {
      issues.push(t('admin.modelAliasEditor.duplicateName'))
    }
    if (
      alias !== '' &&
      alias.toLowerCase() !== name.toLowerCase() &&
      duplicates.value.dupAliases.has(alias)
    ) {
      issues.push(t('admin.modelAliasEditor.duplicateAlias'))
    }
    if (issues.length > 0) {
      result[row.key] = issues
    }
  }
  return result
})

const hasDuplicates = computed(() => duplicates.value.dupNames.size > 0 || duplicates.value.dupAliases.size > 0)

watch(hasDuplicates, (value) => emit('duplicates', value), { immediate: true })

defineExpose({ hasDuplicates })
</script>
