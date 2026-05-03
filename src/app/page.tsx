"use client";

import React, { useState, useCallback } from 'react';
import { useImageProcessor } from '../hooks/useImageProcessor';
import { HeroSection } from '../components/landing/HeroSection';
import { UploadWorkspace } from '../components/upload/UploadWorkspace';
import { ResultGallery } from '../components/results/ResultGallery';
import { Header } from '../components/common/Header';
import { Footer } from '../components/common/Footer';
import { ImagePreviewModal } from '../components/common/ImagePreviewModal';
import { MobileApp } from '../components/mobile/MobileApp';

export default function VisualCopywriter() {
  const {
    images,
    stylePrompt,
    setStylePrompt,
    modelProvider,
    copyMode,
    setCopyMode,
    isGlobalGenerating,
    handleFileSelect,
    handleDrop,
    removeImage,
    clearAllImages,
    stopGeneration,
    processImages,
    regenerateImage,
    toast,
    showToast,
    MAX_IMAGES
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
    <>
      {/* ── Mobile (< lg) ── */}
      <div className="lg:hidden">
        <MobileApp
          images={images}
          copyMode={copyMode}
          setCopyMode={setCopyMode}
          stylePrompt={stylePrompt}
          setStylePrompt={setStylePrompt}
          modelProvider={modelProvider}
          isGlobalGenerating={isGlobalGenerating}
          handleFileSelect={handleFileSelect}
          handleDrop={onDrop}
          removeImage={removeImage}
          clearAllImages={clearAllImages}
          stopGeneration={stopGeneration}
          processImages={processImages}
          regenerateImage={regenerateImage}
          toast={toast}
          showToast={showToast}
          setPreviewImage={setPreviewImage}
          MAX_IMAGES={MAX_IMAGES}
        />
      </div>

      {/* ── Desktop (>= lg) ── */}
      <div className="hidden lg:block" style={{ minHeight: '100vh', background: 'var(--bg)' }}>
        <Header />

        <HeroSection />

        <main id="upload-area" style={{ background: 'var(--bg)' }}>
          <div className="max-w-5xl mx-auto px-6 py-16 space-y-16">

            <UploadWorkspace
              copyMode={copyMode}
              setCopyMode={setCopyMode}
              stylePrompt={stylePrompt}
              setStylePrompt={setStylePrompt}
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
            </div>
          </div>
        </main>

        <Footer />
      </div>

      {/* ── Image Preview Modal (shared) ── */}
      {previewImage && (
        <ImagePreviewModal
          previewImage={previewImage}
          onClose={() => setPreviewImage(null)}
        />
      )}
    </>
  );
}
