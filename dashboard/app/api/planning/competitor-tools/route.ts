import fs from 'node:fs';
import path from 'node:path';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: Request): Promise<NextResponse> {
  const url = new URL(request.url);
  const name = url.searchParams.get('name');

  const registryPath = path.join(process.cwd(), '.webmcp', 'competitor-tools-registry.json');

  if (!fs.existsSync(registryPath)) {
    return NextResponse.json({ error: 'Registry not found' }, { status: 404 });
  }

  let registry: unknown[];
  try {
    registry = JSON.parse(fs.readFileSync(registryPath, 'utf-8'));
  } catch {
    return NextResponse.json({ error: 'Corrupt registry' }, { status: 500 });
  }

  const approved = (registry as Array<Record<string, unknown>>).filter(
    (t) => t.status === 'approved'
  );

  if (name) {
    const tool = approved.find((t) => t.competitor_name === name);
    if (!tool) {
      return NextResponse.json({ error: 'Not found or not approved' }, { status: 404 });
    }
    return NextResponse.json(tool);
  }

  return NextResponse.json({ tools: approved });
}
