import { useState, useEffect } from "react";
import { useAppStore } from "@/stores/appStore";

interface LatencyConfigPageProps {
  onSave?: (saveFn: () => Promise<boolean>) => void;
}

export function LatencyConfigPage({ onSave }: LatencyConfigPageProps) {
  const latencyTestUrl = useAppStore((s) => s.latencyTestUrl);
  const latencyTestTimeout = useAppStore((s) => s.latencyTestTimeout);
  const setLatencyTestUrl = useAppStore((s) => s.setLatencyTestUrl);
  const setLatencyTestTimeout = useAppStore((s) => s.setLatencyTestTimeout);

  const [urlInput, setUrlInput] = useState(latencyTestUrl);
  const [timeoutInput, setTimeoutInput] = useState(String(latencyTestTimeout));

  useEffect(() => {
    if (!onSave) return;
    onSave(async () => {
      const trimmed = urlInput.trim();
      if (!trimmed) return false;
      try { new URL(trimmed); } catch { return false; }
      const ms = parseInt(timeoutInput, 10);
      if (isNaN(ms) || ms < 1000 || ms > 30000) return false;
      setLatencyTestUrl(trimmed);
      setLatencyTestTimeout(ms);
      return true;
    });
  }, [onSave, urlInput, timeoutInput, setLatencyTestUrl, setLatencyTestTimeout]);

  return (
    <div className="flex flex-col flex-1 min-h-0 overflow-y-auto mg-scroll-none px-4 pt-3 pb-8 gap-4">
      {/* Test URL */}
      <div className="mg-glass-card p-4 rounded-[24px] flex flex-col gap-3">
        <span className="text-[11px] font-bold text-[var(--mg-text-secondary)] uppercase tracking-wider">测速地址</span>
        <input
          type="text"
          value={urlInput}
          onChange={(e) => setUrlInput(e.target.value)}
          className="w-full bg-transparent pr-2.5 py-1.5 rounded-xl text-xs font-mono font-semibold text-[var(--mg-text-primary)] focus:outline-none"
          placeholder="https://example.com/generate_204"
        />
      </div>

      {/* Timeout */}
      <div className="mg-glass-card p-4 rounded-[24px] flex flex-col gap-3">
        <span className="text-[11px] font-bold text-[var(--mg-text-secondary)] uppercase tracking-wider">超时时间 (ms)</span>
        <div className="flex items-center gap-2">
          <input
            type="number"
            value={timeoutInput}
            onChange={(e) => setTimeoutInput(e.target.value)}
            min={1000}
            max={30000}
            step={500}
            className="flex-1 bg-transparent pr-2.5 py-1.5 rounded-xl text-xs font-mono font-semibold text-[var(--mg-text-primary)] focus:outline-none"
            placeholder="5000"
          />
          <span className="text-xs text-[var(--mg-text-secondary)] font-semibold">ms</span>
        </div>
      </div>

      <p className="text-[11px] text-[var(--mg-text-secondary)] px-1 leading-relaxed">
        修改后点击保存，下次延迟测速时将使用新的配置。
      </p>
    </div>
  );
}
