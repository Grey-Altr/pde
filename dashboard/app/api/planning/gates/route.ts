import fs from 'node:fs';
import path from 'node:path';
import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  const gatesDir = path.join(process.cwd(), '.planning', 'gates');

  if (!fs.existsSync(gatesDir)) {
    return NextResponse.json({ gates: [] });
  }

  let files: string[];
  try {
    files = fs.readdirSync(gatesDir).filter((f) => f.endsWith('.json'));
  } catch {
    return NextResponse.json({ gates: [] });
  }

  const gates = files
    .map((file) => {
      try {
        const content = fs.readFileSync(path.join(gatesDir, file), 'utf-8');
        return JSON.parse(content);
      } catch {
        return null;
      }
    })
    .filter((g) => g !== null && g.status === 'pending');

  return NextResponse.json({ gates });
}

export async function POST(request: Request): Promise<NextResponse> {
  const { isAuthenticated } = await auth();
  if (!isAuthenticated) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { gate_id, action, reason } = body as {
    gate_id?: string;
    action?: string;
    reason?: string;
  };

  if (!gate_id || typeof gate_id !== 'string' || gate_id.trim() === '') {
    return NextResponse.json({ error: 'gate_id is required' }, { status: 422 });
  }

  if (action !== 'approve' && action !== 'reject') {
    return NextResponse.json(
      { error: 'action must be "approve" or "reject"' },
      { status: 422 }
    );
  }

  const gatesDir = path.join(process.cwd(), '.planning', 'gates');
  const gateFile = path.join(gatesDir, `${gate_id}.json`);

  if (!fs.existsSync(gateFile)) {
    return NextResponse.json({ error: `Gate not found: ${gate_id}` }, { status: 404 });
  }

  let gate: Record<string, unknown>;
  try {
    gate = JSON.parse(fs.readFileSync(gateFile, 'utf-8'));
  } catch {
    return NextResponse.json({ error: 'Failed to read gate file' }, { status: 500 });
  }

  gate.status = action === 'approve' ? 'approved' : 'rejected';
  gate.decided_at = new Date().toISOString();
  if (reason) {
    gate.reason = reason;
  }

  try {
    fs.writeFileSync(gateFile, JSON.stringify(gate, null, 2), 'utf-8');
  } catch {
    return NextResponse.json({ error: 'Failed to write gate file' }, { status: 500 });
  }

  return NextResponse.json({ ok: true, gate_id, action });
}
