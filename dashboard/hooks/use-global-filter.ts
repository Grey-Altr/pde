"use client";

import { useQueryState, parseAsString } from 'nuqs';

export function useGlobalFilter(): {
  sessionFilter: string;
  setSessionFilter: (v: string | null) => void;
} {
  const [sessionFilter, setSessionFilter] = useQueryState(
    'session',
    parseAsString.withDefault('all')
  );
  return { sessionFilter, setSessionFilter };
}
