import fs from 'node:fs';
import path from 'node:path';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  const projectPath = path.join(process.cwd(), '.planning', 'PROJECT.md');

  if (!fs.existsSync(projectPath)) {
    return NextResponse.json({ error: 'PROJECT.md not found' }, { status: 404 });
  }

  const content = fs.readFileSync(projectPath, 'utf-8');
  const lines = content.split('\n');

  // Extract project name from first # heading
  const nameLine = lines.find(l => l.startsWith('# '));
  const projectName = nameLine ? nameLine.replace(/^# /, '').trim() : '';

  // Extract milestone from **Current milestone:** line
  const milestoneLine = lines.find(l => l.includes('**Current milestone:**'));
  const milestone = milestoneLine
    ? milestoneLine.replace(/.*\*\*Current milestone:\*\*\s*/, '').trim()
    : '';

  // Extract current phase from **Current phase:** line
  const phaseLine = lines.find(l => l.includes('**Current phase:**'));
  const currentPhase = phaseLine
    ? phaseLine.replace(/.*\*\*Current phase:\*\*\s*/, '').trim()
    : '';

  // Extract core value from **Core value:** line
  const coreValueLine = lines.find(l => l.includes('**Core value:**'));
  const coreValue = coreValueLine
    ? coreValueLine.replace(/.*\*\*Core value:\*\*\s*/, '').trim()
    : '';

  return NextResponse.json({ projectName, milestone, currentPhase, coreValue });
}
