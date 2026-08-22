<template>
  <div
    :class="rootClass"
    role="tablist"
    :aria-label="ariaLabel"
    :aria-orientation="'horizontal'"
    @keydown="onRootKeyDown"
    @focusout="onRootFocusOut"
  >
    <button
      v-for="item in items"
      :key="String(item.id)"
      :ref="(el) => setItemRef(item.id, el as HTMLElement | null)"
      type="button"
      :class="itemClass(item)"
      role="tab"
      :id="tabDomId(item.id)"
      :aria-selected="isActive(item.id)"
      :aria-disabled="(disabled || item.disabled) ? 'true' : undefined"
      :disabled="isDisabled(item)"
      :tabindex="isActive(item.id) && !isDisabled(item) ? 0 : -1"
      :title="item.title"
      @click="onSelect(item)"
      @keydown="onItemKeyDown($event, item)"
    >
      <slot :name="`tab-${String(item.id)}`" :item="item" :active="isActive(item.id)">
        <span class="truncate">{{ item.label }}</span>
      </slot>
    </button>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount } from 'vue'

export type SegmentedTabItem<Id extends string = string> = {
  id: Id
  label: string
  disabled?: boolean
  title?: string
  /** Optional client link destination — currently rendered as a button with navigation handled via slot. */
  to?: string
}

const props = withDefaults(
  defineProps<{
    items: ReadonlyArray<SegmentedTabItem>
    modelValue: string
    ariaLabel: string
    idBase?: string
    fullWidth?: boolean
    equalWidth?: boolean
    disabled?: boolean
  }>(),
  {
    idBase: 'segmented-tabs',
    fullWidth: false,
    equalWidth: false,
    disabled: false,
  },
)

const emit = defineEmits<{
  'update:modelValue': [value: string]
  change: [value: string]
}>()

const itemRefs = new Map<string, HTMLElement | null>()

function setItemRef(id: string, el: HTMLElement | null) {
  if (el) itemRefs.set(id, el)
  else itemRefs.delete(id)
}

function tabDomId(id: string) {
  return `${props.idBase}-${id}`
}

function isDisabled(item: SegmentedTabItem) {
  return Boolean(props.disabled || item.disabled)
}

function isActive(id: string) {
  return props.modelValue === id
}

const enabledIds = computed(() =>
  props.items.filter((it) => !isDisabled(it as SegmentedTabItem)).map((it) => String(it.id)),
)

function focusId(id: string) {
  itemRefs.get(id)?.focus()
}

function onSelect(item: SegmentedTabItem) {
  if (isDisabled(item)) return
  const id = String(item.id)
  if (id !== props.modelValue) {
    emit('update:modelValue', id)
    emit('change', id)
  }
}

function moveFocus(currentId: string, delta: number) {
  const ids = enabledIds.value
  if (!ids.length) return
  const idx = ids.indexOf(currentId)
  if (idx === -1) return
  const nextIdx = (idx + delta + ids.length) % ids.length
  const nextId = ids[nextIdx]!
  focusId(nextId)
  emit('update:modelValue', nextId)
  emit('change', nextId)
}

function focusFirst() {
  const id = enabledIds.value[0]
  if (!id) return
  focusId(id)
  emit('update:modelValue', id)
  emit('change', id)
}
function focusLast() {
  const ids = enabledIds.value
  const id = ids[ids.length - 1]
  if (!id) return
  focusId(id)
  emit('update:modelValue', id)
  emit('change', id)
}

function onItemKeyDown(e: KeyboardEvent, item: SegmentedTabItem) {
  const id = String(item.id)
  if (!enabledIds.value.includes(id)) return
  switch (e.key) {
    case 'ArrowRight':
    case 'ArrowDown':
      e.preventDefault()
      moveFocus(id, 1)
      break
    case 'ArrowLeft':
    case 'ArrowUp':
      e.preventDefault()
      moveFocus(id, -1)
      break
    case 'Home':
      e.preventDefault()
      focusFirst()
      break
    case 'End':
      e.preventDefault()
      focusLast()
      break
  }
}

function onRootKeyDown(_e: KeyboardEvent) {
  // handled per-item; root handler kept for future roving tabindex if needed
}

function onRootFocusOut(e: FocusEvent) {
  // When focus leaves the tablist entirely, keep the roving tabindex on the
  // selected tab (ARIA tabs pattern) instead of the last arrow-navigated tab.
  const root = e.currentTarget as HTMLElement | null
  if (!root) return
  if (e.relatedTarget instanceof Node && root.contains(e.relatedTarget)) return
  const selected = itemRefs.get(props.modelValue)
  if (selected && !isDisabledById(props.modelValue)) {
    itemRefs.forEach((el, id) => {
      if (el) (el as HTMLElement).tabIndex = id === props.modelValue ? 0 : -1
    })
  }
}

function isDisabledById(id: string) {
  const item = props.items.find((it) => String(it.id) === id)
  return !item || isDisabled(item)
}

onBeforeUnmount(() => itemRefs.clear())

const rootClass = computed(() => [
  'segmented-tabs-root',
  props.fullWidth ? 'segmented-tabs-full' : '',
  props.equalWidth ? 'segmented-tabs-equal' : '',
])

function itemClass(item: SegmentedTabItem) {
  return [
    'segmented-tabs-item',
    isActive(String(item.id)) ? 'is-active' : '',
    isDisabled(item) ? 'is-disabled' : '',
  ]
}
</script>

<style scoped>
.segmented-tabs-root {
  display: inline-flex;
  align-items: stretch;
  gap: 4px;
  width: fit-content;
  max-width: 100%;
  padding: 4px;
  border: 1px solid color-mix(in srgb, var(--cpa-app-border, rgba(15, 23, 42, 0.08)) 82%, transparent);
  border-radius: 14px;
  background: color-mix(in srgb, var(--cpa-surface-subtle, #f6faff) 78%, var(--cpa-app-surface-strong, #fff));
  box-shadow: inset 0 1px 2px rgba(15, 23, 42, 0.05);
  overflow-x: auto;
  overflow-y: hidden;
  scrollbar-width: none;
}
.segmented-tabs-root::-webkit-scrollbar {
  display: none;
}
.segmented-tabs-full {
  width: 100%;
}
@media (max-width: 768px) {
  .segmented-tabs-root {
    width: 100%;
  }
}
.segmented-tabs-item {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 auto;
  min-height: 34px;
  min-width: 112px;
  padding: 0 15px;
  border-radius: 10px;
  border: 0;
  background: transparent;
  color: color-mix(in srgb, var(--cpa-app-text-regular, #5f6c7b) 84%, var(--cpa-app-text-primary, #2c3e50));
  font-size: 13px;
  font-weight: 700;
  line-height: 1.2;
  text-align: center;
  white-space: nowrap;
  cursor: pointer;
  transition:
    color 0.15s ease,
    background-color 0.15s ease,
    box-shadow 0.15s ease,
    transform 0.15s ease;
}
.segmented-tabs-item:hover:not(.is-disabled):not(.is-active) {
  color: var(--cpa-primary-active, var(--cpa-data-blue-dark-2));
  background: color-mix(in srgb, var(--cpa-primary, #3b82f6) 6%, var(--cpa-app-surface-strong, #fff));
}
.segmented-tabs-equal .segmented-tabs-item {
  flex: 1 1 0;
  min-width: 0;
}
.segmented-tabs-item.is-active,
.segmented-tabs-item.is-active:hover {
  color: var(--cpa-primary-active, var(--cpa-data-blue-dark-2));
  background: color-mix(in srgb, var(--cpa-app-surface-strong, #fff) 88%, var(--cpa-primary, #3b82f6));
  box-shadow:
    0 1px 3px rgba(15, 23, 42, 0.1),
    inset 0 0 0 1px color-mix(in srgb, var(--cpa-primary, #3b82f6) 16%, transparent);
  font-weight: 800;
}
.segmented-tabs-item.is-disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
.segmented-tabs-item:focus-visible {
  outline: 2px solid var(--cpa-primary-ring, rgba(59, 130, 246, 0.22));
  outline-offset: 1px;
}
</style>
