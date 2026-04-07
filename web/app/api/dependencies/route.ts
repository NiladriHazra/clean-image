import { NextResponse } from 'next/server';

import { checkDependencies } from '@/lib/server/cleaner';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET() {
  const missing = await checkDependencies();

  return NextResponse.json({
    ok: missing.length === 0,
    missing,
  });
}
