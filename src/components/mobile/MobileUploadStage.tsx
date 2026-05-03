"use client";

import React from 'react';
import Image from 'next/image';
import { Plus, X } from 'lucide-react';
import { ImageItem } from '../../hooks/useImageProcessor';

interface MobileUploadStageProps {
  images: ImageItem[];
  handleFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
  removeImage: (id: string) => void;
  isDragging: boolean;
  handleDragOver: (e: React.DragEvent<HTMLElement>) => void;
  handleDragLeave: (e: React.DragEvent<HTMLElement>) => void;
  handleDrop: (e: React.DragEvent<HTMLElement>) => void;
  MAX_IMAGES: number;
}

export function MobileUploadStage({
  images,
  handleFileSelect,
  removeImage,
  MAX_IMAGES,
}: MobileUploadStageProps) {
  const canAddMore = images.length < MAX_IMAGES;

  return (
    <div style={{ padding: '12px 16px 4px' }}>
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: '8px',
      }}>
        {images.map(img => (
          <div
            key={img.id}
            style={{
              position: 'relative',
              aspectRatio: '1 / 1',
              borderRadius: '12px',
              overflow: 'hidden',
              background: 'var(--surface)',
              border: '1px solid var(--border)',
            }}
          >
            {img.previewUrl && (
              <Image
                src={img.previewUrl}
                alt=""
                fill
                unoptimized
                style={{ objectFit: 'cover' }}
              />
            )}
            <button
              onClick={() => removeImage(img.id)}
              aria-label="删除"
              style={{
                position: 'absolute',
                top: '5px',
                right: '5px',
                width: '26px',
                height: '26px',
                borderRadius: '50%',
                background: 'rgba(20, 16, 12, 0.68)',
                color: 'white',
                border: 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                padding: 0,
              }}
            >
              <X size={13} />
            </button>
          </div>
        ))}

        {canAddMore && (
          <label
            htmlFor="mobile-file-upload-more"
            style={{
              aspectRatio: '1 / 1',
              borderRadius: '12px',
              border: '1.5px dashed var(--border-strong)',
              background: 'var(--surface)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: 'var(--fg-muted)',
            }}
          >
            <Plus size={22} />
            <input
              id="mobile-file-upload-more"
              type="file"
              multiple
              accept="image/*,.heic,.heif"
              style={{ display: 'none' }}
              onChange={handleFileSelect}
            />
          </label>
        )}
      </div>
    </div>
  );
}
