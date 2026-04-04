"use client";

import Image from 'next/image';
import { motion } from 'framer-motion';
import { X, Loader2, Check, ImageIcon, Download, RefreshCw, Copy } from 'lucide-react';
import { ImageItem, CopyMode, ModelProvider } from '../../hooks/useImageProcessor';
import { ExportCardTemplate } from './ExportCardTemplate';

interface ResultCardProps {
  img: ImageItem;
  copyMode: CopyMode;
  modelProvider: ModelProvider;
  removeImage: (id: string) => void;
  stopGeneration: (id: string) => void;
  setPreviewImage: (url: string) => void;
  handleExport: (id: string) => void;
  regenerateImage: (id: string) => void;
  copyToClipboard: (text: string, id: string) => void;
  copiedId: string | null;
  exportingId: string | null;
}

const MODEL_LABEL: Record<ModelProvider, string> = {
  gemini: 'Gemini 3 Flash',
  'gemini-flash': 'Gemini 3 Flash',
  qwen: 'Qwen-VL-Max',
  kimi: 'Kimi K2.5'
};

export function ResultCard({
  img,
  copyMode,
  modelProvider,
  removeImage,
  stopGeneration,
  setPreviewImage,
  handleExport,
  regenerateImage,
  copyToClipboard,
  copiedId,
  exportingId,
}: ResultCardProps) {
  const isExporting = exportingId === img.id;
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      style={{
        background: 'var(--bg)',
        border: '1px solid var(--border)',
        display: 'flex',
        flexDirection: 'column',
        transition: 'all 0.3s cubic-bezier(0.22,1,0.36,1)',
      }}
      onMouseEnter={e => {
        e.currentTarget.style.borderColor = 'var(--border-strong)';
        e.currentTarget.style.transform = 'translateY(-3px)';
        e.currentTarget.style.boxShadow = '0 12px 24px -10px rgba(40,30,20,0.06)';
      }}
      onMouseLeave={e => {
        e.currentTarget.style.borderColor = 'var(--border)';
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = 'none';
      }}
    >
      {/* ── Image area ── */}
      <div
        className="group"
        style={{
          position: 'relative',
          height: '200px',
          background: 'var(--surface)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
        }}
      >
        {img.previewUrl ? (
          <Image
            src={img.previewUrl}
            alt="Preview"
            fill
            unoptimized={true} // Blob URL 不支持 Next.js 服务端优化，需开启 unoptimized
            onClick={() => setPreviewImage(img.previewUrl)}
            style={{
              objectFit: 'contain',
              cursor: 'zoom-in',
              transition: 'transform 0.35s cubic-bezier(0.22,1,0.36,1)',
              display: 'block',
            }}
            onMouseEnter={e => (e.currentTarget.style.transform = 'scale(1.04)')}
            onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')}
          />
        ) : (
          <Loader2 size={28} style={{ color: 'var(--border-strong)', animation: 'spin 1s linear infinite' }} />
        )}

        {/* Hover overlay (pointer-events-none so clicks reach image) */}
        <div
          className="opacity-0 group-hover:opacity-100"
          style={{
            position: 'absolute',
            inset: 0,
            background: 'rgba(45, 40, 35, 0.06)',
            transition: 'opacity 0.2s ease',
            pointerEvents: 'none',
          }}
        />

        {/* Remove button */}
        {(img.status !== 'loading') && (
          <button
            onClick={() => removeImage(img.id)}
            className={['idle', 'error', 'processing-image'].includes(img.status) ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}
            style={{
              position: 'absolute',
              top: '10px',
              right: '10px',
              padding: '5px',
              background: 'rgba(45, 40, 35, 0.65)',
              color: 'var(--bg)',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'opacity 0.18s ease, background 0.18s ease',
              zIndex: 10,
            }}
            onMouseEnter={e => (e.currentTarget.style.background = 'rgba(100, 50, 40, 0.85)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'rgba(45, 40, 35, 0.65)')}
          >
            <X size={13} />
          </button>
        )}

        {/* Status tag */}
        <div style={{ position: 'absolute', top: '10px', left: '10px', zIndex: 10 }}>
          {img.status === 'processing-image' && (
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: '5px',
              padding: '3px 8px', fontSize: '10.5px', fontWeight: 500,
              background: 'rgba(70, 130, 200, 0.9)',
              color: 'white', letterSpacing: '0.04em',
            }}>
              <Loader2 size={10} style={{ animation: 'spin 1s linear infinite' }} />
              解析中
            </span>
          )}
          {img.status === 'loading' && (
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: '5px',
              padding: '3px 8px', fontSize: '10.5px', fontWeight: 500,
              background: 'rgba(45, 40, 35, 0.9)',
              color: 'white', letterSpacing: '0.04em',
            }}>
              <Loader2 size={10} style={{ animation: 'spin 1s linear infinite' }} />
              创作中
            </span>
          )}
          {img.status === 'success' && (
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: '4px',
              padding: '4px 9px', fontSize: '10px', fontWeight: 500,
              background: 'rgba(35, 26, 17, 0.75)',
              backdropFilter: 'blur(4px)',
              color: 'white', letterSpacing: '0.1em',
              fontFamily: "'DM Sans', sans-serif",
            }}>
              <span style={{ fontSize: '9px', opacity: 0.8 }}>✦</span>
              {MODEL_LABEL[modelProvider].split(' ')[0]} {copyMode === 'ai-original' ? '瞎编' : '搬运'}
            </span>
          )}
          {/* No tag for error state to keep it clean */}
        </div>
      </div>

      {/* ── Content area ── */}
      <div style={{ padding: '1.25rem 1.25rem 1rem', flex: 1, display: 'flex', flexDirection: 'column' }}>

        {/* Processing */}
        {img.status === 'processing-image' && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', paddingBottom: '1.5rem', gap: '12px' }}>
            <div
              className="scan-animate"
              style={{
                width: '48px',
                height: '3px',
                background: 'var(--surface-2)',
              }}
            />
            <p style={{ fontSize: '12px', color: 'var(--fg-subtle)' }}>正在解析压缩…</p>
          </div>
        )}

        {/* Idle */}
        {img.status === 'idle' && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', paddingBottom: '1rem', gap: '8px' }}>
            <ImageIcon size={24} style={{ color: 'var(--border-strong)' }} />
            <p style={{ fontSize: '12px', color: 'var(--fg-subtle)' }}>等待启动创作</p>
          </div>
        )}

        {/* Loading */}
        {img.status === 'loading' && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', paddingBottom: '1.5rem', gap: '14px' }}>
            <div
              className="scan-animate"
              style={{
                width: '56px',
                height: '3px',
                background: 'var(--surface-2)',
              }}
            />
            <p style={{ fontSize: '12px', color: 'var(--fg-subtle)', animation: 'pulse 2s ease-in-out infinite', marginBottom: '8px', textAlign: 'center' }}>
              {img.statusMessage || `${MODEL_LABEL[modelProvider]} 正在创作…`}
            </p>
            <button
              onClick={() => stopGeneration(img.id)}
              style={{
                fontSize: '11px',
                color: 'var(--fg-muted)',
                background: 'none',
                border: '1px solid var(--border)',
                padding: '4px 10px',
                cursor: 'pointer',
                borderRadius: '4px',
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.color = '#c83c3c';
                e.currentTarget.style.borderColor = '#c83c3c';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.color = 'var(--fg-muted)';
                e.currentTarget.style.borderColor = 'var(--border)';
              }}
            >
              停止生成
            </button>
          </div>
        )}

        {/* Error / Stopped */}
        {img.status === 'error' && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', paddingBottom: '1.5rem', gap: '14px' }}>
            <div
              className="scan-animate"
              style={{
                width: '56px',
                height: '3px',
                background: 'var(--surface-2)',
              }}
            />
            <p style={{ fontSize: '12px', color: 'var(--fg-subtle)', marginBottom: '8px', textAlign: 'center' }}>
              已手动停止
            </p>
            <button
              onClick={() => regenerateImage(img.id)}
              style={{
                fontSize: '11px',
                color: 'var(--fg)',
                background: 'none',
                border: '1px solid var(--border-strong)',
                padding: '4px 14px',
                cursor: 'pointer',
                borderRadius: '4px',
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.background = 'var(--surface)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = 'none';
              }}
            >
              重新生成
            </button>
          </div>
        )}

        {/* Success */}
        {img.status === 'success' && img.result && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', width: '100%', overflow: 'hidden', position: 'relative' }}>

            {/* Result text — left accent line */}
            <div style={{
              borderLeft: '2px solid var(--border-strong)',
              paddingLeft: '12px',
              marginBottom: '1rem',
              overflowY: 'auto',
              maxHeight: '9rem',
            }}>
              {copyMode === 'quote-style' ? (
                <>
                  <div style={{
                    fontSize: '13.5px',
                    lineHeight: 1.75,
                    color: 'var(--fg)',
                    fontFamily: "'LXGW WenKai', serif",
                  }}>
                    {img.result.split('\n\n')[0]}
                  </div>
                  {img.result.split('\n\n')[1] && (
                    <div style={{
                      textAlign: 'right',
                      marginTop: '8px',
                      fontSize: '11.5px',
                      color: 'var(--fg-subtle)',
                      fontStyle: 'italic',
                      fontFamily: "'Playfair Display', serif",
                    }}>
                      {img.result.split('\n\n')[1]}
                    </div>
                  )}
                </>
              ) : (
                <div style={{
                  fontSize: '13.5px',
                  lineHeight: 1.75,
                  color: 'var(--fg)',
                  fontFamily: "'LXGW WenKai', serif",
                  whiteSpace: 'pre-wrap',
                }}>
                  {img.result}
                </div>
              )}
            </div>


            {/* Action row — bottom-aligned via marginTop: auto */}
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', paddingTop: '0.75rem', marginTop: 'auto', flexWrap: 'wrap' }}>
              {[
                {
                  label: isExporting ? '生成中...' : '导出图片',
                  icon: isExporting
                    ? <Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} />
                    : <Download size={12} />,
                  onClick: () => { if (!isExporting) handleExport(img.id); },
                  primary: true,
                  disabled: isExporting,
                },
                {
                  label: '重新生成',
                  icon: <RefreshCw size={12} />,
                  onClick: () => regenerateImage(img.id),
                  primary: false,
                },
                {
                  label: copiedId === img.id ? '已复制' : '复制文案',
                  icon: copiedId === img.id ? <Check size={12} /> : <Copy size={12} />,
                  onClick: () => copyToClipboard(img.result!, img.id),
                  primary: false,
                  success: copiedId === img.id,
                },
              ].map(({ label, icon, onClick, primary, success }) => (
                <button
                  key={label}
                  onClick={onClick}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '5px',
                    fontSize: '11.5px',
                    fontWeight: 500,
                    fontFamily: "'DM Sans', sans-serif",
                    padding: '5px 0',
                    background: 'none',
                    border: 'none',
                    borderBottom: '1px solid',
                    cursor: 'pointer',
                    color: success
                      ? '#3c8c50'
                      : primary
                        ? 'var(--fg)'
                        : 'var(--fg-muted)',
                    borderBottomColor: success
                      ? '#3c8c50'
                      : primary
                        ? 'var(--fg)'
                        : 'var(--border)',
                    transition: 'color 0.18s ease, border-color 0.18s ease',
                  }}
                  onMouseEnter={e => {
                    if (!success) {
                      e.currentTarget.style.color = 'var(--fg)';
                      e.currentTarget.style.borderBottomColor = 'var(--fg)';
                    }
                  }}
                  onMouseLeave={e => {
                    if (!success) {
                      e.currentTarget.style.color = primary ? 'var(--fg)' : 'var(--fg-muted)';
                      e.currentTarget.style.borderBottomColor = primary ? 'var(--fg)' : 'var(--border)';
                    }
                  }}
                >
                  {icon}
                  {label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Export template — must live outside overflow:hidden containers for html2canvas */}
      {img.status === 'success' && img.result && (
        <ExportCardTemplate id={img.id} previewUrl={img.previewUrl} result={img.result} copyMode={copyMode} />
      )}
    </motion.div>
  );
}
