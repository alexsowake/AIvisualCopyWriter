"use client";

import React from 'react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, Download, RefreshCw, Copy, Check, X, ImageIcon, Sparkles } from 'lucide-react';
import { ImageItem, MultiGenResult, ModelProvider, CopyMode } from '../../hooks/useImageProcessor';
import { ExportCardTemplate } from './ExportCardTemplate';

interface MultiGenGalleryProps {
  sourceImage: ImageItem | null;
  results: MultiGenResult[];
  modelProvider: ModelProvider;
  regenerateItem: (id: string) => void;
  stopItem: (id: string) => void;
  clearAll: () => void;
  setPreviewImage: (url: string) => void;
  toast: { message: string; type: 'info' | 'error' | 'success' } | null;
  showToast: (message: string, type: 'info' | 'error' | 'success') => void;
}

const SECTION_LABEL_STYLE: React.CSSProperties = {
  fontSize: '11px',
  letterSpacing: '0.16em',
  textTransform: 'uppercase',
  color: 'var(--fg-subtle)',
  fontFamily: "'DM Sans', sans-serif",
  fontWeight: 400,
  display: 'flex',
  alignItems: 'center',
  gap: '10px',
  marginBottom: '1.5rem',
  marginTop: '2.5rem',
};

const MODEL_LABEL: Record<ModelProvider, string> = {
  gemini: 'Gemini 3 Flash',
  'gemini-flash': 'Gemini 3 Flash',
  qwen: 'Qwen-VL-Max',
  kimi: 'Kimi K2.5'
};

export function MultiGenGallery({
  sourceImage,
  results,
  modelProvider,
  regenerateItem,
  stopItem,
  clearAll,
  setPreviewImage,
  toast,
  showToast,
}: MultiGenGalleryProps) {
  const [copiedId, setCopiedId] = React.useState<string | null>(null);
  const [exportingId, setExportingId] = React.useState<string | null>(null);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleExport = async (id: string) => {
    const wrapper = document.getElementById(`export-wrapper-${id}`);
    if (!wrapper || !sourceImage) return;

    setExportingId(id);
    let cloneWrapper: HTMLElement | null = null;
    let originalUrl: string | null = null;

    try {
      await document.fonts.ready;
      const html2canvas = (await import('html2canvas')).default;

      cloneWrapper = wrapper.cloneNode(true) as HTMLElement;
      cloneWrapper.style.cssText = 'position:fixed;left:0;top:0;opacity:1;z-index:-9999;pointer-events:none;';
      document.body.appendChild(cloneWrapper);

      const cloneNode = cloneWrapper.querySelector(`#export-card-${id}`) as HTMLElement;
      const cloneImgEl = cloneWrapper.querySelector('img') as HTMLImageElement | null;

      // Replace with original high-res file, fall back to previewUrl on error
      if (sourceImage.originalFile && cloneImgEl) {
        originalUrl = URL.createObjectURL(sourceImage.originalFile);
        cloneImgEl.removeAttribute('srcset');
        cloneImgEl.removeAttribute('sizes');
        cloneImgEl.src = originalUrl;

        await new Promise<void>(resolve => {
          if (cloneImgEl.complete && cloneImgEl.naturalWidth > 0) { resolve(); return; }
          cloneImgEl.onload = () => resolve();
          cloneImgEl.onerror = () => {
            cloneImgEl.src = sourceImage.previewUrl ?? '';
            cloneImgEl.onload = () => resolve();
            cloneImgEl.onerror = () => resolve();
          };
        });

        await cloneImgEl.decode().catch(() => {});
      }

      // Adaptive crop: landscape max 4:3, portrait max 3:4
      if (cloneImgEl && cloneImgEl.naturalWidth > 0 && cloneImgEl.naturalHeight > 0) {
        const nw = cloneImgEl.naturalWidth;
        const nh = cloneImgEl.naturalHeight;
        const isPortrait = nh > nw;
        const naturalRatio = nw / nh;
        const targetRatio = isPortrait
          ? Math.max(naturalRatio, 3 / 4)
          : Math.min(naturalRatio, 4 / 3);

        if (cloneImgEl.parentElement) {
          cloneImgEl.parentElement.style.paddingTop = `${(100 / targetRatio).toFixed(2)}%`;
        }

        let sx = 0, sy = 0, sw = nw, sh = nh;
        if (nw / nh > targetRatio) {
          sw = Math.round(nh * targetRatio);
          sx = Math.round((nw - sw) / 2);
        } else if (nw / nh < targetRatio) {
          sh = Math.round(nw / targetRatio);
          sy = Math.round((nh - sh) / 2);
        }
        const cropCanvas = document.createElement('canvas');
        cropCanvas.width = sw;
        cropCanvas.height = sh;
        cropCanvas.getContext('2d')!.drawImage(cloneImgEl, sx, sy, sw, sh, 0, 0, sw, sh);
        cloneImgEl.src = cropCanvas.toDataURL('image/jpeg', 1.0);
        await cloneImgEl.decode().catch(() => {});
      }

      await new Promise(resolve => requestAnimationFrame(resolve));
      await new Promise(resolve => setTimeout(resolve, 300));

      const canvas = await html2canvas(cloneNode, {
        scale: 3,
        useCORS: true,
        backgroundColor: '#FAF9F6',
        logging: false,
      });

      const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
      const link = document.createElement('a');
      link.download = `时间胶囊-${Date.now()}.jpg`;
      link.href = dataUrl;
      link.click();
      showToast('图片导出成功', 'success');
    } catch (err) {
      console.error('Export failed:', err);
      showToast('导出失败，请尝试截图保存', 'error');
    } finally {
      cloneWrapper?.remove();
      if (originalUrl) URL.revokeObjectURL(originalUrl);
      setExportingId(null);
    }
  };

  if (!sourceImage && results.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '100px 0', opacity: 0.5 }}>
        <Sparkles size={32} style={{ margin: '0 auto 16px', color: 'var(--border-strong)' }} />
        <p style={{ fontSize: '14px' }}>等待开始多重创作模式</p>
      </div>
    );
  }

  const originals = results.filter(r => r.copyMode === 'ai-original');
  const quotes = results.filter(r => r.copyMode === 'quote-style');

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto', paddingBottom: '100px' }}>
      
      {/* ── Feature Image area ── */}
      {sourceImage && (
        <motion.div
           initial={{ opacity: 0, y: 10 }}
           animate={{ opacity: 1, y: 0 }}
           style={{ 
             marginBottom: '3rem', 
             position: 'relative',
             height: '400px',
             background: 'var(--surface)',
             border: '1px solid var(--border)',
             overflow: 'hidden',
             display: 'flex',
             alignItems: 'center',
             justifyContent: 'center'
           }}
        >
          {sourceImage.previewUrl ? (
            <Image
              src={sourceImage.previewUrl}
              alt="Source"
              fill
              unoptimized
              style={{ objectFit: 'contain', cursor: 'zoom-in' }}
              onClick={() => setPreviewImage(sourceImage.previewUrl)}
            />
          ) : (
            <Loader2 className="animate-spin" size={32} style={{ color: 'var(--border-strong)' }} />
          )}
          
          <button
            onClick={clearAll}
            style={{
              position: 'absolute',
              top: '15px',
              right: '15px',
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              background: 'rgba(255,255,255,0.8)',
              border: 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              zIndex: 10,
              boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
            }}
          >
            <X size={16} />
          </button>
        </motion.div>
      )}

      {/* ── Originals Section ── */}
      {originals.length > 0 && (
        <>
          <div style={SECTION_LABEL_STYLE}>
            <span style={{ width: '18px', height: '1px', background: 'var(--border-strong)', display: 'inline-block' }} />
            原创区
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {originals.map((res, idx) => (
              <MultiGenCard
                key={res.id}
                res={res}
                index={idx}
                sourceImage={sourceImage}
                modelProvider={modelProvider}
                isExporting={exportingId === res.id}
                isCopied={copiedId === res.id}
                onExport={() => handleExport(res.id)}
                onRegenerate={() => regenerateItem(res.id)}
                onStop={() => stopItem(res.id)}
                onCopy={() => copyToClipboard(res.result || '', res.id)}
              />
            ))}
          </div>
        </>
      )}

      {/* ── Quotes Section ── */}
      {quotes.length > 0 && (
        <>
          <div style={SECTION_LABEL_STYLE}>
            <span style={{ width: '18px', height: '1px', background: 'var(--border-strong)', display: 'inline-block' }} />
            引文区
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {quotes.map((res, idx) => (
              <MultiGenCard
                key={res.id}
                res={res}
                index={idx + 3}
                sourceImage={sourceImage}
                modelProvider={modelProvider}
                isExporting={exportingId === res.id}
                isCopied={copiedId === res.id}
                onExport={() => handleExport(res.id)}
                onRegenerate={() => regenerateItem(res.id)}
                onStop={() => stopItem(res.id)}
                onCopy={() => copyToClipboard(res.result || '', res.id)}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function MultiGenCard({
  res,
  index,
  sourceImage,
  modelProvider,
  isExporting,
  isCopied,
  onExport,
  onRegenerate,
  onStop,
  onCopy,
}: {
  res: MultiGenResult;
  index: number;
  sourceImage: ImageItem | null;
  modelProvider: ModelProvider;
  isExporting: boolean;
  isCopied: boolean;
  onExport: () => void;
  onRegenerate: () => void;
  onStop: () => void;
  onCopy: () => void;
}) {
  const rotation = index % 2 === 0 ? 0.4 : -0.4;
  const OFFSETS = [0, 4, -4] as const;
  const offset = OFFSETS[index % 3];
  const [mainText, attribution] = (res.result ?? '').split('\n\n');

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: offset, rotate: rotation }}
      whileHover={{ y: offset - 4, transition: { duration: 0.2 } }}
      style={{
        background: 'var(--bg)',
        border: '1px solid var(--border)',
        padding: '1.5rem',
        display: 'flex',
        flexDirection: 'column',
        minHeight: '220px',
        boxShadow: '0 4px 20px -8px rgba(35, 26, 17, 0.08)',
        transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
      }}
      className="group hover:border-border-strong"
    >
      <div style={{ marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{
          display: 'inline-flex', alignItems: 'center', gap: '4px',
          padding: '2px 6px', fontSize: '9px', fontWeight: 500,
          background: 'rgba(35, 26, 17, 0.05)',
          color: 'var(--fg-muted)', letterSpacing: '0.05em',
          fontFamily: "'DM Sans', sans-serif",
        }}>
          <span style={{ fontSize: '8px', opacity: 0.6 }}>✦</span>
          {MODEL_LABEL[modelProvider].split(' ')[0]} {res.copyMode === 'ai-original' ? '瞎编' : '搬运'}
        </span>
      </div>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        {res.status === 'loading' ? (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '12px' }}>
            <Loader2 className="animate-spin" size={18} style={{ color: 'var(--fg-subtle)' }} />
            <p style={{ fontSize: '11px', color: 'var(--fg-subtle)' }}>{res.statusMessage}</p>
            <button
               onClick={onStop}
               style={{ fontSize: '10px', color: 'var(--fg-muted)', border: '1px solid var(--border)', padding: '2px 8px', borderRadius: '4px' }}
            >
              停止
            </button>
          </div>
        ) : res.status === 'error' ? (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
            <p style={{ fontSize: '11px', color: '#c83c3c', textAlign: 'center' }}>{res.error}</p>
            <button
               onClick={onRegenerate}
               style={{ fontSize: '10px', color: 'var(--fg)', border: '1px solid var(--border-strong)', padding: '2px 8px', borderRadius: '4px' }}
            >
              重试
            </button>
          </div>
        ) : (
          <>
            <div style={{
              marginBottom: '1.25rem',
              flex: 1
            }}>
              {res.copyMode === 'quote-style' ? (
                <>
                  <div style={{
                    fontSize: '14.5px',
                    lineHeight: 1.7,
                    color: 'var(--fg)',
                    fontFamily: "'LXGW WenKai', serif",
                    letterSpacing: '0.02em'
                  }}>
                    {mainText}
                  </div>
                  {attribution && (
                    <div style={{
                      textAlign: 'right',
                      marginTop: '12px',
                      fontSize: '11px',
                      color: 'var(--fg-subtle)',
                      fontStyle: 'italic',
                      fontFamily: "'Playfair Display', serif",
                      opacity: 0.8
                    }}>
                      — {attribution}
                    </div>
                  )}
                </>
              ) : (
                <div style={{
                  fontSize: '14.5px',
                  lineHeight: 1.7,
                  color: 'var(--fg)',
                  fontFamily: "'LXGW WenKai', serif",
                  whiteSpace: 'pre-wrap',
                  letterSpacing: '0.01em'
                }}>
                  {mainText}
                </div>
              )}
            </div>

                  <div className="flex flex-wrap gap-x-4 gap-y-2 justify-end pt-3">
                     <ActionButton icon={isExporting ? <Loader2 className="animate-spin" size={11} /> : <Download size={11} />} label={isExporting ? '导出中' : '导出'} onClick={onExport} primary />
                     <ActionButton icon={<RefreshCw size={11} />} label="换一条" onClick={onRegenerate} />
                     <ActionButton icon={isCopied ? <Check size={11} /> : <Copy size={11} />} label={isCopied ? '已复制' : '复制'} onClick={onCopy} success={isCopied} />
                  </div>
          </>
        )}
      </div>

      {sourceImage && res.status === 'success' && res.result && (
        <ExportCardTemplate id={res.id} previewUrl={sourceImage.previewUrl} result={res.result} copyMode={res.copyMode} />
      )}
    </motion.div>
  );
}

function ActionButton({ icon, label, onClick, primary, success }: { icon: React.ReactNode, label: string, onClick: () => void, primary?: boolean, success?: boolean }) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px',
        fontSize: '11px',
        fontFamily: "'DM Sans', sans-serif",
        padding: '12px 4px',
        minHeight: '44px',
        background: 'none',
        border: 'none',
        borderBottom: '1.5px solid',
        cursor: 'pointer',
        color: success ? '#3c8c50' : (primary ? 'var(--fg)' : 'var(--fg-muted)'),
        borderBottomColor: success ? '#3c8c50' : (primary ? 'var(--fg)' : 'var(--border)'),
        transition: 'all 0.18s ease',
        touchAction: 'manipulation',
      }}
    >
      {icon}
      {label}
    </button>
  );
}
