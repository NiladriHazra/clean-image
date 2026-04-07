'use client';
/* eslint-disable @next/next/no-img-element */

import { useEffect, useState } from 'react';
import { MAX_QUALITY, MIN_QUALITY } from '@/lib/clean-image/contracts';
import { formatBytes, formatMode, formatPercent } from '@/lib/clean-image/format';
import { useCleanImage } from '@/features/clean-image/hooks/use-clean-image';

const CLI_COMMAND = 'npx clean-image';
const GITHUB_URL = 'https://github.com/NiladriHazra/clean-image';

function getClock() {
  return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export function KitKatMobile() {
  const {
    copied, copyResult, error, handleFileSelection, isPending,
    missingDependencies, mode, previewUrl, quality, reset, result,
    resultPreviewUrl, runtimeAvailable, selectedFile, selectedFileSummary,
    setMode, setQuality, submit,
  } = useCleanImage();

  const [clock, setClock] = useState(getClock());
  const [showMenu, setShowMenu] = useState(false);
  const [installCopied, setInstallCopied] = useState(false);

  useEffect(() => {
    const id = setInterval(() => setClock(getClock()), 30_000);
    return () => clearInterval(id);
  }, []);

  async function copyInstall() {
    try {
      await navigator.clipboard.writeText(CLI_COMMAND);
      setInstallCopied(true);
      setTimeout(() => setInstallCopied(false), 2000);
    } catch {}
  }

  return (
    <div className="kk-phone">
      {/* Status bar */}
      <div className="kk-statusbar">
        <div className="kk-sb-left">
          <svg width="12" height="12" viewBox="0 0 16 16" fill="#fff"><rect x="0" y="11" width="3" height="5" rx="0.5" opacity="0.4"/><rect x="4" y="8" width="3" height="8" rx="0.5" opacity="0.6"/><rect x="8" y="4" width="3" height="12" rx="0.5" opacity="0.8"/><rect x="12" y="0" width="3" height="16" rx="0.5"/></svg>
          <svg width="14" height="12" viewBox="0 0 24 18" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round"><path d="M1 5c5.5-4.5 16.5-4.5 22 0"/><path d="M5 9c3.5-3 10.5-3 14 0"/><path d="M9 13c1.7-1.5 5.3-1.5 7 0"/><circle cx="12" cy="16" r="1.5" fill="#fff" stroke="none"/></svg>
        </div>
        <div className="kk-sb-right">
          <svg width="20" height="10" viewBox="0 0 28 14" fill="none"><rect x="0.5" y="1" width="24" height="12" rx="1.5" stroke="#fff" strokeWidth="1"/><rect x="25" y="4" width="2.5" height="6" rx="0.5" fill="#fff"/><rect x="2" y="3" width="20" height="8" rx="0.5" fill="#4caf50"/></svg>
          <span className="kk-sb-text">100%</span>
          <span className="kk-sb-text">{clock}</span>
        </div>
      </div>

      {/* Action bar */}
      <div className="kk-actionbar">
        <div className="kk-ab-left">
          <span className="kk-ab-icon">🖼️</span>
          <span className="kk-ab-title">Clean Image</span>
        </div>
        <button className="kk-ab-overflow" type="button" onClick={() => setShowMenu(!showMenu)}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="#fff"><circle cx="12" cy="5" r="2.2"/><circle cx="12" cy="12" r="2.2"/><circle cx="12" cy="19" r="2.2"/></svg>
        </button>
        {showMenu && (
          <>
            <div className="kk-menu-backdrop" onClick={() => setShowMenu(false)} />
            <div className="kk-menu">
              <button type="button" onClick={() => { reset(); setShowMenu(false); }}>New image</button>
              <button type="button" onClick={() => { window.open(GITHUB_URL, '_blank'); setShowMenu(false); }}>GitHub</button>
              <button type="button" onClick={() => setShowMenu(false)}>About</button>
            </div>
          </>
        )}
      </div>

      {/* Content */}
      <div className="kk-content" onClick={() => showMenu && setShowMenu(false)}>
        {error && <div className="kk-snackbar">{error}</div>}
        {runtimeAvailable === false && <div className="kk-snackbar">Server unavailable. Restart Next.js.</div>}
        {missingDependencies.length > 0 && <div className="kk-snackbar">Missing: {missingDependencies.join(', ')}</div>}

        {/* Upload form */}
        {!result && !isPending && (
          <>
            <label className={`kk-card kk-upload${selectedFile ? ' kk-upload-has' : ''}`}>
              <input accept="image/*" type="file" hidden onChange={(e) => handleFileSelection(e.target.files?.[0] ?? null)} />
              {selectedFile && previewUrl ? (
                <div className="kk-upload-preview">
                  <img src={previewUrl} alt="" />
                  <div className="kk-upload-overlay"><span className="kk-upload-change">Tap to change</span></div>
                  <div className="kk-upload-badge">{selectedFileSummary}</div>
                </div>
              ) : (
                <div className="kk-upload-empty">
                  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#bdbdbd" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>
                  <span className="kk-upload-title">Tap to select image</span>
                  <span className="kk-upload-sub">PNG, JPEG, WebP</span>
                </div>
              )}
            </label>

            <div className="kk-label">CLEANING MODE</div>
            <div className="kk-chip-row">
              <button type="button" className={`kk-chip${mode === 'standard' ? ' kk-chip-on' : ''}`} onClick={() => setMode('standard')}>Standard</button>
              <button type="button" className={`kk-chip${mode === 'aggressive' ? ' kk-chip-on' : ''}`} onClick={() => setMode('aggressive')}>Aggressive</button>
              <button type="button" className={`kk-chip${mode === 'strip-only' ? ' kk-chip-on' : ''}`} onClick={() => setMode('strip-only')}>Strip only</button>
            </div>

            <div className="kk-label">JPEG QUALITY — <strong>{quality}</strong></div>
            <div className="kk-slider-wrap">
              <span className="kk-slider-min">{MIN_QUALITY}</span>
              <input type="range" className="kk-slider" min={MIN_QUALITY} max={MAX_QUALITY} step={1} value={quality} onChange={(e) => setQuality(Number(e.target.value))} />
              <span className="kk-slider-max">{MAX_QUALITY}</span>
            </div>

            <button className={`kk-action-button${selectedFile ? '' : ' kk-action-disabled'}`} type="button" disabled={!selectedFile || isPending} onClick={() => void submit()}>
              CLEAN IMAGE
            </button>
          </>
        )}

        {/* Loading */}
        {isPending && (
          <div className="kk-card kk-loading-card">
            <div className="kk-indeterminate"><div className="kk-indeterminate-bar" /></div>
            <div className="kk-loading-body">
              <div className="kk-loading-spinner" />
              <span>Cleaning image…</span>
              <span className="kk-loading-sub">Removing AI metadata</span>
            </div>
          </div>
        )}

        {/* Result */}
        {result && (
          <>
            <div className="kk-card">
              {resultPreviewUrl && <img src={resultPreviewUrl} alt="Cleaned" className="kk-result-img" />}
            </div>
            <div className="kk-card kk-stats-card">
              <div className="kk-stat"><span>Mode</span><strong>{formatMode(result.mode)}</strong></div>
              <div className="kk-stat"><span>Removed</span><strong>{result.metadataRemoved} fields</strong></div>
              <div className="kk-stat"><span>Before</span><strong>{formatBytes(result.originalSize)}</strong></div>
              <div className="kk-stat"><span>After</span><strong>{formatBytes(result.cleanedSize)}</strong></div>
            </div>
            <div className="kk-actions-row">
              <a className="kk-action-button" href={result.downloadUrl} download={result.outputFilename} style={{ textDecoration: 'none' }}>DOWNLOAD</a>
            </div>
            <div className="kk-actions-row kk-actions-secondary">
              <button className="kk-flat-btn" type="button" onClick={() => void copyResult()}>{copied ? 'COPIED ✓' : 'COPY IMAGE'}</button>
              <button className="kk-flat-btn" type="button" onClick={reset}>NEW IMAGE</button>
            </div>
          </>
        )}
      </div>

      {/* Install tip */}
      <div className="kk-install-tip">
        <span className="kk-install-tip-label">INSTALL CLI</span>
        <div className="kk-install-tip-row">
          <code className="kk-install-tip-cmd"><span className="kk-install-tip-prompt">❯</span> {CLI_COMMAND}</code>
          <button className="kk-install-tip-copy" type="button" onClick={copyInstall}>
            {installCopied ? <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#4caf50" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg> : <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9e9e9e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>}
          </button>
        </div>
      </div>

      {/* Nav bar */}
      <div className="kk-navbar">
        <button className="kk-nav" type="button" onClick={reset}><svg width="20" height="20" viewBox="0 0 24 24" fill="#fff" opacity="0.7"><path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/></svg></button>
        <button className="kk-nav" type="button"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" opacity="0.7"><circle cx="12" cy="12" r="10"/></svg></button>
        <button className="kk-nav" type="button"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" opacity="0.7"><rect x="3" y="3" width="18" height="18" rx="1"/></svg></button>
      </div>
    </div>
  );
}
