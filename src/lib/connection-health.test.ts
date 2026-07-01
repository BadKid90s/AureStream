import { describe, expect, it } from "vitest"

import {
  connectionHealthBadge,
  nextConnectionHealth,
  type ConnectionHealth,
} from "./connection-health"

describe("connection health state", () => {
  it("stays idle when the engine is not running", () => {
    const result = nextConnectionHealth({
      isRunning: false,
      previous: { status: "healthy", failureCount: 1, lastDelayMs: 120 },
      delayMs: 80,
    })

    expect(result).toEqual({
      status: "idle",
      failureCount: 0,
      lastDelayMs: null,
    })
  })

  it("reports healthy on successful delay and resets previous failures", () => {
    const result = nextConnectionHealth({
      isRunning: true,
      previous: { status: "degraded", failureCount: 2, lastDelayMs: null },
      delayMs: 96,
    })

    expect(result).toEqual({
      status: "healthy",
      failureCount: 0,
      lastDelayMs: 96,
    })
  })

  it("requires two consecutive delay failures before degraded", () => {
    const firstFailure = nextConnectionHealth({
      isRunning: true,
      previous: { status: "checking", failureCount: 0, lastDelayMs: null },
      delayMs: -1,
    })

    expect(firstFailure).toEqual({
      status: "checking",
      failureCount: 1,
      lastDelayMs: null,
    })

    const secondFailure = nextConnectionHealth({
      isRunning: true,
      previous: firstFailure,
      delayMs: -1,
    })

    expect(secondFailure).toEqual({
      status: "degraded",
      failureCount: 2,
      lastDelayMs: null,
    })
  })
})

describe("connection health badge", () => {
  it.each<[ConnectionHealth["status"], string, string]>([
    ["idle", "PAUSED", "已暂停"],
    ["checking", "CHECKING", "检测中"],
    ["healthy", "HEALTHY", "网络健康"],
    ["degraded", "UNSTABLE", "网络异常"],
  ])("maps %s status to localized badge labels", (status, en, zh) => {
    expect(connectionHealthBadge(status, false).label).toBe(en)
    expect(connectionHealthBadge(status, true).label).toBe(zh)
  })
})
