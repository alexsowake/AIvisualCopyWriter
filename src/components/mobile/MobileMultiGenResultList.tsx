"use client";

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import html2canvas from 'html2canvas';
import { Loader2, Check, Download, RefreshCw, Copy, X, AlertCircle, Info, CheckCircle2 } from 'lucide-react';
import Image from 'next/image';
import { ImageItem, MultiGenResult, ModelProvider } from '../../hooks/useImageProcessor';
import { ExportCardTemplate } from '../results/ExportCardTemplate';

const MODEL_LABEL: Record<ModelProvider, string> = {
  gemini: 'Gemini 3 Flash',
  'gemini-flash': 'Gemini 3 Flash',
  qwen: 'Qwen-VL-Max',
  kimi: 'Kimi K2.5',
};

interface MobileMultiGenResultListProps {
  results: MultiGenResult[];
  sourceImage: ImageItem | null;
  modelProvider: ModelProvider;
  regenerateItem: (id: string) => void;
  stopItem: (id: string) => void;
  clearAll: () => void;
  clearAllImages: () => void;
  setPreviewImage: (url: string) => void;
  toast: { message: string; type: 'info' | 'error' | 'success' } | null;
  showToast: (message: string, type: 'info' | 'error' | 'success') => void;
}

export function MobileMultiGenResultList({
  results,
  sourceImage,
  modelProvider,
  regenerateItem,
  stopItem,
  clearAll,
  clearAllImages,
  setPreviewImage,
  toast,
  showToast,
}: MobileMultiGenResultListProps) {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [exportingId, setExportingId] = useState<string | null>(null);
  const [exportModalImage, setExportModalImage] = useState<string | null>(null);
  const [exportGuidance, setExportGuidance] = useState<string | null>(null);

  const copyToClipboard = async (text: string, id: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      showToast('复制失败，请手动选择文字', 'error');
    }
  };

  const performExport = async (dataUrl: string, filename: string) => {
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    const isAndroid = /Android/.test(navigator.userAgent);
    const isMobile = isIOS || isAndroid;

    if (isMobile) {
      let nativeShareSuccess = false;
      try {
        const arr = dataUrl.split(',');
        const mime = (arr[0].match(/:(.*?);/) ?? [])[1] ?? 'image/jpeg';
        const bstr = atob(arr[1]);
        const u8arr = new Uint8Array(bstr.length);
        for (let n = 0; n < bstr.length; n++) u8arr[n] = bstr.charCodeAt(n);
        const blob = new Blob([u8arr], { type: mime });
        const file = new File([blob], filename, { type: 'image/jpeg' });

        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          if (isIOS) setExportGuidance('💡 在弹出菜单中选择「存储图像」即可保存');
          await navigator.share({ files: [file], title: '时间胶囊' });
          nativeShareSuccess = true;
        }
      } catch (err) {
        console.warn('[Export] share failed, falling back to modal', err);
      } finally {
        setTimeout(() => setExportGuidance(null), 1000);
      }

      if (!nativeShareSuccess) {
        const isWeChat = /MicroMessenger/i.test(navigator.userAgent);
        if (isWeChat) {
          const arr = dataUrl.split(',');
          const mime = (arr[0].match(/:(.*?);/) ?? [])[1] ?? 'image/jpeg';
          const bstr = atob(arr[1]);
          const u8arr = new Uint8Array(bstr.length);
          for (let n = 0; n < bstr.length; n++) u8arr[n] = bstr.charCodeAt(n);
          setExportModalImage(URL.createObjectURL(new Blob([u8arr], { type: mime })));
        } else {
          setExportModalImage(dataUrl);
        }
      }
      return;
    }

    const link = document.createElement('a');
    link.download = filename;
    link.href = dataUrl;
    link.click();
  };

  const handleExport = async (id: string) => {
    if (!sourceImage) return;
    setExportingId(id);
    const wrapper = document.getElementById(`export-wrapper-${id}`);
    if (!wrapper) { setExportingId(null); return; }

    let cloneWrapper: HTMLElement | null = null;
    let originalUrl: string | null = null;

    try {
      await document.fonts.ready;
      cloneWrapper = wrapper.cloneNode(true) as HTMLElement;
      cloneWrapper.style.position = 'fixed';
      cloneWrapper.style.left = '0';
      cloneWrapper.style.top = '0';
      cloneWrapper.style.opacity = '1';
      cloneWrapper.style.zIndex = '-9999';
      cloneWrapper.style.pointerEvents = 'none';
      document.body.appendChild(cloneWrapper);

      const cloneNode = cloneWrapper.querySelector(`#export-card-${id}`) as HTMLElement;
      const cloneImgEl = cloneWrapper.querySelector('img') as HTMLImageElement | null;

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

      await new Promise(resolve => requestAnimationFrame(resolve));
      await new Promise(resolve => setTimeout(resolve, 300));

      const canvas = await html2canvas(cloneNode, { scale: 3, useCORS: true, backgroundColor: '#FAF9F6', logging: false });
      const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
      await performExport(dataUrl, `时间胶囊-${Date.now()}.jpg`);
    } catch (err) {
      console.warn('[Export] failed', err);
      try {
        const cloneNode = cloneWrapper?.querySelector(`#export-card-${id}`) as HTMLElement | null;
        if (!cloneNode) throw new Error('clone node missing');
        const fallbackCanvas = await html2canvas(cloneNode, { scale: 2, useCORS: true, backgroundColor: '#FAF9F6', logging: false });
        await performExport(fallbackCanvas.toDataURL('image/jpeg', 0.92), `时间胶囊-${Date.now()}.jpg`);
        showToast('已以标准清晰度导出', 'info');
      } catch {
        showToast('导出失败，请重试', 'error');
      }
    } finally {
      cloneWrapper?.remove();
      if (originalUrl) URL.revokeObjectURL(originalUrl);
      setExportingId(null);
    }
  };

  if (results.length === 0) return null;

  const originals = results.filter(r => r.copyMode === 'ai-original');
  const quotes = results.filter(r => r.copyMode === 'quote-style');
  const successCount = results.filter(r => r.status === 'success').length;

  const SectionLabel = ({ label }: { label: string }) => (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '10px',
      padding: '20px 0 12px',
    }}>
      <span style={{ width: '18px', height: '1px', background: 'var(--border-strong)', display: 'inline-block' }} />
      <span style={{
        fontSize: '11px',
        letterSpacing: '0.16em',
        textTransform: 'uppercase',
        color: 'var(--fg-subtle)',
        fontFamily: "'DM Sans', sans-serif",
      }}>{label}</span>
    </div>
  );

  return (
    <section style={{ paddingBottom: '120px' }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '20px 0 4px',
      }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
          <h2 style={{
            fontSize: '13px',
            fontWeight: 500,
            color: 'var(--fg)',
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            fontFamily: "'DM Sans', sans-serif",
          }}>创作结果</h2>
          {successCount > 0 && (
            <span style={{ fontSize: '12px', color: 'var(--fg-subtle)', fontFamily: "'Playfair Display', serif", fontStyle: 'italic' }}>
              {successCount} / {results.length}
            </span>
          )}
        </div>
        <button
          onClick={() => { clearAll(); clearAllImages(); }}
          style={{
            minHeight: '36px',
            padding: '8px 12px',
            fontSize: '13px',
            color: 'var(--fg-muted)',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            fontFamily: "'DM Sans', sans-serif",
          }}
        >清空</button>
      </div>

      {originals.length > 0 && (
        <>
          <SectionLabel label="原创区" />
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {originals.map(res => (
              <ResultCard
                key={res.id}
                res={res}
                sourceImage={sourceImage}
                modelProvider={modelProvider}
                handleExport={handleExport}
                regenerateItem={regenerateItem}
                stopItem={stopItem}
                copyToClipboard={copyToClipboard}
                copiedId={copiedId}
                isExporting={exportingId === res.id}
              />
            ))}
          </div>
        </>
      )}

      {quotes.length > 0 && (
        <>
          <SectionLabel label="引文区" />
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {quotes.map(res => (
              <ResultCard
                key={res.id}
                res={res}
                sourceImage={sourceImage}
                modelProvider={modelProvider}
                handleExport={handleExport}
                regenerateItem={regenerateItem}
                stopItem={stopItem}
                copyToClipboard={copyToClipboard}
                copiedId={copiedId}
                isExporting={exportingId === res.id}
              />
            ))}
          </div>
        </>
      )}

      {exportGuidance && (
        <div style={{
          position: 'fixed', top: 'calc(env(safe-area-inset-top) + 16px)', left: '50%', transform: 'translateX(-50%)',
          background: 'rgba(30, 25, 20, 0.95)', color: 'white', padding: '12px 18px',
          borderRadius: '12px', fontSize: '13px', fontFamily: "'DM Sans', sans-serif",
          boxShadow: '0 8px 30px rgba(0,0,0,0.18)', zIndex: 99999,
          backdropFilter: 'blur(8px)', fontWeight: 500, maxWidth: '90vw',
          textAlign: 'center', pointerEvents: 'none',
        }}>{exportGuidance}</div>
      )}

      <AnimatePresence>
        {exportModalImage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => {
              if (exportModalImage.startsWith('blob:')) URL.revokeObjectURL(exportModalImage);
              setExportModalImage(null);
            }}
            style={{
              position: 'fixed', inset: 0, background: 'rgba(15, 13, 11, 0.95)',
              backdropFilter: 'blur(10px)', zIndex: 99999, display: 'flex',
              flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              padding: '20px',
            }}
          >
            <div style={{ position: 'relative', width: '100%', maxWidth: '380px', display: 'flex', flexDirection: 'column', gap: '16px', alignItems: 'center' }}>
              <button
                onClick={(e) => { e.stopPropagation(); if (exportModalImage.startsWith('blob:')) URL.revokeObjectURL(exportModalImage); setExportModalImage(null); }}
                aria-label="关闭"
                style={{
                  position: 'absolute', top: '-52px', right: '0',
                  width: '44px', height: '44px',
                  background: 'rgba(255,255,255,0.1)', border: 'none', color: 'white',
                  borderRadius: '50%', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
              ><X size={20} /></button>
              <Image
                src={exportModalImage} alt="Exported"
                width={380} height={580} unoptimized
                style={{ width: '100%', height: 'auto', borderRadius: '12px', boxShadow: '0 20px 40px rgba(0,0,0,0.3)' }}
                onClick={e => e.stopPropagation()}
              />
              <div style={{
                background: 'rgba(255,255,255,0.15)', padding: '12px 22px', borderRadius: '30px',
                color: 'white', fontSize: '13.5px', fontWeight: 500,
                display: 'flex', alignItems: 'center', gap: '8px', backdropFilter: 'blur(4px)',
              }}>
                👆 长按图片，选择「存储图像」
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -20, x: '-50%' }}
            animate={{ opacity: 1, y: 0, x: '-50%' }}
            exit={{ opacity: 0, y: -20, x: '-50%' }}
            style={{
              position: 'fixed',
              top: 'calc(env(safe-area-inset-top) + 16px)',
              left: '50%',
              zIndex: 1000,
              background: 'white',
              borderRadius: '12px',
              padding: '12px 18px',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              boxShadow: '0 10px 25px -5px rgba(0,0,0,0.12)',
              border: '1px solid var(--border)',
              maxWidth: '90vw',
              color: 'var(--fg)',
              fontFamily: "'DM Sans', sans-serif",
              fontSize: '13.5px',
              fontWeight: 450,
            }}
          >
            {toast.type === 'error' && <AlertCircle size={18} style={{ color: '#c83c3c' }} />}
            {toast.type === 'info' && <Info size={18} style={{ color: '#4a90e2' }} />}
            {toast.type === 'success' && <CheckCircle2 size={18} style={{ color: '#2ecc71' }} />}
            {toast.message}
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}

interface ResultCardProps {
  res: MultiGenResult;
  sourceImage: ImageItem | null;
  modelProvider: ModelProvider;
  handleExport: (id: string) => void;
  regenerateItem: (id: string) => void;
  stopItem: (id: string) => void;
  copyToClipboard: (text: string, id: string) => void;
  copiedId: string | null;
  isExporting: boolean;
}

function ResultCard({
  res,
  sourceImage,
  modelProvider,
  handleExport,
  regenerateItem,
  stopItem,
  copyToClipboard,
  copiedId,
  isExporting,
}: ResultCardProps) {
  const [mainText, attribution] = (res.result ?? '').split('\n\n');

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      style={{
        background: 'var(--bg)',
        border: '1px solid var(--border)',
        borderRadius: '16px',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <div style={{ padding: '14px 16px 12px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {/* Label */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: '4px',
            padding: '3px 8px', fontSize: '10.5px', fontWeight: 500,
            background: 'rgba(35, 26, 17, 0.05)',
            color: 'var(--fg-muted)', letterSpacing: '0.05em',
            fontFamily: "'DM Sans', sans-serif",
            borderRadius: '999px',
          }}>
            <span style={{ fontSize: '8px', opacity: 0.6 }}>✦</span>
            {MODEL_LABEL[modelProvider].split(' ')[0]} {res.copyMode === 'ai-original' ? '瞎编' : '搬运'}
          </span>
        </div>

        {/* Loading */}
        {res.status === 'loading' && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', padding: '8px 0' }}>
            <div className="scan-animate" style={{ width: '60px', height: '3px', background: 'var(--surface-2)' }} />
            <p style={{ fontSize: '12.5px', color: 'var(--fg-subtle)', textAlign: 'center' }}>
              {res.statusMessage || '正在创作中…'}
            </p>
            <button
              onClick={() => stopItem(res.id)}
              style={{
                minHeight: '36px',
                fontSize: '12.5px',
                color: 'var(--fg-muted)',
                background: 'none',
                border: '1px solid var(--border)',
                padding: '6px 14px',
                borderRadius: '8px',
                cursor: 'pointer',
              }}
            >停止生成</button>
          </div>
        )}

        {/* Error */}
        {res.status === 'error' && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', padding: '8px 0' }}>
            <p style={{ fontSize: '12.5px', color: 'var(--fg-subtle)', textAlign: 'center' }}>{res.error || '出现错误'}</p>
            <button
              onClick={() => regenerateItem(res.id)}
              style={{
                minHeight: '40px',
                fontSize: '13px',
                color: 'var(--fg)',
                background: 'var(--surface)',
                border: '1px solid var(--border-strong)',
                padding: '8px 18px',
                borderRadius: '10px',
                cursor: 'pointer',
              }}
            >重新生成</button>
          </div>
        )}

        {/* Success */}
        {res.status === 'success' && res.result && (
          <>
            <div style={{ borderLeft: '2px solid var(--border-strong)', paddingLeft: '12px' }}>
              {res.copyMode === 'quote-style' ? (
                <>
                  <div style={{ fontSize: '15px', lineHeight: 1.8, color: 'var(--fg)', fontFamily: "'LXGW WenKai', serif" }}>
                    {mainText}
                  </div>
                  {attribution && (
                    <div style={{ textAlign: 'right', marginTop: '28px', fontSize: '12.5px', color: 'var(--fg-subtle)', fontStyle: 'italic', fontFamily: "'Playfair Display', serif" }}>
                      {attribution}
                    </div>
                  )}
                </>
              ) : (
                <>
                  <div style={{ fontSize: '15px', lineHeight: 1.8, color: 'var(--fg)', fontFamily: "'LXGW WenKai', serif", whiteSpace: 'pre-wrap' }}>
                    {mainText}
                  </div>
                  {attribution && (
                    <div style={{
                      marginTop: '28px',
                      fontSize: '12px',
                      color: 'var(--fg-subtle)',
                      fontFamily: "'DM Sans', sans-serif",
                      lineHeight: 1.7,
                      whiteSpace: 'pre-wrap',
                    }}>
                      {attribution}
                    </div>
                  )}
                </>
              )}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', marginTop: '4px' }}>
              <ActionButton
                icon={isExporting ? <Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} /> : <Download size={15} />}
                label={isExporting ? '生成中' : '导出'}
                onClick={() => { if (!isExporting) handleExport(res.id); }}
                primary
                disabled={isExporting}
              />
              <ActionButton
                icon={<RefreshCw size={15} />}
                label="换一条"
                onClick={() => regenerateItem(res.id)}
              />
              <ActionButton
                icon={copiedId === res.id ? <Check size={15} /> : <Copy size={15} />}
                label={copiedId === res.id ? '已复制' : '复制文案'}
                onClick={() => copyToClipboard(res.result!, res.id)}
                success={copiedId === res.id}
              />
            </div>
          </>
        )}
      </div>

      {res.status === 'success' && res.result && sourceImage && (
        <ExportCardTemplate id={res.id} previewUrl={sourceImage.previewUrl} result={res.result} copyMode={res.copyMode} />
      )}
    </motion.div>
  );
}

function ActionButton({
  icon, label, onClick, primary, success, disabled,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  primary?: boolean;
  success?: boolean;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        minHeight: '44px',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '6px',
        fontSize: '13px',
        fontWeight: 500,
        fontFamily: "'DM Sans', sans-serif",
        padding: '10px 8px',
        background: success ? 'rgba(60, 140, 80, 0.08)' : primary ? 'var(--fg)' : 'var(--surface)',
        color: success ? '#3c8c50' : primary ? 'var(--bg)' : 'var(--fg)',
        border: '1px solid',
        borderColor: success ? 'rgba(60, 140, 80, 0.3)' : primary ? 'var(--fg)' : 'var(--border)',
        borderRadius: '10px',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.6 : 1,
        transition: 'transform 0.15s ease',
      }}
      onPointerDown={e => { if (!disabled) e.currentTarget.style.transform = 'scale(0.96)'; }}
      onPointerUp={e => (e.currentTarget.style.transform = 'scale(1)')}
      onPointerLeave={e => (e.currentTarget.style.transform = 'scale(1)')}
    >
      {icon}
      {label}
    </button>
  );
}
