/**
 * Session color palette for visual differentiation across dashboard components.
 * Colors are chosen to be distinguishable in both light and dark modes.
 */
export const SESSION_PALETTE: readonly string[] = [
  '#3b82f6', // blue-500
  '#8b5cf6', // violet-500
  '#ec4899', // pink-500
  '#f97316', // orange-500
  '#14b8a6', // teal-500
  '#a3e635', // lime-400
  '#eab308', // yellow-500
  '#ef4444', // red-500
  '#06b6d4', // cyan-500
  '#84cc16', // lime-500
] as const;

/**
 * Returns a stable color from the palette for a given index.
 * Wraps around if index exceeds palette length.
 */
export function sessionColor(index: number): string {
  return SESSION_PALETTE[index % SESSION_PALETTE.length];
}
