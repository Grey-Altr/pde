/** 6-entry session palette — deterministic, tree-shakeable */
export const SESSION_PALETTE = [
  '#6366f1', // indigo
  '#22c55e', // green
  '#f59e0b', // amber
  '#3b82f6', // blue
  '#ec4899', // pink
  '#14b8a6', // teal
] as const;

/**
 * Returns a stable color for a session given its list position.
 * Uses modulo wrapping so index 6 returns the same as index 0.
 */
export function sessionColor(index: number): string {
  return SESSION_PALETTE[Math.abs(index) % SESSION_PALETTE.length];
}
