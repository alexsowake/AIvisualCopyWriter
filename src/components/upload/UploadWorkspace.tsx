"use client";

import React from 'react';
import { Loader2 } from 'lucide-react';
import { CopyMode } from '../../hooks/useImageProcessor';

interface UploadWorkspaceProps {
  copyMode: CopyMode;
  setCopyMode: (mode: CopyMode) => void;
  stylePrompt: string;
  setStylePrompt: (prompt: string) => void;
  processImages: () => Promise<void>;
  isGlobalGenerating: boolean;
  imagesCount: number;
  handleFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
  isDragging: boolean;
  handleDragOver: (e: React.DragEvent<HTMLElement>) => void;
  handleDragLeave: (e: React.DragEvent<HTMLElement>) => void;
  handleDrop: (e: React.DragEvent<HTMLElement>) => void;
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
};

const FIELD_LABEL_STYLE: React.CSSProperties = {
  display: 'block',
  fontSize: '12px',
  fontWeight: 500,
  color: 'var(--fg-muted)',
  marginBottom: '10px',
  letterSpacing: '0.02em',
};

export function UploadWorkspace({
  copyMode,
  setCopyMode,
  stylePrompt,
  setStylePrompt,
  processImages,
  isGlobalGenerating,
  imagesCount,
  handleFileSelect,
  isDragging,
  handleDragOver,
  handleDragLeave,
  handleDrop,
}: UploadWorkspaceProps) {

  return (
    <div className="flex flex-col-reverse lg:grid lg:grid-cols-2 gap-8 lg:gap-20">

      {/* ── Left: Settings ── */}
      <div>
        <div style={SECTION_LABEL_STYLE}>
          <span style={{ width: '18px', height: '1px', background: 'var(--border-strong)', display: 'inline-block' }} />
          生成参数
        </div>

        {/* Copy Mode */}
        <div style={{ marginBottom: '2rem' }}>
          <span style={FIELD_LABEL_STYLE}>文案模式</span>
          <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
            {(['ai-original', 'quote-style'] as CopyMode[]).map(mode => (
              <button
                key={mode}
                type="button"
                onClick={() => setCopyMode(mode)}
                style={{
                  padding: '8px 0 8px 0',
                  fontSize: '14px',
                  fontWeight: copyMode === mode ? 500 : 400,
                  color: copyMode === mode ? 'var(--fg)' : 'var(--fg-subtle)',
                  background: 'none',
                  border: 'none',
                  borderBottom: copyMode === mode
                    ? '1.5px solid var(--fg)'
                    : '1.5px solid transparent',
                  cursor: 'pointer',
                  transition: 'all 0.18s ease',
                  fontFamily: "'DM Sans', sans-serif",
                }}
              >
                {mode === 'ai-original' ? 'AI 原创旁白' : '经典引文匹配'}
              </button>
            ))}
          </div>
          <p style={{ marginTop: '10px', fontSize: '12px', color: 'var(--fg-subtle)', lineHeight: 1.6 }}>
            {copyMode === 'ai-original'
              ? 'AI 根据画面意境，原创一句极简旁白'
              : '从文学、电影台词、歌词中匹配最契合的引文'}
          </p>
        </div>

        {/* Style Prompt */}
        <div style={{ marginBottom: '2rem' }}>
          <label htmlFor="style-prompt" style={FIELD_LABEL_STYLE}>
            {copyMode === 'ai-original' ? '风格补充' : '附加要求'}
            <span style={{ color: 'var(--fg-subtle)', fontWeight: 300, marginLeft: '4px' }}>（可选）</span>
          </label>
          <textarea
            id="style-prompt"
            rows={3}
            value={stylePrompt}
            onChange={e => setStylePrompt(e.target.value)}
            placeholder={
              copyMode === 'ai-original'
                ? '例如：更幽默一点、使用第二人称……不填则使用默认风格'
                : '例如：偏好日本文学、只选电影台词……'
            }
            style={{
              width: '100%',
              padding: '10px 0',
              fontSize: '13.5px',
              fontFamily: "'DM Sans', sans-serif",
              color: 'var(--fg)',
              background: 'transparent',
              border: 'none',
              borderBottom: '1px solid var(--border-strong)',
              borderRadius: 0,
              resize: 'vertical',
              outline: 'none',
              lineHeight: 1.65,
              transition: 'border-color 0.2s ease',
            }}
            onFocus={e => (e.target.style.borderBottomColor = 'var(--fg)')}
            onBlur={e => (e.target.style.borderBottomColor = 'var(--border-strong)')}
          />
        </div>

        {/* Generate Button */}
        <button
          onClick={processImages}
          disabled={isGlobalGenerating || imagesCount === 0}
          style={{
            width: '100%',
            padding: '13px 24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            fontSize: '13.5px',
            fontWeight: 500,
            fontFamily: "'DM Sans', sans-serif",
            letterSpacing: '0.04em',
            color: 'var(--bg)',
            background: isGlobalGenerating || imagesCount === 0 ? 'var(--border-strong)' : 'var(--fg)',
            border: 'none',
            cursor: isGlobalGenerating || imagesCount === 0 ? 'not-allowed' : 'pointer',
            transition: 'opacity 0.2s ease',
            opacity: isGlobalGenerating || imagesCount === 0 ? 0.55 : 1,
          }}
          onMouseEnter={e => { if (!isGlobalGenerating && imagesCount > 0) e.currentTarget.style.opacity = '0.85'; }}
          onMouseLeave={e => { e.currentTarget.style.opacity = isGlobalGenerating || imagesCount === 0 ? '0.55' : '1'; }}
          className="lg:mt-6"
        >
          {isGlobalGenerating ? (
            <>
              <Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} />
              {imagesCount > 1 ? 'AI 批量创作中…' : 'AI 创作中…'}
            </>
          ) : (
            '✦ 开始智能创作'
          )}
        </button>
      </div>

      {/* ── Right: Upload ── */}
      <div>
        <div style={SECTION_LABEL_STYLE}>
          <span style={{ width: '18px', height: '1px', background: 'var(--border-strong)', display: 'inline-block' }} />
          上传图片
        </div>

        <label
          htmlFor="file-upload"
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '280px',
            border: `1.5px dashed ${isDragging ? 'var(--fg)' : 'var(--border-strong)'}`,
            background: isDragging ? 'var(--accent-dim)' : 'transparent',
            cursor: 'pointer',
            transition: 'all 0.22s ease',
            padding: '2.5rem',
            gap: '1rem',
            transform: isDragging ? 'scale(1.01)' : 'scale(1)',
          }}
        >
          {/* Upload icon — a simple aperture-like circle mark */}
          <svg
            width="36" height="36"
            viewBox="0 0 36 36"
            fill="none"
            style={{
              color: isDragging ? 'var(--fg)' : 'var(--fg-subtle)',
              transition: 'color 0.2s ease, transform 0.2s ease',
              transform: isDragging ? 'scale(1.08)' : 'scale(1)',
            }}
          >
            <circle cx="18" cy="18" r="14.5" stroke="currentColor" strokeWidth="1.5" />
            <circle cx="18" cy="18" r="6" stroke="currentColor" strokeWidth="1.25" />
            <line x1="18" y1="3.5" x2="18" y2="11.5" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" />
            <line x1="18" y1="24.5" x2="18" y2="32.5" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" />
          </svg>

          <div style={{ textAlign: 'center' }}>
            <p style={{
              fontSize: '14px',
              fontWeight: 500,
              color: isDragging ? 'var(--fg)' : 'var(--fg-muted)',
              marginBottom: '4px',
              transition: 'color 0.2s ease',
            }}>
              点击此处选择文件
            </p>
            <p style={{ fontSize: '12px', color: 'var(--fg-subtle)' }}>
              或将图片拖拽至此
            </p>
          </div>

          <p style={{ fontSize: '11px', color: 'var(--fg-subtle)', letterSpacing: '0.04em' }}>
            PNG · JPG · WEBP · HEIC，最高 5MB/张
          </p>

          <input
            id="file-upload"
            name="file-upload"
            type="file"
            multiple
            accept="image/*,.heic,.heif"
            style={{ display: 'none' }}
            onChange={handleFileSelect}
          />
        </label>
      </div>

    </div>
  );
}
