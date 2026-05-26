import { Home, Globe, BarChart3, User } from 'lucide-react';
import { cn } from '@/lib/utils';

export type MobilePage = 'home' | 'nodes' | 'data' | 'profile';

interface Tab {
  id: MobilePage;
  label: string;
  Icon: typeof Home;
}

const tabs: Tab[] = [
  { id: 'home', label: '首页', Icon: Home },
  { id: 'nodes', label: '节点', Icon: Globe },
  { id: 'data', label: '数据', Icon: BarChart3 },
  { id: 'profile', label: '我的', Icon: User },
];

export function BottomTabBar({
  currentPage,
  onNavigate,
}: {
  currentPage: MobilePage;
  onNavigate: (page: MobilePage) => void;
}) {
  return (
    <nav className="mob-safe-bottom px-4 pb-1">
      <div
        className="mob-glass-strong flex items-center justify-around px-2 py-1.5 rounded-[28px] max-w-md mx-auto"
        style={{ animation: 'mob-fade-up 0.3s ease-out' }}
      >
        {tabs.map(({ id, label, Icon }) => {
          const active = currentPage === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => onNavigate(id)}
              className={cn(
                'flex flex-col items-center gap-0.5 py-1.5 px-5 rounded-[20px] transition-all duration-300',
                active && 'bg-white/10',
              )}
            >
              <Icon
                className={cn(
                  'w-5 h-5 transition-all duration-300',
                  active
                    ? 'text-[#4DA3FF] drop-shadow-[0_0_8px_rgba(77,163,255,0.4)]'
                    : 'text-white/35',
                )}
                strokeWidth={active ? 2.5 : 2}
              />
              <span
                className={cn(
                  'text-[9px] font-semibold tracking-wide transition-all duration-300',
                  active ? 'text-[#4DA3FF]' : 'text-white/35',
                )}
              >
                {label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
