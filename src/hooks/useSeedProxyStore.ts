import { useEffect } from 'react'
import { SEED_NODES, SEED_PROVIDERS } from '@/data/seed'
import { useProxyStore } from '@/stores/appStore'

/**
 * 开发环境：在 persist 从本地恢复完成后，若「订阅与节点均为空」，则一次性写入种子数据。
 *
 * - 已有持久化数据的用户不会被覆盖（要求 providers、nodes 同时为空）。
 * - 使用 `import.meta.env.DEV` 限制为开发构建，生产包不注入演示数据。
 *   若未来需要在生产「首次安装」也展示演示数据，可改为仅判断空 store（仍不要覆盖非空）。
 */
export function useSeedProxyStore() {
  useEffect(() => {
    if (!import.meta.env.DEV) return

    const applySeedIfEmpty = () => {
      const { providers, nodes } = useProxyStore.getState()
      if (providers.length > 0 || nodes.length > 0) return
      useProxyStore.setState({
        providers: [...SEED_PROVIDERS],
        nodes: [...SEED_NODES],
      })
    }

    if (useProxyStore.persist.hasHydrated()) {
      applySeedIfEmpty()
      return
    }

    return useProxyStore.persist.onFinishHydration(() => {
      applySeedIfEmpty()
    })
  }, [])
}
