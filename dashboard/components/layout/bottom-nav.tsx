"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Activity,
  Settings,
  List,
  TrendingUp,
  BarChart3,
  AlertTriangle,
  Play,
  LayoutDashboard,
} from "lucide-react";

const settingsTabs = [
  { href: "/", label: "Sessions", icon: Activity },
  { href: "/settings", label: "Settings", icon: Settings },
] as const;

const dashboardTabs = [
  { index: 0, label: "Health", icon: Activity },
  { index: 1, label: "Events", icon: List },
  { index: 2, label: "Progress", icon: TrendingUp },
  { index: 3, label: "Status", icon: BarChart3 },
  { index: 4, label: "Failures", icon: AlertTriangle },
  { index: 5, label: "Actions", icon: Play },
  { index: 6, label: "Summary", icon: LayoutDashboard },
] as const;

interface BottomNavProps {
  activePane?: number;
  onPaneSelect?: (index: number) => void;
}

export function BottomNav({ activePane = 0, onPaneSelect }: BottomNavProps) {
  const pathname = usePathname();
  const isDashboard = pathname === "/";

  if (isDashboard) {
    return (
      <nav
        className="fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur border-t border-border lg:hidden z-50"
        style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
        aria-label="Dashboard pane navigation"
      >
        <div className="overflow-x-auto no-scrollbar">
          <div className="flex items-center min-w-max px-2">
            {dashboardTabs.map((tab) => {
              const isActive = activePane === tab.index;
              return (
                <button
                  key={tab.index}
                  onClick={() => onPaneSelect?.(tab.index)}
                  className={`flex flex-col items-center justify-center gap-1 py-3 px-4 min-h-[44px] min-w-[44px] transition-colors ${
                    isActive ? "text-primary" : "text-muted-foreground"
                  }`}
                  aria-label={tab.label}
                  aria-pressed={isActive}
                >
                  <tab.icon className="h-5 w-5" />
                  <span className="text-xs font-medium">{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </nav>
    );
  }

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur border-t border-border flex items-center justify-around md:hidden z-50"
      style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
      aria-label="Main navigation"
    >
      {settingsTabs.map((tab) => {
        const isActive = tab.href === "/" ? pathname === "/" : pathname.startsWith(tab.href);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`flex flex-col items-center justify-center gap-1 py-3 px-6 min-h-[44px] min-w-[44px] transition-colors ${
              isActive ? "text-primary" : "text-muted-foreground"
            }`}
          >
            <tab.icon className="h-5 w-5" />
            <span className="text-xs font-medium">{tab.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
