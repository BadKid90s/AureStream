import "@/pc/styles/pc.css";
import { useState } from "react";
import { Sidebar } from "@/pc/components/layout/Sidebar";
import { MainContent } from "@/pc/components/layout/MainContent";
import { Dashboard } from "@/pc/pages/Dashboard";
import { Providers } from "@/pc/pages/Providers";
import { Settings } from "@/pc/pages/Settings";
import { Toaster } from "@/components/ui/sonner";
import { LoadingScreen } from "@/components/LoadingScreen";

interface PcAppProps {
  isInitializing: boolean;
}

export function PcApp({ isInitializing }: PcAppProps) {
  const [currentPage, setCurrentPage] = useState("dashboard");
  const openProviders = () => setCurrentPage("providers");

  const renderPage = () => {
    switch (currentPage) {
      case "dashboard":
        return <Dashboard onOpenProviders={openProviders} />;
      case "providers":
        return <Providers />;
      case "settings":
        return <Settings />;
      default:
        return <Dashboard onOpenProviders={openProviders} />;
    }
  };

  return (
    <div className="flex h-screen bg-background overflow-hidden gap-3 ">
      <Sidebar currentPage={currentPage} onNavigate={setCurrentPage} />
      <MainContent>{renderPage()}</MainContent>
      <Toaster richColors />
      <LoadingScreen visible={isInitializing} />
    </div>
  );
}
