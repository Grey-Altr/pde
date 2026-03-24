import * as fs from 'node:fs';
import * as path from 'node:path';

/**
 * Walk up from startDir looking for a .planning/ directory.
 *
 * @param startDir - Directory to begin the search from
 * @returns Absolute path to .planning/ directory, or null if not found within 10 levels
 */
export function discoverPlanningDir(startDir: string): string | null {
  let dir = path.resolve(startDir);
  for (let i = 0; i < 10; i++) {
    const candidate = path.join(dir, '.planning');
    if (fs.existsSync(candidate) && fs.statSync(candidate).isDirectory()) {
      return candidate;
    }
    const parent = path.dirname(dir);
    if (parent === dir) break; // reached filesystem root
    dir = parent;
  }
  return null;
}
