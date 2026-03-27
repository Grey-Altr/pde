"use client";

import { useState } from 'react';
import { BottomNav } from '@/components/layout/bottom-nav';

/**
 * DashboardShell — client component that owns activePane state and threads it
 * down to both children (page.tsx) and BottomNav, enabling phone tab switching.
 *
 * page.tsx receives activePane/setActivePane via context (use-active-pane.ts),
 * BottomNav receives it as props here.
 */
import { ActivePaneContext } from '@/hooks/use-active-pane';

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const [activePane, setActivePane] = useState(0);

  return (
    <ActivePaneContext.Provider value={{ activePane, setActivePane }}>
      {children}
      <BottomNav activePane={activePane} onPaneSelect={setActivePane} />
    </ActivePaneContext.Provider>
  );
}
