import { NextResponse } from 'next/server';

import {
  DEFAULT_QUALITY,
  MAX_QUALITY,
  MIN_QUALITY,
  isCleanMode,
} from '@/lib/clean-image/contracts';
import { checkDependencies, processUploadedImage } from '@/lib/server/cleaner';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(request: Request) {
  const formData = await request.formData();
  const file = formData.get('file');

  if (!(file instanceof File)) {
    return NextResponse.json(
      { error: 'A valid image file is required.' },
      { status: 400 },
    );
  }

  if (file.size === 0) {
    return NextResponse.json(
      { error: 'The uploaded image is empty.' },
      { status: 400 },
    );
  }

  const missing = await checkDependencies();
  if (missing.length > 0) {
    return NextResponse.json(
      { error: `Missing system dependencies: ${missing.join(', ')}` },
      { status: 503 },
    );
  }

  try {
    const mode = parseMode(formData.get('mode'));
    const quality = parseQuality(formData.get('quality'));

    const payload = await processUploadedImage(file, {
      mode,
      quality,
    });

    return NextResponse.json(
      {
        ...payload,
        metadataRemoved: Math.max(
          0,
          payload.originalMetadataFields - payload.cleanedMetadataFields,
        ),
        sizeDeltaPercent: calculateSizeDelta(payload.originalSize, payload.cleanedSize),
        downloadUrl: `/api/download/${payload.artifactId}`,
      },
      { status: 200 },
    );
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error
          ? error.message
          : 'The image could not be processed.',
      },
      { status: 500 },
    );
  }
}

function parseMode(value: FormDataEntryValue | null) {
  if (isCleanMode(value)) {
    return value;
  }

  return 'standard';
}

function parseQuality(value: FormDataEntryValue | null) {
  const quality = Number(value ?? DEFAULT_QUALITY);

  if (Number.isNaN(quality)) {
    return DEFAULT_QUALITY;
  }

  return Math.max(MIN_QUALITY, Math.min(MAX_QUALITY, quality));
}

function calculateSizeDelta(originalSize: number, cleanedSize: number) {
  if (originalSize === 0) {
    return 0;
  }

  return Math.round((((cleanedSize - originalSize) / originalSize) * 100) * 100) / 100;
}
