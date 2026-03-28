import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const ROUTE_FILE = path.resolve(
  __dirname,
  '../../app/api/planning/gates/route.ts'
);

describe('dashboard/app/api/planning/gates/route.ts — source inspection', () => {
  let src: string;

  it('file exists', () => {
    expect(fs.existsSync(ROUTE_FILE)).toBe(true);
    src = fs.readFileSync(ROUTE_FILE, 'utf-8');
  });

  it("exports GET handler", () => {
    src = fs.readFileSync(ROUTE_FILE, 'utf-8');
    expect(src).toContain('export async function GET');
  });

  it("exports POST handler", () => {
    src = fs.readFileSync(ROUTE_FILE, 'utf-8');
    expect(src).toContain('export async function POST');
  });

  it("imports auth from @clerk/nextjs/server", () => {
    src = fs.readFileSync(ROUTE_FILE, 'utf-8');
    expect(src).toContain("from '@clerk/nextjs/server'");
    expect(src).toContain('auth');
  });

  it("calls auth()", () => {
    src = fs.readFileSync(ROUTE_FILE, 'utf-8');
    expect(src).toContain('auth()');
  });

  it("references .planning/gates path", () => {
    src = fs.readFileSync(ROUTE_FILE, 'utf-8');
    expect(src).toContain("'.planning'");
    expect(src).toContain("'gates'");
  });

  it("checks isAuthenticated and returns 401", () => {
    src = fs.readFileSync(ROUTE_FILE, 'utf-8');
    expect(src).toContain('isAuthenticated');
    expect(src).toContain('401');
  });

  it("exports dynamic = 'force-dynamic'", () => {
    src = fs.readFileSync(ROUTE_FILE, 'utf-8');
    expect(src).toContain("export const dynamic = 'force-dynamic'");
  });
});
