import { NextResponse } from 'next/server';

import { APP_NAME, APP_VERSION } from '@/lib/clean-image/contracts';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET() {
  return NextResponse.json({
    ok: true,
    service: APP_NAME,
    version: APP_VERSION,
  });
}
