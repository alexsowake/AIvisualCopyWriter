"use client";

import React, { useState } from 'react';
import Image from 'next/image';
import { ImageItem, CopyMode, ModelProvider } from '../../hooks/useImageProcessor';
import { motion, AnimatePresence } from 'framer-motion';
import { ResultCard } from './ResultCard';
import html2canvas from 'html2canvas';
import { AlertCircle, CheckCircle2, Info } from 'lucide-react';

interface ResultGalleryProps {
  images: ImageItem[];
  removeImage: (id: string) => void;
  stopGeneration: (id: string) => void;
  copyMode: CopyMode;
  modelProvider: ModelProvider;
  regenerateImage: (id: string) => void;
  setPreviewImage: (url: string) => void;
  clearAllImages: () => void;
  MAX_IMAGES: number;
  toast: { message: string; type: 'info' | 'error' | 'success' } | null;
  showToast: (message: string, type: 'info' | 'error' | 'success') => void;
}

export function ResultGallery({
  images,
  removeImage,
  stopGeneration,
  copyMode,
  modelProvider,
  regenerateImage,
  setPreviewImage,
  clearAllImages,
  MAX_IMAGES,
  toast,
  showToast,
}: ResultGalleryProps) {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [exportModalImage, setExportModalImage] = useState<string | null>(null);
  const [exportGuidance, setExportGuidance] = useState<string | null>(null);
  const [exportingId, setExportingId] = useState<string | null>(null);

  const copyToClipboard = async (text: string, id: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (err) {
      console.error('Failed to copy text', err);
    }
  };

  // ── 跨平台分发导出：mobile Web Share / modal fallback / desktop download ──
  const performExport = async (dataUrl: string, filename: string) => {
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    const isAndroid = /Android/.test(navigator.userAgent);
    const isMobile = isIOS || isAndroid;

    if (isMobile) {
      let nativeShareSuccess = false;
      try {
        // 用 atob() 同步转换，避免 fetch(data:...) 在部分移动浏览器中被拦截
        const arr = dataUrl.split(',');
        const mime = (arr[0].match(/:(.*?);/) ?? [])[1] ?? 'image/jpeg';
        const bstr = atob(arr[1]);
        const u8arr = new Uint8Array(bstr.length);
        for (let n = 0; n < bstr.length; n++) u8arr[n] = bstr.charCodeAt(n);
        const blob = new Blob([u8arr], { type: mime });
        const file = new File([blob], filename, { type: 'image/jpeg' });

        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          if (isIOS) {
            setExportGuidance('💡 提示：在弹出菜单中选择「存储图像」即可保存');
          }
          await navigator.share({ files: [file], title: '时间胶囊' });
          nativeShareSuccess = true;
        }
      } catch (shareErr) {
        if (shareErr instanceof Error && shareErr.name === 'AbortError') {
          // 用户主动关闭了系统分享面板，不需要降级 modal
          nativeShareSuccess = true;
        } else {
          console.warn('[Export] Web Share API failed, falling back to modal', shareErr);
        }
      } finally {
        setTimeout(() => setExportGuidance(null), 1000);
      }

      if (!nativeShareSuccess) {
        // 微信 WebView 不允许长按保存 data URL 图片，需转成 blob URL
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

    // Desktop
    const link = document.createElement('a');
    link.download = filename;
    link.href = dataUrl;
    link.click();
  };

  const handleExport = async (id: string) => {
    setExportingId(id);

    const wrapper = document.getElementById(`export-wrapper-${id}`);
    if (!wrapper) { setExportingId(null); return; }

    const imgItem = images.find(i => i.id === id);
    let originalUrl: string | null = null;
    let cloneWrapper: HTMLElement | null = null;

    try {
      await document.fonts.ready;

      // ── 深度克隆，彻底脱离 React 虚拟 DOM 控制 ──
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

      // ── 替换为原图高清版本，onerror 时回退到 previewUrl ──
      if (imgItem?.originalFile && cloneImgEl) {
        originalUrl = URL.createObjectURL(imgItem.originalFile);
        cloneImgEl.removeAttribute('srcset');
        cloneImgEl.removeAttribute('sizes');
        cloneImgEl.src = originalUrl;

        await new Promise<void>(resolve => {
          if (cloneImgEl.complete && cloneImgEl.naturalWidth > 0) { resolve(); return; }

          cloneImgEl.onload = () => resolve();

          // 原图加载失败（如非 Safari 浏览器遇到 HEIC），回退到已转换的 WebP 预览图
          cloneImgEl.onerror = () => {
            console.warn('[Export] 原图加载失败，回退使用预览图');
            cloneImgEl.src = imgItem.previewUrl ?? '';
            cloneImgEl.onload = () => resolve();
            cloneImgEl.onerror = () => resolve();
          };
        });

        await cloneImgEl.decode().catch(() => {});
      }

      // ── 自适应预裁剪（上限模式）──
      // 横屏：最宽不超过 4:3（比 4:3 更宽才裁切两侧，否则保持原比例）
      // 竖屏：最高不超过 3:4（比 3:4 更高才裁切上下，否则保持原比例；图片区域≤3:4 保证总卡片比例≥9:16）
      if (cloneImgEl && cloneImgEl.naturalWidth > 0 && cloneImgEl.naturalHeight > 0) {
        const nw = cloneImgEl.naturalWidth;
        const nh = cloneImgEl.naturalHeight;
        const isPortrait = nh > nw;
        const naturalRatio = nw / nh;
        const targetRatio = isPortrait
          ? Math.max(naturalRatio, 3 / 4)    // 竖屏：比 3:4 更高才裁；否则用原比例
          : Math.min(naturalRatio, 4 / 3);   // 横屏：比 4:3 更宽才裁；否则用原比例

        // 同步更新克隆节点图片容器的 padding-top，与实际裁剪比例一致
        if (cloneImgEl.parentElement) {
          cloneImgEl.parentElement.style.paddingTop = `${(100 / targetRatio).toFixed(2)}%`;
        }

        let sx = 0, sy = 0, sw = nw, sh = nh;
        if (nw / nh > targetRatio) {
          // 图片过宽：裁两侧，居中取中间
          sw = Math.round(nh * targetRatio);
          sx = Math.round((nw - sw) / 2);
        } else if (nw / nh < targetRatio) {
          // 图片过高：裁上下，居中取中间
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
      const filename = `时间胶囊-${Date.now()}.jpg`;
      await performExport(dataUrl, filename);

    } catch (err) {
      // ── 高清路径失败（Canvas OOM 等），降级回退 ──
      console.warn('[Export] 高清导出失败，降级回退:', err);

      try {
        await new Promise(r => requestAnimationFrame(r));
        await new Promise(r => setTimeout(r, 100));

        const cloneNode = cloneWrapper?.querySelector(`#export-card-${id}`) as HTMLElement | null;
        if (!cloneNode) throw new Error('clone node missing');

        const fallbackCanvas = await html2canvas(cloneNode, {
          scale: 2,
          useCORS: true,
          backgroundColor: '#FAF9F6',
          logging: false,
        });
        const fallbackDataUrl = fallbackCanvas.toDataURL('image/jpeg', 0.92);
        const fallbackFilename = `时间胶囊-${Date.now()}.jpg`;

        await performExport(fallbackDataUrl, fallbackFilename);
        showToast('已以标准清晰度导出', 'info');
      } catch {
        showToast('导出失败，请重试', 'error');
      }

    } finally {
      // ── 销毁克隆节点，释放 ObjectURL ──
      cloneWrapper?.remove();
      if (originalUrl) URL.revokeObjectURL(originalUrl);
      setExportingId(null);
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
          onClick={clearAllImages}
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
            exportingId={exportingId}
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
          onClick={() => {
            if (exportModalImage.startsWith('blob:')) URL.revokeObjectURL(exportModalImage);
            setExportModalImage(null);
          }}
          style={{
            position: 'fixed', inset: 0, background: 'rgba(15, 13, 11, 0.95)',
            backdropFilter: 'blur(10px)', zIndex: 99999, display: 'flex',
            flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            padding: '2rem', animation: 'fade-in 0.25s ease', cursor: 'pointer'
          }}
        >
          <div style={{ position: 'relative', width: '100%', maxWidth: '400px', display: 'flex', flexDirection: 'column', gap: '20px', alignItems: 'center' }}>
            <button
               onClick={(e) => { e.stopPropagation(); if (exportModalImage.startsWith('blob:')) URL.revokeObjectURL(exportModalImage); setExportModalImage(null); }}
               style={{ position: 'absolute', top: '-44px', right: '0', background: 'none', border: 'none', color: 'white', opacity: 0.6, cursor: 'pointer', padding: '5px' }}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
            </button>
            <Image 
               src={exportModalImage} alt="Exported" 
               width={400}
               height={600}
               unoptimized={true}
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
