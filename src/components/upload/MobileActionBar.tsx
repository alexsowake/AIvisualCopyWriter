"use client";

import React from 'react';
import { Loader2, Sparkles, Sliders } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';

interface MobileActionBarProps {
  imagesCount: number;
  isGlobalGenerating: boolean;
  processImages: () => Promise<void>;
  onOpenSettings: () => void;
}

export function MobileActionBar({
  imagesCount,
  isGlobalGenerating,
  processImages,
  onOpenSettings,
}: MobileActionBarProps) {
  const isVisible = imagesCount > 0;

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          className="lg:hidden fixed bottom-0 left-0 right-0 z-[100]"
          style={{
            background: 'linear-gradient(to top, var(--bg) 70%, transparent)',
            paddingLeft: '16px',
            paddingRight: '16px',
            paddingTop: '14px',
            paddingBottom: 'calc(16px + env(safe-area-inset-bottom))',
            pointerEvents: 'none',
          }}
        >
          <div
            className="pointer-events-auto"
            style={{
              display: 'flex',
              gap: '10px',
              maxWidth: '480px',
              margin: '0 auto',
            }}
          >
            <button
              type="button"
              onClick={onOpenSettings}
              aria-label="生成参数"
              style={{
                flex: '0 0 auto',
                width: '52px',
                height: '52px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'var(--surface)',
                color: 'var(--fg)',
                border: '1px solid var(--border)',
                borderRadius: '100px',
                cursor: 'pointer',
                boxShadow: '0 8px 20px -8px rgba(0,0,0,0.12)',
              }}
              onPointerDown={e => (e.currentTarget.style.transform = 'scale(0.94)')}
              onPointerUp={e => (e.currentTarget.style.transform = 'scale(1)')}
            >
              <Sliders size={18} />
            </button>

            <button
              onClick={processImages}
              disabled={isGlobalGenerating}
              style={{
                flex: 1,
                minHeight: '52px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '10px',
                fontSize: '15px',
                fontWeight: 600,
                fontFamily: "'DM Sans', sans-serif",
                letterSpacing: '0.02em',
                color: 'var(--bg)',
                background: 'var(--fg)',
                border: 'none',
                borderRadius: '100px',
                cursor: isGlobalGenerating ? 'not-allowed' : 'pointer',
                boxShadow: '0 12px 24px -6px rgba(0,0,0,0.2)',
                transition: 'transform 0.2s ease',
              }}
              onPointerDown={e => (e.currentTarget.style.transform = 'scale(0.97)')}
              onPointerUp={e => (e.currentTarget.style.transform = 'scale(1)')}
            >
              {isGlobalGenerating ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  <span>AI 创作中...</span>
                </>
              ) : (
                <>
                  <Sparkles size={18} />
                  <span>开始智能创作</span>
                  <span
                    style={{
                      fontSize: '12px',
                      opacity: 0.8,
                      fontWeight: 400,
                      background: 'rgba(255,255,255,0.2)',
                      padding: '2px 8px',
                      borderRadius: '10px',
                    }}
                  >
                    {imagesCount}
                  </span>
                </>
              )}
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
