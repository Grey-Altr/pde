"use client";

import { createContext, useContext } from 'react';

interface ActivePaneContextValue {
  activePane: number;
  setActivePane: (index: number) => void;
}

export const ActivePaneContext = createContext<ActivePaneContextValue>({
  activePane: 0,
  setActivePane: () => {},
});

export function useActivePane(): ActivePaneContextValue {
  return useContext(ActivePaneContext);
}
