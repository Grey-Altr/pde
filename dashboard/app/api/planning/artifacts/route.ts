import fs from 'node:fs';
import path from 'node:path';
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const filter = request.nextUrl.searchParams.get('filter');
  const handoffDir = path.join(process.cwd(), '.planning', 'design', 'handoff');

  if (!fs.existsSync(handoffDir)) {
    return NextResponse.json({ artifacts: [], total: 0 });
  }

  const filenames = fs.readdirSync(handoffDir);
  let artifacts = filenames.map((name) => ({
    name,
    path: `.planning/design/handoff/${name}`,
  }));

  if (filter) {
    const filterLower = filter.toLowerCase();
    artifacts = artifacts.filter((a) => a.name.toLowerCase().includes(filterLower));
  }

  return NextResponse.json({ artifacts, total: artifacts.length });
}
