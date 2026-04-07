'use client';
/* eslint-disable @next/next/no-img-element */

import { useEffect, useRef, useState, type MouseEvent as ReactMouseEvent } from 'react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { MAX_QUALITY, MIN_QUALITY } from '@/lib/clean-image/contracts';
import { formatBytes, formatMode, formatPercent } from '@/lib/clean-image/format';
import { useCleanImage } from '@/features/clean-image/hooks/use-clean-image';

gsap.registerPlugin(useGSAP);

const CLI_COMMAND = 'npx clean-image';
const GITHUB_URL = 'https://github.com/NiladriHazra/clean-image';

const INSTALL_STEPS = `# 1. Clone the repo
git clone ${GITHUB_URL}.git
cd clean-image

# 2. Install system deps (macOS)
brew install ffmpeg exiftool

# 3. Install & run
bun install --cwd web
bun --cwd web dev`;

function getClock() {
  return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

type Dialog = 'install' | 'about' | 'recycle' | null;

export function XpDesktop() {
  const {
    copied, copyResult, error, handleFileSelection, isPending,
    missingDependencies, mode, previewUrl, quality, reset, result,
    resultPreviewUrl, runtimeAvailable, selectedFile, selectedFileSummary,
    setMode, setQuality, submit,
  } = useCleanImage();

  const desktopRef = useRef<HTMLDivElement>(null);
  const windowRef = useRef<HTMLDivElement>(null);

  const [windowState, setWindowState] = useState<'open' | 'minimized' | 'closed'>('open');
  const [maximized, setMaximized] = useState(false);
  const [clock, setClock] = useState(getClock());
  const [dialog, setDialog] = useState<Dialog>(null);
  const [startOpen, setStartOpen] = useState(false);
  const [activeIcon, setActiveIcon] = useState<string | null>('clean-image');
  const [uploadDragActive, setUploadDragActive] = useState(false);
  const draggingRef = useRef(false);
  const dragOffsetRef = useRef({ x: 0, y: 0 });
  const hasDraggedRef = useRef(false);

  useEffect(() => {
    const id = setInterval(() => setClock(getClock()), 15_000);
    return () => clearInterval(id);
  }, []);

  function startDrag(clientX: number, clientY: number) {
    if (maximized) return;
    const win = windowRef.current;
    if (!win) return;
    draggingRef.current = true;
    const rect = win.getBoundingClientRect();
    dragOffsetRef.current = { x: clientX - rect.left, y: clientY - rect.top };
    if (!hasDraggedRef.current) {
      win.style.top = rect.top + 'px';
      win.style.left = rect.left + 'px';
      win.style.transform = 'none';
      hasDraggedRef.current = true;
    }
  }

  function onTitleBarMouseDown(e: React.MouseEvent) {
    if ((e.target as HTMLElement).closest('.xp-titlebar-buttons')) return;
    e.preventDefault();
    startDrag(e.clientX, e.clientY);
  }

  function onTitleBarTouchStart(e: React.TouchEvent) {
    if ((e.target as HTMLElement).closest('.xp-titlebar-buttons')) return;
    startDrag(e.touches[0].clientX, e.touches[0].clientY);
  }

  useEffect(() => {
    function onMove(clientX: number, clientY: number) {
      if (!draggingRef.current || !windowRef.current) return;
      windowRef.current.style.top = (clientY - dragOffsetRef.current.y) + 'px';
      windowRef.current.style.left = (clientX - dragOffsetRef.current.x) + 'px';
    }
    function onMouseMove(e: MouseEvent) { if (draggingRef.current) { e.preventDefault(); onMove(e.clientX, e.clientY); } }
    function onTouchMove(e: TouchEvent) { if (draggingRef.current) { onMove(e.touches[0].clientX, e.touches[0].clientY); } }
    function onEnd() { draggingRef.current = false; }
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onEnd);
    window.addEventListener('touchmove', onTouchMove, { passive: false });
    window.addEventListener('touchend', onEnd);
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onEnd);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onEnd);
    };
  }, []);

  useGSAP(() => {
    const tl = gsap.timeline();
    tl.set('.xp-desktop', { autoAlpha: 0 })
      .to('.xp-desktop', { autoAlpha: 1, duration: 1.2, ease: 'power1.in', delay: 0.3 });
  }, { scope: desktopRef });

  useGSAP(() => {
    if (!windowRef.current) return;
    gsap.fromTo(windowRef.current,
      { autoAlpha: 0, scaleX: 0.3, scaleY: 0.05, transformOrigin: 'bottom left' },
      { autoAlpha: 1, scaleX: 1, scaleY: 1, duration: 0.25, ease: 'power2.out', delay: 1.5 }
    );
  }, { scope: windowRef });

  function handleMinimize() {
    if (!windowRef.current) return;
    gsap.to(windowRef.current, {
      scaleX: 0.15, scaleY: 0.02, autoAlpha: 0, transformOrigin: '0% 100%',
      duration: 0.2, ease: 'power2.in', onComplete: () => setWindowState('minimized'),
    });
  }

  function handleRestore() {
    setWindowState('open');
    requestAnimationFrame(() => {
      if (!windowRef.current) return;
      gsap.fromTo(windowRef.current,
        { scaleX: 0.15, scaleY: 0.02, autoAlpha: 0, transformOrigin: '0% 100%' },
        { scaleX: 1, scaleY: 1, autoAlpha: 1, duration: 0.2, ease: 'power2.out' }
      );
    });
  }

  function handleClose() {
    if (!windowRef.current) return;
    gsap.to(windowRef.current, {
      scale: 0.9, autoAlpha: 0, duration: 0.15, ease: 'power2.in',
      onComplete: () => setWindowState('closed'),
    });
  }

  function handleOpen() {
    setWindowState('open');
    setMaximized(false);
    hasDraggedRef.current = false;
    requestAnimationFrame(() => {
      if (!windowRef.current) return;
      gsap.set(windowRef.current, { clearProps: 'all' });
      gsap.fromTo(windowRef.current,
        { scaleX: 0.15, scaleY: 0.02, autoAlpha: 0, transformOrigin: '0% 100%' },
        { scaleX: 1, scaleY: 1, autoAlpha: 1, duration: 0.25, ease: 'power2.out' }
      );
    });
  }

  function handleMaximize() {
    const win = windowRef.current;
    if (!win) return;
    setMaximized((prev) => {
      const goingMax = !prev;
      win.style.cssText = '';
      win.style.visibility = 'visible';
      win.style.opacity = '1';
      if (goingMax) {
        hasDraggedRef.current = false;
      }
      return goingMax;
    });
  }

  const openDialog = (d: Dialog) => { setDialog(d); setStartOpen(false); };
  const closeDialog = () => setDialog(null);

  useEffect(() => {
    if (!startOpen) return;
    const handler = (e: MouseEvent) => {
      const t = e.target as HTMLElement;
      if (!t.closest('.xp-start-btn') && !t.closest('.xp-start-menu')) setStartOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [startOpen]);

  const showWindow = windowState === 'open';

  return (
    <div ref={desktopRef}>
      <div className="xp-desktop gsap-hidden">
        <div className="xp-desktop-area" onClick={() => { setActiveIcon(null); setStartOpen(false); }}>

          <DesktopIcon icon="🖼️" label="Clean Image" active={activeIcon === 'clean-image'} onClick={() => setActiveIcon('clean-image')} onDoubleClick={() => { if (windowState !== 'open') handleOpen(); }} />
          <DesktopIcon icon="💿" label="Install CLI" active={activeIcon === 'install'} onClick={() => setActiveIcon('install')} onDoubleClick={() => openDialog('install')} />
          <DesktopIcon icon="🐙" label="GitHub" active={activeIcon === 'github'} onClick={() => setActiveIcon('github')} onDoubleClick={() => window.open(GITHUB_URL, '_blank')} />
          <DesktopIcon icon="ℹ️" label="About" active={activeIcon === 'about'} onClick={() => setActiveIcon('about')} onDoubleClick={() => openDialog('about')} />
          <DesktopIcon icon="🗑️" label="Recycle Bin" active={activeIcon === 'recycle'} onClick={() => setActiveIcon('recycle')} onDoubleClick={() => openDialog('recycle')} />


          <div
            className={`xp-window gsap-hidden${maximized ? ' xp-window-maximized' : ''}${!showWindow ? ' xp-window-minimized' : ''}`}
            ref={windowRef}
          >
            <div className="xp-titlebar" onMouseDown={onTitleBarMouseDown} onTouchStart={onTitleBarTouchStart} style={{ cursor: maximized ? 'default' : 'move' }}>
              <span className="xp-titlebar-icon">🖼️</span>
              <span className="xp-titlebar-text">Clean Image - AI Metadata Stripper</span>
              <div className="xp-titlebar-buttons">
                <button className="xp-tbtn xp-tbtn-min" type="button" onClick={handleMinimize} title="Minimize">
                  <svg viewBox="0 0 10 10"><path d="M1 8H9" /></svg>
                </button>
                <button className="xp-tbtn xp-tbtn-max" type="button" onClick={handleMaximize} title={maximized ? 'Restore' : 'Maximize'}>
                  <svg viewBox="0 0 10 10"><rect x="1" y="1" width="8" height="8" strokeWidth="2" /></svg>
                </button>
                <button className="xp-tbtn xp-tbtn-close" type="button" onClick={handleClose} title="Close">
                  <svg viewBox="0 0 10 10"><path d="M1 1L9 9M9 1L1 9" /></svg>
                </button>
              </div>
            </div>

            <div className="xp-menubar">
              <button className="xp-menu-item" type="button" onClick={reset}>File</button>
              <button className="xp-menu-item" type="button" onClick={() => void copyResult()}>Edit</button>
              <button className="xp-menu-item" type="button" onClick={handleMaximize}>View</button>
              <button className="xp-menu-item" type="button" onClick={() => navigator.clipboard.writeText(CLI_COMMAND)}>CLI</button>
              <button className="xp-menu-item" type="button" onClick={() => window.open(GITHUB_URL, '_blank')}>Help</button>
            </div>

            <div className="xp-client">
              {runtimeAvailable === false && (
                <div className="xp-status-banner error"><span>⚠️</span><span>Processing route unavailable. Restart the server.</span></div>
              )}
              {missingDependencies.length > 0 && (
                <div className="xp-status-banner warn"><span>⚠️</span><span>Missing: {missingDependencies.join(', ')}</span></div>
              )}

              {!result && !isPending && (
                <form onSubmit={(e) => { e.preventDefault(); void submit(); }}>
                  <div className="xp-groupbox">
                    <p className="xp-groupbox-title">📂 Select Image</p>
                    <label
                      className={`xp-upload-zone${uploadDragActive ? ' drag-over' : ''}${selectedFile ? ' has-file' : ''}`}
                      onDragOver={(e) => { e.preventDefault(); setUploadDragActive(true); }}
                      onDragLeave={() => setUploadDragActive(false)}
                      onDrop={(e) => { e.preventDefault(); setUploadDragActive(false); handleFileSelection(e.dataTransfer.files?.[0] ?? null); }}
                    >
                      <input accept="image/*" className="sr-only" onChange={(e) => handleFileSelection(e.target.files?.[0] ?? null)} type="file" />
                      {selectedFile ? (
                        <>
                          <span className="xp-upload-icon">✅</span>
                          <span className="xp-upload-text">File Ready</span>
                          <span className="xp-upload-filename">{selectedFileSummary}</span>
                        </>
                      ) : (
                        <>
                          <span className="xp-upload-icon">📁</span>
                          <span className="xp-upload-text">Click to Browse or Drop Image Here</span>
                          <span className="xp-upload-sub">Supports PNG, JPEG, WebP files</span>
                        </>
                      )}
                    </label>
                  </div>

                  <div className="xp-groupbox">
                    <p className="xp-groupbox-title">⚙️ Cleaning Options</p>
                    <span className="xp-label">Cleaning mode:</span>
                    <div className="xp-radio-group">
                      <label className="xp-radio"><input type="radio" name="mode" checked={mode === 'standard'} onChange={() => setMode('standard')} /> Standard</label>
                      <label className="xp-radio"><input type="radio" name="mode" checked={mode === 'aggressive'} onChange={() => setMode('aggressive')} /> Aggressive</label>
                      <label className="xp-radio"><input type="radio" name="mode" checked={mode === 'strip-only'} onChange={() => setMode('strip-only')} /> Strip only</label>
                    </div>
                    <span className="xp-label">JPEG quality:</span>
                    <div className="xp-slider-row">
                      <span>{MIN_QUALITY}</span>
                      <input type="range" className="xp-slider" min={MIN_QUALITY} max={MAX_QUALITY} step={1} value={quality} onChange={(e) => setQuality(Number(e.target.value))} />
                      <span>{MAX_QUALITY}</span>
                      <span className="xp-slider-value">{quality}</span>
                    </div>
                  </div>

                  <div className="xp-btn-row">
                    <button className="xp-btn xp-btn-primary" type="submit" disabled={isPending || !selectedFile}>🧹 Clean Image</button>
                    <button className="xp-btn" type="button" onClick={reset}>↩️ Reset</button>
                  </div>
                </form>
              )}

              {error && <div className="xp-error"><span>❌</span><span>{error}</span></div>}

              {isPending && (
                <div className="xp-progress-area">
                  <span className="xp-progress-icon">⏳</span>
                  <span className="xp-progress-text">Cleaning image... Please wait.<br />Removing AI metadata and fingerprints.</span>
                  <div className="xp-progress-bar-outer"><div className="xp-progress-bar-fill" /></div>
                </div>
              )}

              {result && (
                <>
                  <div className="xp-groupbox">
                    <p className="xp-groupbox-title">✅ Cleaning Complete</p>
                    {resultPreviewUrl && <img src={resultPreviewUrl} alt="Cleaned" className="xp-result-img" />}
                    <table className="xp-result-table"><tbody>
                      <tr><td>Mode</td><td>{formatMode(result.mode)}</td></tr>
                      <tr><td>Metadata removed</td><td>{result.metadataRemoved} fields</td></tr>
                      <tr><td>Original size</td><td>{formatBytes(result.originalSize)}</td></tr>
                      <tr><td>Cleaned size</td><td>{formatBytes(result.cleanedSize)}</td></tr>
                      <tr><td>Size change</td><td>{formatPercent(result.sizeDeltaPercent)}</td></tr>
                    </tbody></table>
                  </div>
                  <div className="xp-btn-row">
                    <a className="xp-btn xp-btn-primary" href={result.downloadUrl} download={result.outputFilename} style={{ textDecoration: 'none', color: '#000' }}>💾 Save As...</a>
                    <button className="xp-btn" type="button" onClick={() => void copyResult()}>{copied ? '✅ Copied!' : '📋 Copy Image'}</button>
                    <button className="xp-btn" type="button" onClick={reset}>🔄 New Image</button>
                  </div>
                </>
              )}
            </div>

            <div className="xp-statusbar">
              <span className="xp-statusbar-section">{isPending ? '⏳ Processing...' : result ? '✅ Done' : '📋 Ready'}</span>
              <span className="xp-statusbar-section">{selectedFileSummary}</span>
            </div>
          </div>


          <InstallWidget />
        </div>


        {startOpen && (
          <div className="xp-start-menu" style={{ position: 'absolute', bottom: 36, left: 0, width: 320, background: '#fff', border: '1px solid #003399', borderRadius: '8px 8px 0 0', boxShadow: '2px -2px 8px rgba(0,0,0,0.3)', zIndex: 50, overflow: 'hidden' }}>
            <div style={{ background: 'linear-gradient(180deg, #2060c0, #1848a0)', padding: '10px 12px', display: 'flex', alignItems: 'center', gap: 10, borderRadius: '8px 8px 0 0' }}>
              <span style={{ fontSize: 32 }}>👤</span>
              <span style={{ color: '#fff', fontWeight: 'bold', fontSize: 13 }}>User</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', borderBottom: '1px solid #ccc' }}>
              <div style={{ borderRight: '1px solid #ddd', padding: '6px 0' }}>
                <StartMenuItem icon="🖼️" label="Clean Image" onClick={() => { setStartOpen(false); if (windowState !== 'open') handleOpen(); }} />
                <StartMenuItem icon="💿" label="Install CLI" onClick={() => openDialog('install')} />
                <StartMenuItem icon="🐙" label="GitHub" onClick={() => { setStartOpen(false); window.open(GITHUB_URL, '_blank'); }} />
                <StartMenuItem icon="ℹ️" label="About" onClick={() => openDialog('about')} />
              </div>
              <div style={{ padding: '6px 0' }}>
                <StartMenuItem icon="📁" label="My Documents" onClick={() => setStartOpen(false)} />
                <StartMenuItem icon="🖥️" label="My Computer" onClick={() => setStartOpen(false)} />
                <StartMenuItem icon="🔧" label="Control Panel" onClick={() => setStartOpen(false)} />
              </div>
            </div>
            <div style={{ background: 'linear-gradient(180deg, #4178be, #245eb5)', padding: '6px 12px', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button onClick={() => setStartOpen(false)} style={{ background: 'none', border: 'none', color: '#fff', fontSize: 11, fontFamily: 'inherit', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>🔌 Turn Off Computer</button>
            </div>
          </div>
        )}


        <div className="xp-taskbar">
          <button className="xp-start-btn" type="button" onClick={() => setStartOpen(!startOpen)}>
            <span className="xp-start-logo">⊞</span> start
          </button>
          <div className="xp-taskbar-items">
            <button className="xp-taskbar-item active" type="button" onClick={() => { if (windowState !== 'open') handleOpen(); else handleMinimize(); }}>🖼️ Clean Image</button>
            {dialog && <button className="xp-taskbar-item active" type="button" onClick={closeDialog}>{dialog === 'install' ? '💿' : dialog === 'about' ? 'ℹ️' : '🗑️'} {dialog}</button>}
          </div>
          <div className="xp-tray">
            <span title="Volume">🔊</span>
            <span title="Security">🛡️</span>
            <span className="xp-tray-clock">{clock}</span>
          </div>
        </div>


        {dialog === 'install' && (
          <div className="xp-dialog-overlay" onClick={closeDialog}>
            <div className="xp-dialog" onClick={(e) => e.stopPropagation()}>
              <div className="xp-titlebar"><span className="xp-titlebar-icon">💿</span><span className="xp-titlebar-text">Install clean-image locally</span><div className="xp-titlebar-buttons"><button className="xp-tbtn xp-tbtn-close" type="button" onClick={closeDialog}><svg viewBox="0 0 10 10"><path d="M1 1L9 9M9 1L1 9"/></svg></button></div></div>
              <div className="xp-dialog-body"><p>Run the following to install and run <strong>clean-image</strong>:</p><code>{INSTALL_STEPS}</code><p>Requires <strong>Node.js 18+</strong>, <strong>bun</strong>, <strong>ffmpeg</strong>, and <strong>exiftool</strong>.</p></div>
              <div className="xp-dialog-footer"><a className="xp-btn" href={GITHUB_URL} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none', color: '#000' }}>🐙 GitHub</a><button className="xp-btn xp-btn-primary" type="button" onClick={closeDialog}>OK</button></div>
            </div>
          </div>
        )}
        {dialog === 'about' && (
          <div className="xp-dialog-overlay" onClick={closeDialog}>
            <div className="xp-dialog" onClick={(e) => e.stopPropagation()}>
              <div className="xp-titlebar"><span className="xp-titlebar-icon">ℹ️</span><span className="xp-titlebar-text">About clean-image</span><div className="xp-titlebar-buttons"><button className="xp-tbtn xp-tbtn-close" type="button" onClick={closeDialog}><svg viewBox="0 0 10 10"><path d="M1 1L9 9M9 1L1 9"/></svg></button></div></div>
              <div className="xp-dialog-body"><div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}><span style={{ fontSize: 48 }}>🖼️</span><div><p><strong>clean-image</strong> — AI Metadata Stripper</p><p style={{ marginTop: 8 }}>Strip AI metadata with FFmpeg + ExifTool. Built with Next.js 16.</p><p style={{ marginTop: 8 }}><a href={GITHUB_URL} target="_blank" rel="noopener noreferrer">{GITHUB_URL}</a></p></div></div></div>
              <div className="xp-dialog-footer"><button className="xp-btn xp-btn-primary" type="button" onClick={closeDialog}>OK</button></div>
            </div>
          </div>
        )}
        {dialog === 'recycle' && (
          <div className="xp-dialog-overlay" onClick={closeDialog}>
            <div className="xp-dialog" onClick={(e) => e.stopPropagation()}>
              <div className="xp-titlebar"><span className="xp-titlebar-icon">🗑️</span><span className="xp-titlebar-text">Recycle Bin</span><div className="xp-titlebar-buttons"><button className="xp-tbtn xp-tbtn-close" type="button" onClick={closeDialog}><svg viewBox="0 0 10 10"><path d="M1 1L9 9M9 1L1 9"/></svg></button></div></div>
              <div className="xp-dialog-body" style={{ textAlign: 'center', padding: '24px 16px' }}><span style={{ fontSize: 48 }}>🗑️</span><p style={{ marginTop: 12 }}><strong>Recycle Bin is empty.</strong></p><p>All AI metadata has been cleaned!</p></div>
              <div className="xp-dialog-footer"><button className="xp-btn xp-btn-primary" type="button" onClick={closeDialog}>OK</button></div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function DesktopIcon({ icon, label, active, onClick, onDoubleClick }: { icon: string; label: string; active: boolean; onClick: () => void; onDoubleClick?: () => void }) {
  return (
    <div className={`xp-icon${active ? ' active' : ''}`} onClick={(e) => { e.stopPropagation(); onClick(); }} onDoubleClick={(e) => { e.stopPropagation(); onDoubleClick?.(); }}>
      <span className="xp-icon-img">{icon}</span><span className="xp-icon-label">{label}</span>
    </div>
  );
}

function InstallWidget() {
  const [copied, setCopied] = useState(false);
  const cmd = CLI_COMMAND;
  async function handleCopy(e: ReactMouseEvent) {
    e.stopPropagation();
    try { await navigator.clipboard.writeText(cmd); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch {}
  }
  return (
    <div className="xp-install-widget" onClick={(e) => e.stopPropagation()}>
      <div className="xp-install-header"><span>💿</span><span>Install</span></div>
      <div className="xp-install-body">
        <div className="xp-install-cmd">
          <span className="xp-install-prompt">❯</span>
          <span className="xp-install-text">{cmd}</span>
          <button className="xp-install-copy" type="button" onClick={handleCopy} title={copied ? 'Copied!' : 'Copy'}>
            {copied ? <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#3c9a2f" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg> : <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#808080" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>}
          </button>
        </div>
      </div>
    </div>
  );
}

function StartMenuItem({ icon, label, onClick }: { icon: string; label: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '5px 12px', border: 'none', background: 'none', fontFamily: 'inherit', fontSize: 11, fontWeight: 'bold', cursor: 'pointer', textAlign: 'left' }}
      onMouseEnter={(e) => { (e.currentTarget).style.background = '#316ac5'; (e.currentTarget).style.color = '#fff'; }}
      onMouseLeave={(e) => { (e.currentTarget).style.background = 'none'; (e.currentTarget).style.color = '#000'; }}>
      <span style={{ fontSize: 18, lineHeight: 1 }}>{icon}</span>{label}
    </button>
  );
}
