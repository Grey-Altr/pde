import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getSessions } from '@/lib/queries';

export const dynamic = 'force-dynamic';

export async function GET() {
  const { isAuthenticated } = await auth();
  if (!isAuthenticated) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const sessions = await getSessions();
  return NextResponse.json(sessions);
}
