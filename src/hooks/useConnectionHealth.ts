import { useEffect, useState } from "react"

import {
  INITIAL_CONNECTION_HEALTH,
  nextConnectionHealth,
  type ConnectionHealth,
} from "@/lib/connection-health"
import { testNodeDelay } from "@/utils/singbox-api/proxies"

const HEALTH_CHECK_INTERVAL_MS = 10000

export function useConnectionHealth(isRunning: boolean): ConnectionHealth {
  const [health, setHealth] = useState<ConnectionHealth>(INITIAL_CONNECTION_HEALTH)

  useEffect(() => {
    let cancelled = false
    let timer: ReturnType<typeof setTimeout> | null = null

    if (!isRunning) {
      setHealth(INITIAL_CONNECTION_HEALTH)
      return
    }

    setHealth({ status: "checking", failureCount: 0, lastDelayMs: null })

    const check = async () => {
      const delayMs = await testNodeDelay("ExitGateway")
      if (cancelled) return

      setHealth((previous) => nextConnectionHealth({
        isRunning,
        previous,
        delayMs,
      }))

      timer = setTimeout(check, HEALTH_CHECK_INTERVAL_MS)
    }

    timer = setTimeout(check, 0)

    return () => {
      cancelled = true
      if (timer) clearTimeout(timer)
    }
  }, [isRunning])

  return health
}
