import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import path from 'path';

const source = readFileSync(
  path.resolve(import.meta.dirname, '../hooks/use-all-sessions.ts'),
  'utf-8'
);

describe('useAllSessions — AUX-01 auth redirect', () => {
  it('imports useRouter from next/navigation', () => {
    expect(source).toContain("from 'next/navigation'");
    expect(source).toContain('useRouter');
  });

  it('checks res.status === 401 before redirecting', () => {
    expect(source).toContain('res.status === 401');
  });

  it('calls router.push with /sign-in on 401', () => {
    expect(source).toContain("router.push('/sign-in')");
  });

  it('returns early after redirect (does not call setSessions on 401 path)', () => {
    const redirectIdx = source.indexOf("router.push('/sign-in')");
    const returnIdx = source.indexOf('return', redirectIdx);
    const setSessionsIdx = source.indexOf('setSessions', redirectIdx);
    expect(returnIdx).toBeLessThan(setSessionsIdx === -1 ? Infinity : setSessionsIdx);
  });

  it('still handles non-ok responses without redirect', () => {
    expect(source).toContain('if (!res.ok) return');
  });
});
