import { onBeforeUnmount, watch } from 'vue'

export type HeaderRefreshHandler = () => void | Promise<void>

let activeHandler: HeaderRefreshHandler | null = null
let lastTriggerAt = 0

const DEFAULT_THROTTLE_MS = 1200

/**
 * Throttled header refresh — mirrors CPA's useHeaderRefresh semantics
 * (single active handler, triggerHeaderRefresh, enabled flag) with
 * an added throttle to avoid hammering /usage/dashboard/* from the
 * header refresh button.
 */
export async function triggerHeaderRefresh(opts: { force?: boolean; throttleMs?: number } = {}): Promise<boolean> {
  if (!activeHandler) return false
  const throttleMs = opts.throttleMs ?? DEFAULT_THROTTLE_MS
  const now = Date.now()
  if (!opts.force && now - lastTriggerAt < throttleMs) return false
  lastTriggerAt = now
  await activeHandler()
  return true
}

export function resetHeaderRefreshThrottle() {
  lastTriggerAt = 0
}

export function getActiveHeaderRefreshHandler(): HeaderRefreshHandler | null {
  return activeHandler
}

/**
 * Register a page-level handler as the current header refresh target.
 * Only one handler is active at a time (last mounted wins), matching CPA.
 * When `enabled` is false or handler is null, the registration is cleared
 * if it was the active one.
 */
export function useHeaderRefresh(
  handler: HeaderRefreshHandler | null | undefined,
  enabled = true
) {
  // Use watch so reactive handler refs also work if caller passes a getter
  const stopWatch = watch(
    () => ({ handler, enabled }),
    (val, oldVal) => {
      const prev = (oldVal as typeof val | undefined)?.handler ?? null
      const nextHandler = val.handler ?? null
      const nextEnabled = val.enabled

      if (!nextEnabled || !nextHandler) {
        if (prev && activeHandler === prev) activeHandler = null
        // also clear if current active equals nextHandler being disabled
        if (nextHandler && activeHandler === nextHandler) activeHandler = null
        return
      }
      activeHandler = nextHandler
    },
    { immediate: true }
  )

  onBeforeUnmount(() => {
    if (handler && activeHandler === handler) activeHandler = null
    stopWatch()
  })

  return {
    trigger: triggerHeaderRefresh,
  }
}
