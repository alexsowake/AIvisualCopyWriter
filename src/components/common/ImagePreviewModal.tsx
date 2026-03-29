import React from 'react';
import { X } from 'lucide-react';

interface ImagePreviewModalProps {
  previewImage: string;
  onClose: () => void;
}

export function ImagePreviewModal({ previewImage, onClose }: ImagePreviewModalProps) {
  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 50,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1.5rem',
        background: 'rgba(35, 26, 17, 0.88)',
        backdropFilter: 'blur(4px)',
      }}
    >
      <div style={{ position: 'relative', maxWidth: '1024px', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <button
          onClick={(e) => { e.stopPropagation(); onClose(); }}
          style={{
            position: 'absolute',
            top: '-3rem',
            right: 0,
            padding: '6px',
            color: '#e5dfda',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            opacity: 0.7,
            transition: 'opacity 0.2s',
          }}
          onMouseEnter={e => (e.currentTarget.style.opacity = '1')}
          onMouseLeave={e => (e.currentTarget.style.opacity = '0.7')}
        >
          <X size={22} />
        </button>
        <img
          src={previewImage}
          alt="Full Preview"
          onClick={(e) => e.stopPropagation()}
          style={{
            maxWidth: '100%',
            maxHeight: '85vh',
            objectFit: 'contain',
            display: 'block',
          }}
        />
      </div>
    </div>
  );
}
