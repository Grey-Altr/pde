import fs from 'node:fs';
import path from 'node:path';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  const designStatePath = path.join(process.cwd(), '.planning', 'design', 'DESIGN-STATE.md');

  if (!fs.existsSync(designStatePath)) {
    return NextResponse.json(
      { error: 'DESIGN-STATE.md not found', designPhase: 'none', activeArtifacts: [], reviewStatus: 'none' }
    );
  }

  const content = fs.readFileSync(designStatePath, 'utf-8');
  const lines = content.split('\n');

  // Extract design phase from **Design phase:** or **Phase:** line
  const phaseLine = lines.find(l => l.includes('**Design phase:**') || l.includes('**Phase:**'));
  const designPhase = phaseLine
    ? phaseLine.replace(/.*\*\*(Design phase|Phase):\*\*\s*/, '').trim()
    : 'none';

  // Extract active artifacts — look for list items under an "Active artifacts" section
  const activeArtifacts: string[] = [];
  let inArtifactsSection = false;
  for (const line of lines) {
    if (/#+\s*active artifacts/i.test(line) || /\*\*active artifacts\*\*/i.test(line)) {
      inArtifactsSection = true;
      continue;
    }
    if (inArtifactsSection) {
      if (line.startsWith('#') && !/#+\s*active artifacts/i.test(line)) {
        inArtifactsSection = false;
        break;
      }
      const listMatch = line.match(/^[-*]\s+(.+)/);
      if (listMatch) {
        activeArtifacts.push(listMatch[1].trim());
      }
    }
  }

  // Extract review status from **Review status:** line
  const reviewLine = lines.find(l => l.includes('**Review status:**') || l.includes('**Status:**'));
  const reviewStatus = reviewLine
    ? reviewLine.replace(/.*\*\*(Review status|Status):\*\*\s*/, '').trim()
    : 'none';

  return NextResponse.json({ designPhase, activeArtifacts, reviewStatus });
}
