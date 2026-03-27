import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { getSessions } from '@/lib/queries';

export async function GET() {
  const authError = await requireAuth();
  if (authError) return authError;

  const sessions = await getSessions();
  return NextResponse.json(sessions);
}
