"use client";

import { useHotkeys } from 'react-hotkeys-hook';

export interface UseDashboardHotkeysOptions {
  onPaneSelect: (n: number) => void;
  onSessionNext: () => void;
  onSessionPrev: () => void;
  onExpand: () => void;
  onCollapse: () => void;
  enabled: boolean;
}

export function useDashboardHotkeys(opts: UseDashboardHotkeysOptions): void {
  const { onPaneSelect, onSessionNext, onSessionPrev, onExpand, onCollapse, enabled } = opts;

  // 1-7: switch pane focus
  useHotkeys('1', () => onPaneSelect(0), { enabled });
  useHotkeys('2', () => onPaneSelect(1), { enabled });
  useHotkeys('3', () => onPaneSelect(2), { enabled });
  useHotkeys('4', () => onPaneSelect(3), { enabled });
  useHotkeys('5', () => onPaneSelect(4), { enabled });
  useHotkeys('6', () => onPaneSelect(5), { enabled });
  useHotkeys('7', () => onPaneSelect(6), { enabled });

  // s/a: cycle sessions next/prev
  useHotkeys('s', onSessionNext, { enabled });
  useHotkeys('a', onSessionPrev, { enabled });

  // f: expand current pane
  useHotkeys('f', onExpand, { enabled });

  // Esc: collapse expanded pane
  useHotkeys('escape', onCollapse, { enabled, preventDefault: true });
}
