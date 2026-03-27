"use client";
import { useQueryState, parseAsString } from 'nuqs';

export function useGlobalFilter() {
  const [sessionFilter, setSessionFilter] = useQueryState(
    'session',
    parseAsString.withDefault('all')
  );
  return { sessionFilter, setSessionFilter };
}
