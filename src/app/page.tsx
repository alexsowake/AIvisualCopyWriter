"use client";

import React, { useState, useCallback } from 'react';
import { useImageProcessor } from '../hooks/useImageProcessor';
import { HeroSection } from '../components/landing/HeroSection';
import { UploadWorkspace } from '../components/upload/UploadWorkspace';
import { ResultGallery } from '../components/results/ResultGallery';
import { Header } from '../components/common/Header';
import { Footer } from '../components/common/Footer';
import { MobileActionBar } from '../components/upload/MobileActionBar';
import { ImagePreviewModal } from '../components/common/ImagePreviewModal';

/* ─────────────────────────────────────────
   Logo: A time-capsule SVG mark
   - Vertical pill outline (the sealed capsule)
   - Mid-equator dividing line
   - Upper porthole circle (window / viewer)
   - Three lower dots (time / film frames)
───────────────────────────────────────── */
export default function VisualCopywriter() {
  const {
    images,
    setImages,
    stylePrompt,
    setStylePrompt,
    modelProvider,
    setModelProvider,
    copyMode,
    setCopyMode,
    isGlobalGenerating,
    handleFileSelect,
    handleDrop,
    removeImage,
    processImages,
    regenerateImage
  } = useImageProcessor();

  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState<boolean>(false);

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
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>

      {/* ── Header ── */}
      <Header />

      <HeroSection />

      <main id="upload-area" style={{ background: 'var(--bg)' }}>
        <div className="max-w-5xl mx-auto px-6 py-16 space-y-16">

          <UploadWorkspace
            copyMode={copyMode}
            setCopyMode={setCopyMode}
            stylePrompt={stylePrompt}
            setStylePrompt={setStylePrompt}
            modelProvider={modelProvider}
            setModelProvider={setModelProvider}
            processImages={processImages}
            isGlobalGenerating={isGlobalGenerating}
            imagesCount={images.length}
            handleFileSelect={handleFileSelect}
            isDragging={isDragging}
            handleDragOver={handleDragOver}
            handleDragLeave={handleDragLeave}
            handleDrop={onDrop}
          />

          <div id="results-section">
            <ResultGallery
              images={images}
              setImages={setImages}
              removeImage={removeImage}
              copyMode={copyMode}
              modelProvider={modelProvider}
              regenerateImage={regenerateImage}
              setPreviewImage={setPreviewImage}
            />
          </div>
        </div>
      </main>

      {/* ── Footer ── */}
      <Footer />

      {/* ── Mobile Sticky Action Bar ── */}
      <div className="lg:hidden">
        <MobileActionBar 
          imagesCount={images.length}
          isGlobalGenerating={isGlobalGenerating}
          processImages={processImages}
        />
      </div>

      {/* ── Image Preview Modal ── */}
      {previewImage && (
        <ImagePreviewModal
          previewImage={previewImage}
          onClose={() => setPreviewImage(null)}
        />
      )}
    </div>
  );
}
