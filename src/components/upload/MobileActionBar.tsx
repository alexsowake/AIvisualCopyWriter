"use client";

import React from 'react';
import { Loader2, Sparkles } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';

interface MobileActionBarProps {
  imagesCount: number;
  isGlobalGenerating: boolean;
  processImages: () => Promise<void>;
  appMode: 'classic' | 'multi-gen';
}

export function MobileActionBar({
  imagesCount,
  isGlobalGenerating,
  processImages,
  appMode,
}: MobileActionBarProps) {
  // Only show if there are images and we're not currently generating (though we could show during generating as well)
  const isVisible = imagesCount > 0;

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          className="lg:hidden fixed bottom-0 left-0 right-0 z-[100] px-4 pb-8 pt-4"
          style={{
            background: 'linear-gradient(to top, var(--bg) 60%, transparent)',
            pointerEvents: 'none',
          }}
        >
          <div 
            className="max-w-md mx-auto pointer-events-auto"
            style={{
              boxShadow: '0 -10px 30px -10px rgba(0,0,0,0.1)',
            }}
          >
            <button
              onClick={processImages}
              disabled={isGlobalGenerating}
              style={{
                width: '100%',
                padding: '16px 24px',
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
                transition: 'transform 0.2s ease, background 0.2s ease',
              }}
              onPointerDown={e => (e.currentTarget.style.transform = 'scale(0.96)')}
              onPointerUp={e => (e.currentTarget.style.transform = 'scale(1)')}
            >
              {isGlobalGenerating ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  <span>{appMode === 'multi-gen' ? 'AI 正在创作 6 条文案…' : 'AI 创作中...'}</span>
                </>
              ) : (
                <>
                  <Sparkles size={18} />
                  <span>{appMode === 'multi-gen' ? '一键生成 6 条文案' : '开始智能创作'}</span>
                  {appMode === 'classic' && (
                    <span 
                      style={{ 
                        fontSize: '12px', 
                        opacity: 0.8, 
                        fontWeight: 400,
                        background: 'rgba(255,255,255,0.2)',
                        padding: '2px 8px',
                        borderRadius: '10px',
                        marginLeft: '4px'
                      }}
                    >
                      {imagesCount}
                    </span>
                  )}
                </>
              )}
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
