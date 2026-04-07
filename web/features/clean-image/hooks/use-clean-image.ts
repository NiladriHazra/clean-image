'use client';

import { useCallback, useEffect, useState } from 'react';
import { DEFAULT_QUALITY, type CleanMode, type CleanResult } from '@/lib/clean-image/contracts';
import { fetchArtifactPreview, fetchRuntimeStatus, submitCleanRequest } from '@/lib/clean-image/client';
import { formatBytes } from '@/lib/clean-image/format';

export function useCleanImage() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [mode, setMode] = useState<CleanMode>('standard');
  const [quality, setQuality] = useState(DEFAULT_QUALITY);
  const [runtimeAvailable, setRuntimeAvailable] = useState<boolean | null>(null);
  const [missingDependencies, setMissingDependencies] = useState<string[]>([]);
  const [result, setResult] = useState<CleanResult | null>(null);
  const [resultPreviewUrl, setResultPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [isPending, setIsPending] = useState(false);

  const selectedFileSummary = selectedFile
    ? `${selectedFile.name} · ${formatBytes(selectedFile.size)}`
    : 'No image selected';

  const refreshRuntimeStatus = useCallback(async (signal?: AbortSignal) => {
    const status = await fetchRuntimeStatus(signal);
    setRuntimeAvailable(status.available);
    setMissingDependencies(status.missingDependencies);
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    void refreshRuntimeStatus(controller.signal);
    return () => controller.abort();
  }, [refreshRuntimeStatus]);

  useEffect(() => () => { if (previewUrl) URL.revokeObjectURL(previewUrl); }, [previewUrl]);
  useEffect(() => () => { if (resultPreviewUrl) URL.revokeObjectURL(resultPreviewUrl); }, [resultPreviewUrl]);

  const handleFileSelection = useCallback((file: File | null) => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    if (resultPreviewUrl) URL.revokeObjectURL(resultPreviewUrl);
    setSelectedFile(file);
    setPreviewUrl(file ? URL.createObjectURL(file) : null);
    setResult(null);
    setResultPreviewUrl(null);
    setError(null);
    setCopied(false);
  }, [previewUrl, resultPreviewUrl]);

  const reset = useCallback(() => handleFileSelection(null), [handleFileSelection]);

  const submit = useCallback(async () => {
    if (!selectedFile) {
      setError('Choose an image file first.');
      return;
    }
    if (runtimeAvailable === false) {
      setError('Processing routes unavailable. Restart the Next.js server.');
      return;
    }
    if (missingDependencies.length) {
      setError(`Missing: ${missingDependencies.join(', ')}. Install ffmpeg and exiftool.`);
      return;
    }

    setError(null);
    setIsPending(true);

    try {
      const cleanResult = await submitCleanRequest({ file: selectedFile, mode, quality });
      const blob = await fetchArtifactPreview(cleanResult.downloadUrl);
      if (resultPreviewUrl) URL.revokeObjectURL(resultPreviewUrl);
      setCopied(false);
      setResult(cleanResult);
      setResultPreviewUrl(URL.createObjectURL(blob));
    } catch (e) {
      setResult(null);
      setResultPreviewUrl(null);
      setError(e instanceof Error ? e.message : 'The image could not be processed.');
    } finally {
      setIsPending(false);
      void refreshRuntimeStatus();
    }
  }, [missingDependencies, mode, quality, refreshRuntimeStatus, resultPreviewUrl, runtimeAvailable, selectedFile]);

  const copyResult = useCallback(async () => {
    if (!resultPreviewUrl) return;
    try {
      // Clipboard API only accepts image/png — convert via canvas
      const img = new Image();
      img.crossOrigin = 'anonymous';
      const loaded = new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject(new Error('Failed to load image'));
      });
      img.src = resultPreviewUrl;
      await loaded;

      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      canvas.getContext('2d')!.drawImage(img, 0, 0);

      const pngBlob = await new Promise<Blob>((resolve, reject) =>
        canvas.toBlob(
          (b) => (b ? resolve(b) : reject(new Error('Canvas export failed'))),
          'image/png',
        ),
      );

      await navigator.clipboard.write([new ClipboardItem({ 'image/png': pngBlob })]);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError('Copy is not available in this browser.');
    }
  }, [resultPreviewUrl]);

  return {
    copied, copyResult, error, handleFileSelection, isPending,
    missingDependencies, mode, previewUrl, quality, reset, result,
    resultPreviewUrl, runtimeAvailable, selectedFile, selectedFileSummary,
    setMode, setQuality, submit,
  };
}
