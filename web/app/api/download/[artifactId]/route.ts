import { NextResponse } from 'next/server';

import { readArtifact } from '@/lib/server/cleaner';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(
  _request: Request,
  context: {
    params: Promise<{ artifactId: string }>;
  },
) {
  const { artifactId } = await context.params;

  const artifact = await readArtifact(artifactId);
  if (!artifact) {
    return NextResponse.json(
      { error: 'Download artifact not found or expired.' },
      { status: 404 },
    );
  }

  return new NextResponse(artifact.body, {
    status: 200,
    headers: {
      'cache-control': 'no-store',
      'content-type': artifact.artifact.contentType,
      'content-length': String(artifact.body.byteLength),
      'content-disposition': `attachment; filename="${artifact.artifact.fileName}"`,
    },
  });
}
