export type ConnectionHealthStatus = "idle" | "checking" | "healthy" | "degraded"

export type ConnectionHealth = {
  status: ConnectionHealthStatus
  failureCount: number
  lastDelayMs: number | null
}

export type ConnectionHealthBadge = {
  label: string
  dotClassName: string
  className: string
}

const DEGRADED_FAILURE_THRESHOLD = 2

export const INITIAL_CONNECTION_HEALTH: ConnectionHealth = {
  status: "idle",
  failureCount: 0,
  lastDelayMs: null,
}

export function nextConnectionHealth({
  isRunning,
  previous,
  delayMs,
}: {
  isRunning: boolean
  previous: ConnectionHealth
  delayMs: number
}): ConnectionHealth {
  if (!isRunning) return INITIAL_CONNECTION_HEALTH

  if (delayMs > 0) {
    return {
      status: "healthy",
      failureCount: 0,
      lastDelayMs: delayMs,
    }
  }

  const failureCount = previous.failureCount + 1
  return {
    status: failureCount >= DEGRADED_FAILURE_THRESHOLD ? "degraded" : "checking",
    failureCount,
    lastDelayMs: null,
  }
}

export function connectionHealthBadge(
  status: ConnectionHealthStatus,
  isZh: boolean,
): ConnectionHealthBadge {
  switch (status) {
    case "healthy":
      return {
        label: isZh ? "网络健康" : "HEALTHY",
        dotClassName: "bg-success animate-pulse",
        className: "bg-success/10 text-success border border-success/20",
      }
    case "degraded":
      return {
        label: isZh ? "网络异常" : "UNSTABLE",
        dotClassName: "bg-warning animate-pulse",
        className: "bg-warning/10 text-warning border border-warning/20",
      }
    case "checking":
      return {
        label: isZh ? "检测中" : "CHECKING",
        dotClassName: "bg-secondary animate-pulse",
        className: "bg-secondary/10 text-secondary border border-secondary/20",
      }
    case "idle":
      return {
        label: isZh ? "已暂停" : "PAUSED",
        dotClassName: "bg-text-muted",
        className: "bg-text-muted/10 text-text-muted border border-border-glass/40",
      }
  }
}
