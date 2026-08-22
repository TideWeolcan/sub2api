import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest'
import {
  getActiveHeaderRefreshHandler,
  resetHeaderRefreshThrottle,
  triggerHeaderRefresh,
  useHeaderRefresh
} from '../useHeaderRefresh'
import { createApp, defineComponent, h } from 'vue'

// useHeaderRefresh registers/unregisters its handler through component
// lifecycle hooks (watch immediate + onBeforeUnmount), so each test mounts a
// throwaway component; afterEach unmounts to exercise the real cleanup path.
const apps: Array<ReturnType<typeof createApp>> = []

function withSetup<T>(fn: () => T): T {
  let result!: T
  const app = createApp(
    defineComponent({
      setup() {
        result = fn()
        return () => h('div')
      }
    })
  )
  const host = document.createElement('div')
  document.body.appendChild(host)
  app.mount(host)
  apps.push(app)
  return result
}

describe('useHeaderRefresh', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    resetHeaderRefreshThrottle()
  })

  afterEach(() => {
    while (apps.length > 0) {
      apps.pop()?.unmount()
    }
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it('注册的 handler 成为当前活跃 handler', () => {
    const handler = vi.fn()
    withSetup(() => useHeaderRefresh(handler))
    expect(getActiveHeaderRefreshHandler()).toBe(handler)
  })

  it('triggerHeaderRefresh 调用活跃 handler 并返回 true', async () => {
    const handler = vi.fn().mockResolvedValue(undefined)
    withSetup(() => useHeaderRefresh(handler))

    const triggered = await triggerHeaderRefresh({ force: true })
    expect(triggered).toBe(true)
    expect(handler).toHaveBeenCalledTimes(1)
  })

  it('无活跃 handler 时返回 false 且不抛错', async () => {
    const triggered = await triggerHeaderRefresh({ force: true })
    expect(triggered).toBe(false)
  })

  it('默认节流窗口内重复触发被忽略', async () => {
    const handler = vi.fn().mockResolvedValue(undefined)
    withSetup(() => useHeaderRefresh(handler))

    expect(await triggerHeaderRefresh()).toBe(true)
    expect(await triggerHeaderRefresh()).toBe(false)
    expect(handler).toHaveBeenCalledTimes(1)

    vi.advanceTimersByTime(1200)
    expect(await triggerHeaderRefresh()).toBe(true)
    expect(handler).toHaveBeenCalledTimes(2)
  })

  it('force: true 绕过节流', async () => {
    const handler = vi.fn().mockResolvedValue(undefined)
    withSetup(() => useHeaderRefresh(handler))

    await triggerHeaderRefresh()
    await triggerHeaderRefresh({ force: true })
    await triggerHeaderRefresh({ force: true })
    expect(handler).toHaveBeenCalledTimes(3)
  })

  it('自定义 throttleMs 控制节流窗口', async () => {
    const handler = vi.fn().mockResolvedValue(undefined)
    withSetup(() => useHeaderRefresh(handler))

    expect(await triggerHeaderRefresh({ throttleMs: 500 })).toBe(true)
    vi.advanceTimersByTime(400)
    expect(await triggerHeaderRefresh({ throttleMs: 500 })).toBe(false)
    vi.advanceTimersByTime(100)
    expect(await triggerHeaderRefresh({ throttleMs: 500 })).toBe(true)
    expect(handler).toHaveBeenCalledTimes(2)
  })

  it('enabled=false 不注册 handler', () => {
    const handler = vi.fn()
    withSetup(() => useHeaderRefresh(handler, false))
    expect(getActiveHeaderRefreshHandler()).toBeNull()
  })

  it('handler 抛错时 trigger 向调用方传播异常', async () => {
    const handler = vi.fn().mockRejectedValue(new Error('boom'))
    withSetup(() => useHeaderRefresh(handler))

    await expect(triggerHeaderRefresh({ force: true })).rejects.toThrow('boom')
  })
})
