"use client";

import React from 'react';
import { Loader2, Sparkles } from 'lucide-react';
import { CopyMode } from '../../hooks/useImageProcessor';
import { BottomSheet } from './BottomSheet';

interface MobileSettingsSheetProps {
  open: boolean;
  onClose: () => void;
  copyMode: CopyMode;
  setCopyMode: (mode: CopyMode) => void;
  stylePrompt: string;
  setStylePrompt: (prompt: string) => void;
  processImages: () => Promise<void>;
  isGlobalGenerating: boolean;
  imagesCount: number;
}

export function MobileSettingsSheet({
  open,
  onClose,
  copyMode,
  setCopyMode,
  stylePrompt,
  setStylePrompt,
  processImages,
  isGlobalGenerating,
  imagesCount,
}: MobileSettingsSheetProps) {
  const disabled = isGlobalGenerating || imagesCount === 0;

  const handleGenerate = async () => {
    onClose();
    await processImages();
  };

  return (
    <BottomSheet open={open} onClose={onClose} title="生成参数">
      <div style={{ padding: '20px 20px 24px', display: 'flex', flexDirection: 'column', gap: '24px' }}>

        <div>
          <div style={{ fontSize: '12px', color: 'var(--fg-muted)', marginBottom: '10px', letterSpacing: '0.02em' }}>
            文案模式
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
            {(['ai-original', 'quote-style'] as CopyMode[]).map(mode => {
              const active = copyMode === mode;
              return (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setCopyMode(mode)}
                  style={{
                    minHeight: '46px',
                    padding: '10px 14px',
                    fontSize: '14px',
                    fontWeight: active ? 500 : 400,
                    color: active ? 'var(--bg)' : 'var(--fg)',
                    background: active ? 'var(--fg)' : 'var(--surface)',
                    border: '1px solid',
                    borderColor: active ? 'var(--fg)' : 'var(--border)',
                    borderRadius: '12px',
                    cursor: 'pointer',
                    transition: 'all 0.18s ease',
                    fontFamily: "'DM Sans', sans-serif",
                  }}
                >
                  {mode === 'ai-original' ? 'AI 原创旁白' : '经典引文匹配'}
                </button>
              );
            })}
          </div>
          <p style={{ marginTop: '10px', fontSize: '12.5px', color: 'var(--fg-subtle)', lineHeight: 1.6 }}>
            {copyMode === 'ai-original'
              ? 'AI 根据画面意境，原创一句极简旁白'
              : '从文学、电影台词、歌词中匹配最契合的引文'}
          </p>
        </div>

        <div>
          <label htmlFor="mobile-style-prompt" style={{ fontSize: '12px', color: 'var(--fg-muted)', marginBottom: '10px', letterSpacing: '0.02em', display: 'block' }}>
            {copyMode === 'ai-original' ? '风格补充' : '附加要求'}
            <span style={{ color: 'var(--fg-subtle)', fontWeight: 300, marginLeft: '4px' }}>（可选）</span>
          </label>
          <textarea
            id="mobile-style-prompt"
            rows={3}
            value={stylePrompt}
            onChange={e => setStylePrompt(e.target.value)}
            placeholder={
              copyMode === 'ai-original'
                ? '例如：更幽默一点、使用第二人称……'
                : '例如：偏好日本文学、只选电影台词……'
            }
            style={{
              width: '100%',
              padding: '12px 14px',
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

        <button
          onClick={handleGenerate}
          disabled={disabled}
          style={{
            width: '100%',
            minHeight: '52px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '10px',
            fontSize: '15px',
            fontWeight: 600,
            fontFamily: "'DM Sans', sans-serif",
            color: 'var(--bg)',
            background: disabled ? 'var(--border-strong)' : 'var(--fg)',
            border: 'none',
            borderRadius: '14px',
            cursor: disabled ? 'not-allowed' : 'pointer',
            opacity: disabled ? 0.6 : 1,
            transition: 'opacity 0.2s ease',
          }}
        >
          {isGlobalGenerating ? (
            <>
              <Loader2 size={18} className="animate-spin" />
              <span>AI 创作中…</span>
            </>
          ) : (
            <>
              <Sparkles size={16} />
              <span>开始智能创作</span>
              {imagesCount > 0 && (
                <span style={{
                  fontSize: '12px',
                  opacity: 0.85,
                  fontWeight: 400,
                  background: 'rgba(255,255,255,0.2)',
                  padding: '2px 8px',
                  borderRadius: '10px',
                }}>
                  {imagesCount}
                </span>
              )}
            </>
          )}
        </button>
      </div>
    </BottomSheet>
  );
}
