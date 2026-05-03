"use client";

import React, { useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

interface BottomSheetProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  maxHeight?: string;
}

export function BottomSheet({ open, onClose, title, children, maxHeight = '85svh' }: BottomSheetProps) {
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [open]);

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(20, 16, 12, 0.45)',
              backdropFilter: 'blur(2px)',
              zIndex: 200,
            }}
          />
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 32, stiffness: 320 }}
            drag="y"
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.4 }}
            onDragEnd={(_, info) => {
              if (info.offset.y > 100 || info.velocity.y > 500) onClose();
            }}
            style={{
              position: 'fixed',
              left: 0,
              right: 0,
              bottom: 0,
              zIndex: 201,
              background: 'var(--bg)',
              borderTopLeftRadius: '20px',
              borderTopRightRadius: '20px',
              maxHeight,
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 -20px 50px -10px rgba(0,0,0,0.18)',
              paddingBottom: 'env(safe-area-inset-bottom)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'center', paddingTop: '10px', paddingBottom: '6px', cursor: 'grab' }}>
              <div style={{ width: '38px', height: '4px', borderRadius: '2px', background: 'var(--border-strong)', opacity: 0.4 }} />
            </div>
            {title && (
              <div style={{
                padding: '8px 20px 16px',
                fontSize: '15px',
                fontWeight: 600,
                color: 'var(--fg)',
                fontFamily: "'DM Sans', sans-serif",
                borderBottom: '1px solid var(--border)',
              }}>
                {title}
              </div>
            )}
            <div style={{ overflowY: 'auto', flex: 1, WebkitOverflowScrolling: 'touch' }}>
              {children}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
