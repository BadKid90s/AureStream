import { useState, useEffect } from "react";
import { useAppStore, useProxyStore } from "@/stores/appStore";
import { loadPersistedState } from "@/lib/persistStore";
import { listen } from "@tauri-apps/api/event";
import { useIsMobile } from "@/hooks/useIsMobile";
import { MobileApp } from "@/mobile/MobileApp";
import { PcApp } from "@/pc/PcApp";

function applyTheme(theme: string) {
  const root = document.documentElement;
  if (theme === "system") {
    if (window.matchMedia("(prefers-color-scheme: dark)").matches) {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
  } else if (theme === "dark") {
    root.classList.add("dark");
  } else {
    root.classList.remove("dark");
  }
}

function App() {
  const [isInitializing, setIsInitializing] = useState(true);
  const { theme } = useAppStore();
  const isMobile = useIsMobile();

  useEffect(() => {
    const init = async () => {
      await Promise.allSettled([
        useAppStore.getState().loadSettings(),
        useProxyStore.getState().loadCache(),
      ]);

      applyTheme(useAppStore.getState().theme);

      await useProxyStore.getState().loadProviders();
      useProxyStore.getState().initAutoUpdateTimers();

      try {
        const savedState = await loadPersistedState();
        if (savedState.lastProviderId) {
          const providers = useProxyStore.getState().providers;
          const provider = providers.find(
            (p) => p.id === savedState.lastProviderId,
          );
          if (provider) {
            useProxyStore.getState().setCurrentProvider(provider);
            if (savedState.lastNodeId) {
              const nodes = useProxyStore.getState().nodes;
              const node = nodes.find((n) => n.id === savedState.lastNodeId);
              if (node) {
                useProxyStore.getState().setCurrentNode(node);
              }
            }
          }
        }
      } catch (e) {
        console.warn("恢复上次状态失败:", e);
      }

      try {
        const { autoConnect } = useAppStore.getState();
        if (autoConnect && useProxyStore.getState().currentProvider) {
          await useProxyStore.getState().connect();
        }
      } catch (e) {
        console.warn("自动连接失败:", e);
      }

      setIsInitializing(false);
    };

    init();

    const unlisten = listen<string>("tray-select-node", async (event) => {
      const nodeId = event.payload;
      const { nodes, isConnected } = useProxyStore.getState();
      if (!isConnected) return;
      const node = nodes.find((n) => n.id === nodeId);
      if (node) {
        await useProxyStore.getState().applyNodeSelection(node);
      }
    });

    return () => {
      unlisten.then((fn) => fn());
    };
  }, []);

  useEffect(() => {
    applyTheme(theme);
    if (theme === "system") {
      const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
      const handler = () => applyTheme("system");
      mediaQuery.addEventListener("change", handler);
      return () => mediaQuery.removeEventListener("change", handler);
    }
  }, [theme]);

  if (isMobile) {
    return <MobileApp />;
  }

  return <PcApp isInitializing={isInitializing} />;
}

export default App;
