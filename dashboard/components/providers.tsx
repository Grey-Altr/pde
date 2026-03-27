"use client";

import { NuqsAdapter } from 'nuqs/adapters/next/app';
import { HotkeysProvider } from 'react-hotkeys-hook';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <NuqsAdapter>
      <HotkeysProvider>
        {children}
      </HotkeysProvider>
    </NuqsAdapter>
  );
}
