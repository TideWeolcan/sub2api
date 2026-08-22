<template>
  <Teleport to="body">
    <Transition name="drawer-fade" @after-leave="onAfterLeave">
      <div
        v-if="visibleLocal"
        class="app-drawer-overlay"
        :class="overlayClass"
        role="presentation"
        @pointerdown="onOverlayPointerDown"
        @pointerup="onOverlayPointerUp"
        @pointercancel="onOverlayPointerCancel"
      >
        <div
          ref="panelRef"
          class="app-drawer-panel"
          :class="panelClass"
          :style="panelStyle"
          role="dialog"
          aria-modal="true"
          :aria-labelledby="title ? titleId : undefined"
          tabindex="-1"
          @click.stop
          @keydown.tab="onTabKey"
        >
          <div class="app-drawer-header">
            <div :id="title ? titleId : undefined" class="app-drawer-title">
              <slot name="title">{{ title }}</slot>
            </div>
            <button
              type="button"
              class="app-drawer-close"
              :aria-label="t('common.close')"
              :title="t('common.close')"
              @click="requestClose"
            >
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                <path d="M18 6L6 18M6 6l12 12" stroke-linecap="round" />
              </svg>
            </button>
          </div>
          <div ref="bodyRef" class="app-drawer-body">
            <slot />
          </div>
          <div v-if="$slots.footer" class="app-drawer-footer">
            <slot name="footer" />
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'

const props = withDefaults(
  defineProps<{
    modelValue: boolean
    title?: string
    width?: number | string
    closeOnOverlay?: boolean
    closeOnEsc?: boolean
    /** Return false to cancel the close; async checks resolve before the closing animation starts. */
    onBeforeClose?: () => boolean | Promise<boolean>
  }>(),
  {
    title: '',
    width: 420,
    closeOnOverlay: true,
    closeOnEsc: true,
    onBeforeClose: undefined,
  },
)

const emit = defineEmits<{
  'update:modelValue': [v: boolean]
  close: []
}>()

const { t } = useI18n()

let titleSeq = 0
const titleId = `app-drawer-title-${++titleSeq}-${Math.random().toString(36).slice(2, 6)}`

const panelRef = ref<HTMLElement | null>(null)
const bodyRef = ref<HTMLElement | null>(null)
const visibleLocal = ref(props.modelValue)
const closing = ref(false)
let closeTimer: ReturnType<typeof setTimeout> | null = null
let prevActive: HTMLElement | null = null
let scrollLocked = false
let savedBodyOverflow = ''
let savedHtmlOverflow = ''

const overlayClass = computed(() => (closing.value ? 'is-closing' : 'is-entering'))
const panelClass = computed(() => (closing.value ? 'panel-closing' : 'panel-entering'))

const panelStyle = computed(() => {
  const w = props.width
  const widthVal = typeof w === 'number' ? `${w}px` : String(w)
  return { width: widthVal } as Record<string, string>
})

function lockScroll() {
  if (scrollLocked) return
  savedBodyOverflow = document.body.style.overflow
  savedHtmlOverflow = document.documentElement.style.overflow
  document.body.style.overflow = 'hidden'
  document.documentElement.style.overflow = 'hidden'
  scrollLocked = true
}
function unlockScroll() {
  if (!scrollLocked) return
  document.body.style.overflow = savedBodyOverflow
  document.documentElement.style.overflow = savedHtmlOverflow
  scrollLocked = false
}

function focusPanel() {
  nextTick(() => panelRef.value?.focus())
}

function restoreFocus() {
  prevActive?.focus?.()
  prevActive = null
}

function onAfterLeave() {
  unlockScroll()
  restoreFocus()
  emit('update:modelValue', false)
  emit('close')
}

let closeRequestPending = false
let closeRequestToken = 0

async function requestClose() {
  if (closeTimer || closeRequestPending) return
  if (props.onBeforeClose) {
    closeRequestPending = true
    const token = ++closeRequestToken
    let allowed: boolean
    try {
      allowed = await props.onBeforeClose()
    } catch {
      // Keep the drawer open when the pre-close check fails, so user input is not lost.
      allowed = false
    } finally {
      if (closeRequestToken === token) closeRequestPending = false
    }
    if (closeRequestToken !== token || !allowed) return
  }
  closing.value = true
  closeTimer = setTimeout(() => {
    closeTimer = null
    visibleLocal.value = false
    closing.value = false
  }, 280)
}

const overlayPointerIds = new Set<number>()

function onOverlayPointerDown(e: PointerEvent) {
  if (e.target === e.currentTarget && e.button === 0) overlayPointerIds.add(e.pointerId)
  else overlayPointerIds.delete(e.pointerId)
}
function onOverlayPointerUp(e: PointerEvent) {
  const started = overlayPointerIds.delete(e.pointerId)
  if (started && e.target === e.currentTarget && e.button === 0 && props.closeOnOverlay) {
    requestClose()
  }
}
function onOverlayPointerCancel(e: PointerEvent) {
  overlayPointerIds.delete(e.pointerId)
}

function getFocusable(container: HTMLElement): HTMLElement[] {
  const sel =
    'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
  return Array.from(container.querySelectorAll<HTMLElement>(sel)).filter(
    (el) => !el.hasAttribute('hidden') && el.getClientRects().length > 0,
  )
}

function onTabKey(e: KeyboardEvent) {
  const panel = panelRef.value
  if (!panel) return
  const focusable = getFocusable(panel)
  if (focusable.length === 0) {
    e.preventDefault()
    return
  }
  const first = focusable[0]!
  const last = focusable[focusable.length - 1]!
  const active = document.activeElement as HTMLElement | null
  if (e.shiftKey) {
    if (active === first) {
      e.preventDefault()
      last.focus()
    }
  } else {
    if (active === last) {
      e.preventDefault()
      first.focus()
    }
  }
}

function onKeyDown(e: KeyboardEvent) {
  if (e.key === 'Escape' && props.closeOnEsc) {
    e.preventDefault()
    requestClose()
  }
}

watch(
  () => props.modelValue,
  (open) => {
    if (open) {
      if (closeTimer) {
        clearTimeout(closeTimer)
        closeTimer = null
      }
      // Invalidate any in-flight onBeforeClose check from a previous open state.
      closeRequestToken += 1
      closeRequestPending = false
      prevActive = document.activeElement instanceof HTMLElement ? document.activeElement : null
      visibleLocal.value = true
      closing.value = false
      lockScroll()
      document.addEventListener('keydown', onKeyDown)
      focusPanel()
    } else if (visibleLocal.value) {
      document.removeEventListener('keydown', onKeyDown)
      requestClose()
    }
  },
  { immediate: true },
)

onBeforeUnmount(() => {
  if (closeTimer) clearTimeout(closeTimer)
  closeRequestToken += 1
  document.removeEventListener('keydown', onKeyDown)
  if (visibleLocal.value) unlockScroll()
})

defineExpose({ bodyRef })
</script>

<style scoped>
.app-drawer-overlay {
  position: fixed;
  inset: 0;
  z-index: 2000;
  display: flex;
  justify-content: flex-end;
  background: rgba(15, 23, 42, 0.52);
}
@media (max-width: 768px) {
  .app-drawer-overlay {
    align-items: flex-end;
    justify-content: stretch;
  }
}

.app-drawer-overlay.is-entering {
  animation: drawer-overlay-in 0.28s ease forwards;
}
.app-drawer-overlay.is-closing {
  animation: drawer-overlay-out 0.28s ease forwards;
}

.app-drawer-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
  max-width: 100%;
  background: var(--cpa-app-surface-strong, #fff);
  border-left: 1px solid var(--cpa-app-border, rgba(15, 23, 42, 0.08));
  box-shadow: -24px 0 48px rgba(15, 23, 42, 0.18);
  outline: none;
}
@media (max-width: 768px) {
  .app-drawer-panel {
    width: 100% !important;
    height: auto;
    max-height: calc(100dvh - 48px);
    border-radius: 12px 12px 0 0;
  }
}

.app-drawer-panel.panel-entering {
  animation: drawer-panel-in 0.28s ease forwards;
}
.app-drawer-panel.panel-closing {
  animation: drawer-panel-out 0.28s ease forwards;
}
@media (max-width: 768px) {
  .app-drawer-panel.panel-entering {
    animation-name: drawer-panel-in-mobile;
  }
  .app-drawer-panel.panel-closing {
    animation-name: drawer-panel-out-mobile;
  }
}

.app-drawer-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 16px 24px;
  border-bottom: 1px solid var(--cpa-app-border, rgba(15, 23, 42, 0.08));
  flex-shrink: 0;
}
.app-drawer-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 16px;
  font-weight: 600;
  color: var(--cpa-app-text-primary, #2c3e50);
  min-width: 0;
}
.app-drawer-close {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: 8px;
  border: 0;
  background: transparent;
  color: var(--cpa-app-text-regular, #5f6c7b);
  cursor: pointer;
  flex-shrink: 0;
}
.app-drawer-close:hover {
  background: var(--cpa-surface-subtle-hover, #f1f7fe);
  color: var(--cpa-app-text-primary, #2c3e50);
}
.app-drawer-body {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  overscroll-behavior: contain;
  padding: 16px 24px;
}
.app-drawer-footer {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
  padding: 16px 24px;
  border-top: 1px solid var(--cpa-app-border, rgba(15, 23, 42, 0.08));
  flex-shrink: 0;
  padding-bottom: calc(16px + env(safe-area-inset-bottom));
}

@keyframes drawer-overlay-in {
  from { opacity: 0; }
  to { opacity: 1; }
}
@keyframes drawer-overlay-out {
  from { opacity: 1; }
  to { opacity: 0; }
}
@keyframes drawer-panel-in {
  from { transform: translateX(100%); }
  to { transform: translateX(0); }
}
@keyframes drawer-panel-out {
  from { transform: translateX(0); }
  to { transform: translateX(100%); }
}
@keyframes drawer-panel-in-mobile {
  from { transform: translateY(100%); }
  to { transform: translateY(0); }
}
@keyframes drawer-panel-out-mobile {
  from { transform: translateY(0); }
  to { transform: translateY(100%); }
}

.drawer-fade-enter-active,
.drawer-fade-leave-active {
  /* overlay/panel keyframes handle the animation */
  transition: opacity 0.28s ease;
}
</style>
