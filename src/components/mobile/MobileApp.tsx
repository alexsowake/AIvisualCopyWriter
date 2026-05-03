"use client";

import React, { useState, useCallback } from 'react';
import { CapsuleLogo } from '../common/Branding';
import { MobileUploadStage } from './MobileUploadStage';
import { MobileSettingsSheet } from './MobileSettingsSheet';
import { MobileResultList } from './MobileResultList';
import { MobileActionBar } from '../upload/MobileActionBar';
import { ImageItem, CopyMode, ModelProvider } from '../../hooks/useImageProcessor';

interface MobileAppProps {
  images: ImageItem[];
  copyMode: CopyMode;
  setCopyMode: (mode: CopyMode) => void;
  stylePrompt: string;
  setStylePrompt: (prompt: string) => void;
  modelProvider: ModelProvider;
  isGlobalGenerating: boolean;
  handleFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleDrop: (e: React.DragEvent<HTMLElement>) => void;
  removeImage: (id: string) => void;
  clearAllImages: () => void;
  stopGeneration: (id: string) => void;
  processImages: () => Promise<void>;
  regenerateImage: (id: string) => void;
  toast: { message: string; type: 'info' | 'error' | 'success' } | null;
  showToast: (message: string, type: 'info' | 'error' | 'success') => void;
  setPreviewImage: (url: string) => void;
  MAX_IMAGES: number;
}

export function MobileApp(props: MobileAppProps) {
  const {
    images,
    copyMode, setCopyMode,
    stylePrompt, setStylePrompt,
    modelProvider,
    isGlobalGenerating,
    handleFileSelect,
    handleDrop,
    removeImage,
    clearAllImages,
    stopGeneration,
    processImages,
    regenerateImage,
    toast, showToast,
    setPreviewImage,
    MAX_IMAGES,
  } = props;

  const [settingsOpen, setSettingsOpen] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const hasImages = images.length > 0;

  const handleDragOver = useCallback((e: React.DragEvent<HTMLElement>) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);
  const handleDragLeave = useCallback((e: React.DragEvent<HTMLElement>) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);
  const onDrop = useCallback((e: React.DragEvent<HTMLElement>) => {
    setIsDragging(false);
    handleDrop(e);
  }, [handleDrop]);

  return (
    <div style={{ minHeight: '100svh', background: 'var(--bg)' }}>

      {/* ── Header ── */}
      <header
        className="sticky top-0 z-40"
        style={{
          background: 'rgba(250, 249, 246, 0.92)',
          backdropFilter: 'blur(10px)',
          WebkitBackdropFilter: 'blur(10px)',
          borderBottom: '1px solid var(--border)',
          paddingTop: 'env(safe-area-inset-top)',
        }}
      >
        <div style={{
          height: '52px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 16px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <CapsuleLogo />
            <span
              className="font-display-zh"
              style={{ fontSize: '15px', fontWeight: 500, color: 'var(--fg)', letterSpacing: '0.04em' }}
            >
              时间胶囊
            </span>
          </div>
          <span
            className="font-display-en"
            style={{ fontStyle: 'italic', fontSize: '11px', color: 'var(--fg-subtle)', letterSpacing: '0.04em' }}
          >
            AI Visual Copywriter
          </span>
        </div>
      </header>

      <main>
        {!hasImages ? (
          /* ── Empty state: Hero + mode toggle + upload card ── */
          <div style={{
            minHeight: 'calc(100svh - 52px)',
            display: 'flex',
            flexDirection: 'column',
            padding: '0 16px',
            paddingBottom: '32px',
          }}>

            {/* Hero */}
            <div style={{ flex: '0 0 auto', paddingTop: '36px', paddingBottom: '28px' }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                marginBottom: '16px',
              }}>
                <div style={{ width: '20px', height: '1px', background: 'var(--fg)' }} />
                <span style={{
                  fontFamily: "'DM Sans', sans-serif",
                  fontSize: '10px',
                  letterSpacing: '0.18em',
                  color: 'var(--fg-muted)',
                  textTransform: 'uppercase',
                }}>
                  AI Visual Copywriting
                </span>
              </div>

              <h1
                className="font-display-zh"
                style={{
                  fontSize: 'clamp(2.6rem, 14vw, 4rem)',
                  lineHeight: 1.08,
                  letterSpacing: '-0.01em',
                  color: 'var(--fg)',
                  fontWeight: 400,
                  marginBottom: '12px',
                }}
              >
                听照片<br />开口说话
              </h1>

              <p
                className="font-display-en"
                style={{
                  fontStyle: 'italic',
                  fontSize: '14px',
                  color: 'var(--fg-muted)',
                  lineHeight: 1.65,
                  fontWeight: 400,
                }}
              >
                上传照片，AI 为你创作独特的极简旁白。
              </p>
            </div>

            {/* Mode toggle */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
              {(['ai-original', 'quote-style'] as CopyMode[]).map(mode => {
                const active = copyMode === mode;
                return (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setCopyMode(mode)}
                    style={{
                      flex: 1,
                      minHeight: '40px',
                      padding: '8px 10px',
                      fontSize: '13px',
                      fontWeight: active ? 500 : 400,
                      fontFamily: "'DM Sans', sans-serif",
                      color: active ? 'var(--bg)' : 'var(--fg-muted)',
                      background: active ? 'var(--fg)' : 'var(--surface)',
                      border: '1px solid',
                      borderColor: active ? 'var(--fg)' : 'var(--border)',
                      borderRadius: '10px',
                      cursor: 'pointer',
                      transition: 'all 0.18s ease',
                    }}
                  >
                    {mode === 'ai-original' ? 'AI 原创旁白' : '经典引文匹配'}
                  </button>
                );
              })}
            </div>

            {/* Mode description */}
            <p style={{
              fontSize: '12.5px',
              color: 'var(--fg-subtle)',
              lineHeight: 1.65,
              marginBottom: '16px',
              marginTop: '-8px',
            }}>
              {copyMode === 'ai-original'
                ? 'AI 根据画面意境，原创一句极简旁白'
                : '从文学、电影台词、歌词中匹配最契合的引文'}
            </p>

            {/* Style prompt */}
            <div style={{ marginBottom: '16px' }}>
              <label htmlFor="mobile-style-prompt-home" style={{
                display: 'block',
                fontSize: '12px',
                color: 'var(--fg-muted)',
                marginBottom: '8px',
                letterSpacing: '0.02em',
              }}>
                {copyMode === 'ai-original' ? '风格补充' : '附加要求'}
                <span style={{ color: 'var(--fg-subtle)', fontWeight: 300, marginLeft: '4px' }}>（可选）</span>
              </label>
              <textarea
                id="mobile-style-prompt-home"
                rows={2}
                value={stylePrompt}
                onChange={e => setStylePrompt(e.target.value)}
                placeholder={
                  copyMode === 'ai-original'
                    ? '例如：更幽默一点、使用第二人称……'
                    : '例如：偏好日本文学、只选电影台词……'
                }
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  fontSize: '16px',
                  fontFamily: "'DM Sans', sans-serif",
                  color: 'var(--fg)',
                  background: 'var(--surface)',
                  border: '1px solid var(--border)',
                  borderRadius: '12px',
                  resize: 'none',
                  outline: 'none',
                  lineHeight: 1.6,
                }}
              />
            </div>

            {/* Upload card — compact rectangle, thumb-friendly position */}
            <label
              htmlFor="mobile-file-upload"
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={onDrop}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '14px',
                height: '160px',
                border: `1.5px dashed ${isDragging ? 'var(--fg)' : 'var(--border-strong)'}`,
                borderRadius: '18px',
                background: isDragging ? 'var(--accent-dim)' : 'var(--surface)',
                cursor: 'pointer',
                transition: 'all 0.22s ease',
              }}
            >
              <svg
                width="36" height="36"
                viewBox="0 0 36 36"
                fill="none"
                style={{ color: isDragging ? 'var(--fg)' : 'var(--fg-muted)', transition: 'color 0.2s ease' }}
              >
                <circle cx="18" cy="18" r="14.5" stroke="currentColor" strokeWidth="1.5" />
                <circle cx="18" cy="18" r="6" stroke="currentColor" strokeWidth="1.25" />
                <line x1="18" y1="3.5" x2="18" y2="11.5" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" />
                <line x1="18" y1="24.5" x2="18" y2="32.5" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" />
              </svg>

              <div style={{ textAlign: 'center' }}>
                <p style={{ fontSize: '15px', fontWeight: 500, color: 'var(--fg)', marginBottom: '4px' }}>
                  点击添加照片
                </p>
                <p style={{ fontSize: '12px', color: 'var(--fg-subtle)' }}>
                  PNG · JPG · WEBP · HEIC，最多 {MAX_IMAGES} 张
                </p>
              </div>

              <input
                id="mobile-file-upload"
                type="file"
                multiple
                accept="image/*,.heic,.heif"
                style={{ display: 'none' }}
                onChange={handleFileSelect}
              />
            </label>

            {/* Bottom hint */}
            <p style={{
              marginTop: '20px',
              textAlign: 'center',
              fontSize: '11.5px',
              color: 'var(--fg-subtle)',
              fontFamily: "'DM Sans', sans-serif",
              letterSpacing: '0.02em',
            }}>
              上传后点击「开始创作」生成文案
            </p>
          </div>
        ) : (
          /* ── Has images: compact mode toggle + thumbnail strip + results ── */
          <>
            <div style={{ display: 'flex', gap: '8px', padding: '12px 16px 4px' }}>
              {(['ai-original', 'quote-style'] as CopyMode[]).map(mode => {
                const active = copyMode === mode;
                return (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setCopyMode(mode)}
                    style={{
                      flex: 1,
                      minHeight: '40px',
                      padding: '8px 10px',
                      fontSize: '13px',
                      fontWeight: active ? 500 : 400,
                      fontFamily: "'DM Sans', sans-serif",
                      color: active ? 'var(--bg)' : 'var(--fg-muted)',
                      background: active ? 'var(--fg)' : 'var(--surface)',
                      border: '1px solid',
                      borderColor: active ? 'var(--fg)' : 'var(--border)',
                      borderRadius: '10px',
                      cursor: 'pointer',
                      transition: 'all 0.18s ease',
                    }}
                  >
                    {mode === 'ai-original' ? 'AI 原创旁白' : '经典引文匹配'}
                  </button>
                );
              })}
            </div>

            <MobileUploadStage
              images={images}
              handleFileSelect={handleFileSelect}
              removeImage={removeImage}
              isDragging={isDragging}
              handleDragOver={handleDragOver}
              handleDragLeave={handleDragLeave}
              handleDrop={onDrop}
              MAX_IMAGES={MAX_IMAGES}
            />

            <MobileResultList
              images={images}
              removeImage={removeImage}
              stopGeneration={stopGeneration}
              copyMode={copyMode}
              modelProvider={modelProvider}
              regenerateImage={regenerateImage}
              setPreviewImage={setPreviewImage}
              clearAllImages={clearAllImages}
              MAX_IMAGES={MAX_IMAGES}
              toast={toast}
              showToast={showToast}
            />
          </>
        )}
      </main>

      <MobileActionBar
        imagesCount={images.length}
        isGlobalGenerating={isGlobalGenerating}
        processImages={processImages}
        onOpenSettings={() => setSettingsOpen(true)}
      />

      <MobileSettingsSheet
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        copyMode={copyMode}
        setCopyMode={setCopyMode}
        stylePrompt={stylePrompt}
        setStylePrompt={setStylePrompt}
        processImages={processImages}
        isGlobalGenerating={isGlobalGenerating}
        imagesCount={images.length}
      />
    </div>
  );
}
