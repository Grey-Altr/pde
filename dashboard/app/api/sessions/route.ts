export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { getSessions } from '@/lib/queries';

export async function GET(): Promise<NextResponse> {
  const sessions = await getSessions();
  return NextResponse.json(sessions);
}
