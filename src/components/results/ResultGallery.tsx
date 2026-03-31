"use client";

import React, { useState } from 'react';
import { ImageItem, CopyMode, ModelProvider } from '../../hooks/useImageProcessor';
import { motion, AnimatePresence } from 'framer-motion';
import { ResultCard } from './ResultCard';
import html2canvas from 'html2canvas';
import { AlertCircle, CheckCircle2, Info } from 'lucide-react';

interface ResultGalleryProps {
  images: ImageItem[];
  setImages: React.Dispatch<React.SetStateAction<ImageItem[]>>;
  removeImage: (id: string) => void;
  stopGeneration: (id: string) => void;
  copyMode: CopyMode;
  modelProvider: ModelProvider;
  regenerateImage: (id: string) => void;
  setPreviewImage: (url: string) => void;
  MAX_IMAGES: number;
  toast: { message: string; type: 'info' | 'error' | 'success' } | null;
}

export function ResultGallery({
  images,
  setImages,
  removeImage,
  stopGeneration,
  copyMode,
  modelProvider,
  regenerateImage,
  setPreviewImage,
  MAX_IMAGES,
  toast,
}: ResultGalleryProps) {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [exportModalImage, setExportModalImage] = useState<string | null>(null);
  const [exportGuidance, setExportGuidance] = useState<string | null>(null);

  const copyToClipboard = async (text: string, id: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (err) {
      console.error('Failed to copy text', err);
    }
  };

  const handleExport = async (id: string) => {
    console.log('[Export] handleExport called with id:', id);
    const wrapper = document.getElementById(`export-wrapper-${id}`);
    const node = document.getElementById(`export-card-${id}`);
    console.log('[Export] wrapper:', wrapper, 'node:', node);
    if (!node || !wrapper) {
      console.error('[Export] ABORT: wrapper or node not found in DOM!');
      return;
    }

    const currentParent = wrapper.parentNode;
    const nextSibling = wrapper.nextSibling;

    try {
      await document.fonts.ready;

      // Ensure the image inside the export template is fully loaded before taking screenshot
      const imgEl = node.querySelector('img') as HTMLImageElement | null;
      if (imgEl) {
        await new Promise<void>((resolve) => {
          if (imgEl.complete && imgEl.naturalWidth > 0) {
            resolve();
            return;
          }
          imgEl.onload = () => resolve();
          imgEl.onerror = () => resolve(); // prevent hang on error
        });
      }

      // Temporarily move the wrapper to body to escape any CSS `transform` stacking contexts from parent cards
      document.body.appendChild(wrapper);

      wrapper.style.position = 'fixed';
      wrapper.style.left = '0';
      wrapper.style.top = '0';
      wrapper.style.opacity = '1'; // Must be 1 — opacity:0 on parent causes html2canvas to produce blank output
      wrapper.style.zIndex = '-9999'; // Behind all page content, invisible to user
      wrapper.style.pointerEvents = 'none';

      await new Promise(resolve => requestAnimationFrame(resolve));
      await new Promise(resolve => setTimeout(resolve, 200));

      const canvas = await html2canvas(node, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#FAF9F6',
        logging: false,
      });

      // Cleanup CSS
      wrapper.style.position = 'absolute';
      wrapper.style.left = '-9999px';
      wrapper.style.top = '-9999px';
      wrapper.style.opacity = '0';
      wrapper.style.zIndex = '-1';
      
      // Restore to original DOM position
      if (currentParent) {
        currentParent.insertBefore(wrapper, nextSibling);
      }

      const dataUrl = canvas.toDataURL('image/png');
      const filename = `时间胶囊-${Date.now()}.png`;

      // ── Cross-Platform Export Logic ──
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
      const isAndroid = /Android/.test(navigator.userAgent);
      const isMobile = isIOS || isAndroid;

      if (isMobile) {
        let nativeShareSuccess = false;
        try {
          const res = await fetch(dataUrl);
          const blob = await res.blob();
          const file = new File([blob], filename, { type: 'image/png' });
          
          if (navigator.canShare && navigator.canShare({ files: [file] })) {
             if (isIOS) {
               setExportGuidance('💡 提示：在弹出菜单中选择「存储图像」即可保存');
             }
             await navigator.share({
               files: [file],
               title: '时间胶囊'
             });
             nativeShareSuccess = true;
          }
        } catch (shareErr) {
          console.warn('[Export] Web Share API failed/aborted, falling back to modal', shareErr);
        } finally {
          setTimeout(() => setExportGuidance(null), 1000); // clear toast after native sheet handles it
        }

        if (!nativeShareSuccess) {
           // Provide fallback UI for Webview (WeChat) or Timeout
           setExportModalImage(dataUrl);
        }
        return;
      }

      // Desktop Flow
      const link = document.createElement('a');
      link.download = filename;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error('Failed to export image', err);
      if (wrapper) {
        wrapper.style.position = 'absolute';
        wrapper.style.left = '-9999px';
        wrapper.style.top = '-9999px';
        wrapper.style.opacity = '0';
        wrapper.style.zIndex = '-1';
        if (currentParent) {
          currentParent.insertBefore(wrapper, nextSibling);
        }
      }
    }
  };

  if (images.length === 0) return null;

  return (
    <section>
      {/* Section header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '1.75rem',
        paddingBottom: '1.25rem',
        borderBottom: '1px solid var(--border)',
      }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px' }}>
          <h2 style={{
            fontSize: '13px',
            fontWeight: 500,
            color: 'var(--fg)',
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            fontFamily: "'DM Sans', sans-serif",
          }}>
            创作结果
          </h2>
          <span style={{
            fontSize: '11px',
            color: 'var(--fg-subtle)',
            fontFamily: "'Playfair Display', serif",
            fontStyle: 'italic',
          }}>
            {images.length} / {MAX_IMAGES}
          </span>
        </div>
        <button
          onClick={() => setImages([])}
          style={{
            fontSize: '12px',
            color: 'var(--fg-subtle)',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            fontFamily: "'DM Sans', sans-serif",
            transition: 'color 0.18s ease',
            padding: '0',
          }}
          onMouseEnter={e => (e.currentTarget.style.color = '#ad3232')}
          onMouseLeave={e => (e.currentTarget.style.color = 'var(--fg-subtle)')}
        >
          清空
        </button>
      </div>

      {/* Grid */}
      <div 
        className="grid gap-4 sm:gap-5"
        style={{
          gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
        }}>
        {images.map((img) => (
          <ResultCard
            key={img.id}
            img={img}
            copyMode={copyMode}
            modelProvider={modelProvider}
            removeImage={removeImage}
            stopGeneration={stopGeneration}
            setPreviewImage={setPreviewImage}
            handleExport={handleExport}
            regenerateImage={regenerateImage}
            copyToClipboard={copyToClipboard}
            copiedId={copiedId}
          />
        ))}
      </div>

      {/* ── Guidance Toast ── */}
      {exportGuidance && (
        <div style={{
          position: 'fixed', top: '24px', left: '50%', transform: 'translateX(-50%)',
          background: 'rgba(30, 25, 20, 0.95)', color: 'white', padding: '12px 20px',
          borderRadius: '12px', fontSize: '13.5px', fontFamily: "'DM Sans', sans-serif",
          boxShadow: '0 8px 30px rgba(0,0,0,0.15)', zIndex: 99999,
          backdropFilter: 'blur(8px)', fontWeight: 500, whiteSpace: 'nowrap',
          animation: 'fade-in 0.3s ease', pointerEvents: 'none'
        }}>
          {exportGuidance}
        </div>
      )}

      {/* ── Fallback Image Modal for Long-Press Save ── */}
      {exportModalImage && (
        <div 
          onClick={() => setExportModalImage(null)}
          style={{
            position: 'fixed', inset: 0, background: 'rgba(15, 13, 11, 0.95)',
            backdropFilter: 'blur(10px)', zIndex: 99999, display: 'flex',
            flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            padding: '2rem', animation: 'fade-in 0.25s ease', cursor: 'pointer'
          }}
        >
          <div style={{ position: 'relative', width: '100%', maxWidth: '400px', display: 'flex', flexDirection: 'column', gap: '20px', alignItems: 'center' }}>
            <button 
               onClick={(e) => { e.stopPropagation(); setExportModalImage(null); }}
               style={{ position: 'absolute', top: '-44px', right: '0', background: 'none', border: 'none', color: 'white', opacity: 0.6, cursor: 'pointer', padding: '5px' }}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
            </button>
            <img 
               src={exportModalImage} alt="Exported" 
               style={{ width: '100%', height: 'auto', borderRadius: '4px', boxShadow: '0 20px 40px rgba(0,0,0,0.3)', userSelect: 'auto', WebkitUserSelect: 'auto' }}
               onClick={e => e.stopPropagation()}
            />
            <div style={{
               background: 'rgba(255,255,255,0.15)', padding: '12px 24px', borderRadius: '30px', color: 'white', fontSize: '13.5px', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '8px', backdropFilter: 'blur(4px)'
            }}>
               👆 请长按上方图片，选择「存储图像」
            </div>
          </div>
        </div>
      )}
      {/* Toast Notification */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -20, x: '-50%' }}
            animate={{ opacity: 1, y: 0, x: '-50%' }}
            exit={{ opacity: 0, y: -20, x: '-50%' }}
            style={{
              position: 'fixed',
              top: '24px',
              left: '50%',
              zIndex: 1000,
              background: 'white',
              borderRadius: '12px',
              padding: '12px 20px',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.08), 0 8px 10px -6px rgba(0, 0, 0, 0.04)',
              border: '1px solid var(--border)',
              minWidth: '280px',
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
