"use client";

import { useState, useEffect } from 'react';

// Define types
export interface ImageItem {
  id: string;
  file: File;
  originalFile: File;
  previewUrl: string;
  status: 'idle' | 'processing-image' | 'loading' | 'success' | 'error';
  result?: string;
  error?: string;
}

export type ModelProvider = 'gemini' | 'gemini-flash' | 'qwen' | 'kimi';
export type CopyMode = 'ai-original' | 'quote-style';

export function useImageProcessor() {
  const [images, setImages] = useState<ImageItem[]>([]);
  const [stylePrompt, setStylePrompt] = useState<string>('');
  const [modelProvider, setModelProvider] = useState<ModelProvider>('gemini');
  const [copyMode, setCopyMode] = useState<CopyMode>('ai-original');
  const [isGlobalGenerating, setIsGlobalGenerating] = useState<boolean>(false);
  const [modelName, setModelName] = useState<string>('AI');

  useEffect(() => {
    fetch('/api/generate-copy')
      .then(res => res.json())
      .then(data => {
        if (data.modelName) setModelName(data.modelName);
      })
      .catch(console.error);
  }, []);

  const addFiles = async (newFiles: File[]) => {
    for (const file of newFiles) {
      const id = Math.random().toString(36).substring(7) + Date.now().toString();

      setImages(prev => [...prev, {
        id,
        file,
        originalFile: file,
        previewUrl: '',
        status: 'processing-image'
      }]);

      try {
        let processFile = file;
        const isHeic = file.type === 'image/heic' || file.type === 'image/heif' || file.name.toLowerCase().endsWith('.heic') || file.name.toLowerCase().endsWith('.heif');

        if (isHeic) {
          try {
            const formData = new FormData();
            formData.append('file', file);
            const res = await fetch('/api/convert-heic', {
              method: 'POST',
              body: formData
            });

            if (!res.ok) {
              throw new Error(`服务器转换 HEIC 失败`);
            }

            const blob = await res.blob();
            processFile = new File([blob], file.name.replace(/\.heic$/i, '.jpg').replace(/\.heif$/i, '.jpg'), { type: 'image/jpeg' });
          } catch (err: unknown) {
            console.error("服务端转换HEIC失败: ", err);
            throw new Error("HEIC 图片格式暂不支持或转换失败，请尝试其他格式");
          }
        }

        const imageCompressionModule = await import('browser-image-compression');
        const imageCompression = imageCompressionModule.default || imageCompressionModule;
        const options = {
          maxSizeMB: 0.8,
          maxWidthOrHeight: 1600,
          useWebWorker: true,
          fileType: isHeic ? 'image/jpeg' : undefined
        };
        const compressedFile = await (imageCompression as (f: File, o: unknown) => Promise<File>)(processFile, options);
        const previewUrl = URL.createObjectURL(compressedFile);

        setImages(prev => prev.map(img =>
          img.id === id ? { ...img, file: compressedFile, previewUrl, status: 'idle' } : img
        ));
      } catch (error: unknown) {
        console.error("图片处理失败: ", error);
        setImages(prev => prev.map(img =>
          img.id === id ? { ...img, status: 'error', error: error instanceof Error ? error.message : '图片解析或压缩失败' } : img
        ));
      }
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      addFiles(newFiles);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLElement>) => {
    e.preventDefault();
    if (e.dataTransfer.files) {
      const newFiles = Array.from(e.dataTransfer.files).filter(file => 
        file.type.startsWith('image/') || 
        file.name.toLowerCase().endsWith('.heic') || 
        file.name.toLowerCase().endsWith('.heif')
      );
      addFiles(newFiles);
    }
  };

  const removeImage = (id: string) => {
    setImages(prev => {
      const imageToRemove = prev.find(img => img.id === id);
      if (imageToRemove) URL.revokeObjectURL(imageToRemove.previewUrl);
      return prev.filter(img => img.id !== id);
    });
  };

  const callGeminiAPI = async (file: File, originalFile: File, prompt: string, provider: ModelProvider): Promise<string> => {
    try {
      const formData = new FormData();
      formData.append('image', file);
      formData.append('originalImage', originalFile);
      formData.append('prompt', prompt);
      formData.append('modelProvider', provider);
      formData.append('copyMode', copyMode);

      const response = await fetch('/api/generate-copy', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `请求失败，状态码: ${response.status}`);
      }

      const data = await response.json();
      return data.result;
    } catch (error: unknown) {
      console.error("API 调用错误:", error);
      throw new Error(error instanceof Error ? error.message : '网络请求失败，请检查连接');
    }
  };

  const processImages = async () => {
    const pendingImages = images.filter(img => img.status !== 'loading' && img.status !== 'processing-image');
    if (pendingImages.length === 0) return;

    setIsGlobalGenerating(true);

    const pendingIds = pendingImages.map(img => img.id);
    setImages(prev => prev.map(img =>
      pendingIds.includes(img.id) ? { ...img, status: 'loading', error: undefined } : img
    ));

    const processPromises = pendingImages.map(async (img) => {
      try {
        const resultText = await callGeminiAPI(img.file, img.originalFile, stylePrompt, modelProvider);
        setImages(prev => prev.map(p =>
          p.id === img.id ? { ...p, status: 'success', result: resultText } : p
        ));
      } catch (error: unknown) {
        setImages(prev => prev.map(p =>
          p.id === img.id ? { ...p, status: 'error', error: error instanceof Error ? error.message : '生成失败，请重试' } : p
        ));
      }
    });

    await Promise.allSettled(processPromises);
    setIsGlobalGenerating(false);
  };

  const regenerateImage = async (id: string) => {
    const imgToRegen = images.find(img => img.id === id);
    if (!imgToRegen) return;

    setImages(prev => prev.map(img =>
      img.id === id ? { ...img, status: 'loading', error: undefined } : img
    ));

    try {
      const resultText = await callGeminiAPI(imgToRegen.file, imgToRegen.originalFile, stylePrompt, modelProvider);
      setImages(prev => prev.map(p =>
        p.id === id ? { ...p, status: 'success', result: resultText } : p
      ));
    } catch (error: unknown) {
      setImages(prev => prev.map(p =>
        p.id === id ? { ...p, status: 'error', error: error instanceof Error ? error.message : '生成失败，请重试' } : p
      ));
    }
  };

  return {
    images,
    setImages,
    stylePrompt,
    setStylePrompt,
    modelProvider,
    setModelProvider,
    copyMode,
    setCopyMode,
    isGlobalGenerating,
    modelName,
    handleFileSelect,
    handleDrop,
    addFiles,
    removeImage,
    processImages,
    regenerateImage
  };
}
