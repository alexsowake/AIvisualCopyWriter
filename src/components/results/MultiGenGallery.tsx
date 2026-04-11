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
    const card = document.getElementById(`export-card-${id}`);
    if (!wrapper || !card) return;

    setExportingId(id);
    try {
      const html2canvas = (await import('html2canvas')).default;
      
      // Temporary visibility for html2canvas
      wrapper.style.opacity = '1';
      wrapper.style.pointerEvents = 'auto';
      wrapper.style.position = 'fixed';
      wrapper.style.zIndex = '9999';

      const canvas = await html2canvas(card, {
        useCORS: true,
        scale: 2,
        backgroundColor: '#ffffff',
        logging: false,
      });

      wrapper.style.opacity = '0';
      wrapper.style.pointerEvents = 'none';
      wrapper.style.position = 'absolute';
      wrapper.style.zIndex = '-1';

      const link = document.createElement('a');
      link.download = `Copywriter-${id.substring(0, 5)}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
      showToast('图片导出成功', 'success');
    } catch (err) {
      console.error('Export failed:', err);
      showToast('导出失败，请尝试截图保存', 'error');
    } finally {
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
            {originals.map(res => (
              <MultiGenCard
                key={res.id}
                res={res}
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
            {quotes.map(res => (
              <MultiGenCard
                key={res.id}
                res={res}
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
  sourceImage: ImageItem | null;
  modelProvider: ModelProvider;
  isExporting: boolean;
  isCopied: boolean;
  onExport: () => void;
  onRegenerate: () => void;
  onStop: () => void;
  onCopy: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      style={{
        background: 'var(--bg)',
        border: '1px solid var(--border)',
        padding: '1.25rem',
        display: 'flex',
        flexDirection: 'column',
        minHeight: '200px'
      }}
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
              borderLeft: '2px solid var(--border-strong)',
              paddingLeft: '12px',
              marginBottom: '1rem',
              flex: 1
            }}>
              {res.copyMode === 'quote-style' ? (
                <>
                  <div style={{ fontSize: '13px', lineHeight: 1.6, color: 'var(--fg)', fontFamily: "'LXGW WenKai', serif" }}>
                    {res.result?.split('\n\n')[0]}
                  </div>
                  {res.result?.split('\n\n')[1] && (
                    <div style={{ textAlign: 'right', marginTop: '6px', fontSize: '11px', color: 'var(--fg-subtle)', fontStyle: 'italic', fontFamily: "'Playfair Display', serif" }}>
                      {res.result.split('\n\n')[1]}
                    </div>
                  )}
                </>
              ) : (
                <div style={{ fontSize: '13px', lineHeight: 1.6, color: 'var(--fg)', fontFamily: "'LXGW WenKai', serif", whiteSpace: 'pre-wrap' }}>
                  {res.result}
                </div>
              )}
            </div>

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', paddingTop: '10px' }}>
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
        padding: '2px 0',
        background: 'none',
        border: 'none',
        borderBottom: '1px solid',
        cursor: 'pointer',
        color: success ? '#3c8c50' : (primary ? 'var(--fg)' : 'var(--fg-muted)'),
        borderBottomColor: success ? '#3c8c50' : (primary ? 'var(--fg)' : 'var(--border)'),
        transition: 'all 0.18s ease'
      }}
    >
      {icon}
      {label}
    </button>
  );
}
