"use client";

import { useEffect } from 'react';
import { NuqsAdapter } from 'nuqs/adapters/next/app';
import { HotkeysProvider } from 'react-hotkeys-hook';
import { initializeWebModelContext } from '@mcp-b/global';
import { WebMcpToolsRegistrar } from './webmcp-tools-registrar';

// Internal component — initializes navigator.modelContext polyfill on mount.
// Must be inside useEffect to avoid SSR crash (navigator is undefined on the server).
// initializeWebModelContext() is idempotent: safe to call multiple times.
function WebMcpInitializer() {
  useEffect(() => {
    initializeWebModelContext();
  }, []);
  return null;
}

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <NuqsAdapter>
      <HotkeysProvider>
        <WebMcpInitializer />
        <WebMcpToolsRegistrar />
        {children}
      </HotkeysProvider>
    </NuqsAdapter>
  );
}
