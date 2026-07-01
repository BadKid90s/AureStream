import { beforeEach, describe, expect, it, vi } from "vitest"

type EffectEntry = {
  effect: () => void | (() => void)
  deps?: unknown[]
  cleanup?: void | (() => void)
}

const effects = vi.hoisted(() => [] as EffectEntry[])
const states = vi.hoisted(() => [] as unknown[])
const testNodeDelayMock = vi.hoisted(() => vi.fn())

vi.mock("react", () => ({
  useEffect: (effect: EffectEntry["effect"], deps?: unknown[]) => {
    effects.push({ effect, deps })
  },
  useState: (initialValue: unknown) => {
    const index = states.length
    states.push(initialValue)
    return [
      states[index],
      (next: unknown) => {
        states[index] = typeof next === "function"
          ? (next as (value: unknown) => unknown)(states[index])
          : next
      },
    ]
  },
}))

vi.mock("@/utils/singbox-api/proxies", () => ({
  testNodeDelay: testNodeDelayMock,
}))

function runEffects() {
  for (const entry of effects) {
    entry.cleanup = entry.effect()
  }
}

describe("useConnectionHealth", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    effects.length = 0
    states.length = 0
    testNodeDelayMock.mockResolvedValue(88)
  })

  it("does not probe when the engine is not running", async () => {
    const { useConnectionHealth } = await import("./useConnectionHealth")

    const health = useConnectionHealth(false)
    runEffects()
    await Promise.resolve()

    expect(health.status).toBe("idle")
    expect(testNodeDelayMock).not.toHaveBeenCalled()
  })

  it("starts checking and probes ExitGateway while running", async () => {
    vi.useFakeTimers()
    try {
      const { useConnectionHealth } = await import("./useConnectionHealth")

      const health = useConnectionHealth(true)
      runEffects()

      expect(health.status).toBe("idle")
      expect(states[0]).toMatchObject({ status: "checking" })
      await vi.runOnlyPendingTimersAsync()

      expect(testNodeDelayMock).toHaveBeenCalledWith("ExitGateway")
      expect(states[0]).toMatchObject({ status: "healthy", lastDelayMs: 88 })
    } finally {
      vi.useRealTimers()
    }
  })
})
