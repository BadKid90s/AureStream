import "@/mobile/styles/mobile.css";
import { useState, useCallback } from "react";
import { Plus, QrCode, Loader2 } from "lucide-react";
import { GlassTabBar } from "@/mobile/components/GlassTabBar";
import { MobileNavBar } from "@/mobile/components/MobileNavBar";
import { MeshGradientBackground } from "@/mobile/components/MeshGradientBackground";
import { HomePage } from "@/mobile/pages/HomePage";
import { ProvidersPage } from "@/mobile/pages/ProvidersPage";
import { SettingsPage } from "@/mobile/pages/SettingsPage";
import { ThemePage } from "@/mobile/pages/ThemePage";
import { ProviderDetailPage } from "@/mobile/pages/ProviderDetailPage";
import { useProxyStore } from "@/stores/appStore";
import { toast } from "sonner";
import type { Provider } from "@/types";

type Page = "home" | "providers" | "settings" | "theme" | "provider_detail";

// Shared icon-button style used in the nav bar
const NAV_BTN =
  "w-9 h-9 flex items-center justify-center text-[var(--mg-text-primary)] active:scale-90 transition-transform";

function getSubNameFromUrl(urlStr: string): string {
  try {
    const url = new URL(urlStr);
    let name = url.hostname;
    if (name.startsWith("sub.")) name = name.substring(4);
    if (name.startsWith("clash.")) name = name.substring(6);
    const parts = name.split(".");
    if (parts.length > 1) {
      return parts[0].charAt(0).toUpperCase() + parts[0].slice(1);
    }
    return name.charAt(0).toUpperCase() + name.slice(1) || "新订阅";
  } catch {
    return "新订阅";
  }
}

export function MobileApp() {
  const [currentPage, setCurrentPage] = useState<Page>("home");
  const [themePageVisible, setThemePageVisible] = useState(false);
  const [selectedDetailProvider, setSelectedDetailProvider] = useState<Provider | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [addUrl, setAddUrl] = useState("");
  const [isDownloading, setIsDownloading] = useState(false);

  const { addProvider, deleteProvider, fetchAndSaveSubscription } = useProxyStore();

  const isSubPage = themePageVisible || currentPage === "provider_detail";

  const handleNavigate = useCallback((page: string) => {
    setThemePageVisible(false);
    setCurrentPage(page as Page);
  }, []);

  const handleOpenTheme = useCallback(() => {
    setThemePageVisible(true);
  }, []);

  const handleBackFromTheme = useCallback(() => {
    setThemePageVisible(false);
  }, []);

  const handleShowDetails = useCallback((provider: Provider) => {
    setSelectedDetailProvider(provider);
    setCurrentPage("provider_detail");
  }, []);

  const handleAddSubscription = useCallback(async () => {
    const trimmedUrl = addUrl.trim();
    if (!trimmedUrl) {
      toast.error("请输入订阅链接");
      return;
    }
    try {
      new URL(trimmedUrl);
    } catch {
      toast.error("请输入有效的订阅链接");
      return;
    }

    setIsDownloading(true);
    const id = crypto.randomUUID();
    const subName = getSubNameFromUrl(trimmedUrl);

    const newProvider: Provider = {
      id,
      name: subName,
      url: trimmedUrl,
      nodeCount: 0,
      lastUpdated: new Date().toISOString(),
    };

    try {
      await addProvider(newProvider);
      const result = await fetchAndSaveSubscription(id);
      if (result.success) {
        toast.success(`订阅「${subName}」添加并下载成功`);
        setIsAddModalOpen(false);
        setAddUrl("");
      } else {
        await deleteProvider(id);
        toast.error("订阅下载失败", {
          description: result.error || "请检查订阅链接是否有效",
        });
      }
    } catch (err) {
      try { await deleteProvider(id); } catch {}
      toast.error("添加订阅时发生错误");
    } finally {
      setIsDownloading(false);
    }
  }, [addUrl, addProvider, deleteProvider, fetchAndSaveSubscription]);

  // ── NavBar config per page ──────────────────────────────────────
  const navConfig = (): { title: string; left?: React.ReactNode; right?: React.ReactNode } => {
    if (themePageVisible) {
      return {
        title: "外观",
        left: (
          <button
            type="button"
            className={NAV_BTN}
            aria-label="返回"
            onClick={handleBackFromTheme}
          >
            <svg width="20" height="20" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10 3L5 8L10 13" />
            </svg>
          </button>
        ),
      };
    }

    if (currentPage === "provider_detail" && selectedDetailProvider) {
      return {
        title: "订阅详情",
        left: (
          <button
            type="button"
            className={NAV_BTN}
            aria-label="返回"
            onClick={() => {
              setSelectedDetailProvider(null);
              setCurrentPage("providers");
            }}
          >
            <svg width="20" height="20" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10 3L5 8L10 13" />
            </svg>
          </button>
        ),
      };
    }

    switch (currentPage) {
      case "home":
        return { title: "AureStream" };

      case "providers":
        return {
          title: "服务商",
          left: (
            <button
              type="button"
              className={NAV_BTN}
              aria-label="扫描二维码"
              onClick={() => {/* TODO: QR scan */}}
            >
              <QrCode className="w-[22px] h-[22px]" />
            </button>
          ),
          right: (
            <button
              type="button"
              className={NAV_BTN}
              aria-label="添加服务商"
              onClick={() => setIsAddModalOpen(true)}
            >
              <Plus className="w-[22px] h-[22px]" />
            </button>
          ),
        };

      case "settings":
        return { title: "设置" };

      default:
        return { title: "AureStream" };
    }
  };

  const { title, left, right } = navConfig();

  // ── Page content ────────────────────────────────────────────────
  const renderPage = () => {
    if (themePageVisible) {
      return <ThemePage />;
    }
    switch (currentPage) {
      case "home":
        return <HomePage />;
      case "providers":
        return <ProvidersPage onShowDetails={handleShowDetails} />;
      case "settings":
        return <SettingsPage onNavigateToTheme={handleOpenTheme} />;
      case "provider_detail":
        return selectedDetailProvider ? (
          <ProviderDetailPage
            providerId={selectedDetailProvider.id}
            onBack={() => {
              setSelectedDetailProvider(null);
              setCurrentPage("providers");
            }}
          />
        ) : (
          <ProvidersPage onShowDetails={handleShowDetails} />
        );
      default:
        return <HomePage />;
    }
  };

  return (
    <div className="mobile-app relative flex flex-col h-dvh w-full overflow-hidden">
      <MeshGradientBackground />

      <div className="flex-1 min-h-0 flex flex-col" style={{ animation: "page-enter 0.25s ease-out" }}>
        {/* Top nav bar — shown on all pages */}
        <MobileNavBar title={title} leftAction={left} rightAction={right} />

        {renderPage()}
      </div>

      {!isSubPage && (
        <GlassTabBar
          currentPage={currentPage}
          onNavigate={handleNavigate}
        />
      )}

      {/* Add Subscription Modal */}
      {isAddModalOpen && (
        <div className="mg-modal-overlay">
          <div className="mg-modal-card w-full max-w-[340px] p-6 flex flex-col gap-4 border shadow-2xl relative animate-[page-enter_0.2s_ease-out]">
            <h3 className="text-base font-extrabold text-[var(--mg-text-primary)]">添加订阅</h3>
            <p className="text-[11px] text-[var(--mg-text-secondary)] -mt-2">
              粘贴订阅链接后将自动下载配置并获取服务商名称。
            </p>
            <input
              type="text"
              value={addUrl}
              onChange={(e) => setAddUrl(e.target.value)}
              placeholder="请输入订阅链接 (https://...)"
              disabled={isDownloading}
              className="w-full h-11 px-4 rounded-xl bg-black/10 dark:bg-white/5 border border-black/5 dark:border-white/10 text-sm text-[var(--mg-text-primary)] outline-none focus:border-[var(--mg-primary)] transition-all font-mono"
            />
            <div className="flex gap-3 mt-2">
              <button
                type="button"
                onClick={() => {
                  setIsAddModalOpen(false);
                  setAddUrl("");
                }}
                disabled={isDownloading}
                className="flex-1 h-10 rounded-xl bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/5 text-[var(--mg-text-primary)] text-xs font-bold active:scale-95 transition-transform disabled:opacity-50"
              >
                取消
              </button>
              <button
                type="button"
                onClick={handleAddSubscription}
                disabled={isDownloading || !addUrl.trim()}
                className="flex-1 h-10 rounded-xl bg-[var(--mg-primary)] text-white text-xs font-bold active:scale-95 transition-transform flex items-center justify-center gap-1.5 disabled:opacity-50"
              >
                {isDownloading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                {isDownloading ? "正在下载..." : "下载"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
