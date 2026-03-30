"use client";

import { useState, useEffect } from 'react';
import exifr from 'exifr';

// Define types
export interface ImageItem {
  id: string;
  file: File;
  originalFile: File;
  previewUrl: string;
  status: 'idle' | 'processing-image' | 'loading' | 'success' | 'error';
  result?: string;
  error?: string;
  metadata?: {
    date: string | null;
    location: string | null;
  };
}

export type ModelProvider = 'gemini' | 'gemini-flash' | 'qwen' | 'kimi';
export type CopyMode = 'ai-original' | 'quote-style';

// 辅助函数：反向地理编码（前端执行）
async function reverseGeocodeUI(lat: number, lon: number): Promise<string | null> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=14&accept-language=zh`,
      { headers: { 'User-Agent': 'VisualCopywriter-UI/1.0' } }
    );
    if (!res.ok) return null;
    const data = await res.json();
    const addr = data.address;
    if (!addr) return data.display_name || null;

    const parts: string[] = [];
    if (addr.country && addr.country !== '中国' && addr.country !== 'China') parts.push(addr.country);
    if (addr.state || addr.province) parts.push(addr.state || addr.province);
    if (addr.city || addr.town || addr.county) parts.push(addr.city || addr.town || addr.county);
    if (addr.suburb || addr.district) parts.push(addr.suburb || addr.district);
    
    return parts.length > 0 ? parts.join(' ') : (data.display_name || null);
  } catch (e) {
    console.error('UI Reverse geocode error:', e);
    return null;
  }
}

// 辅助函数：格式化日期
function formatExifDateUI(exifData: any): string | null {
  const dateField = exifData?.DateTimeOriginal || exifData?.CreateDate || exifData?.ModifyDate;
  if (!dateField) return null;
  try {
    const d = dateField instanceof Date ? dateField : new Date(dateField as string | number);
    if (isNaN(d.getTime())) return null;
    return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`;
  } catch {
    return null;
  }
}

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

  // 辅助函数：平滑滚动到结果区域
  const scrollToResults = () => {
    // 延迟一小段时间确保 DOM 已更新
    setTimeout(() => {
      const element = document.getElementById('results-section');
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 150);
  };

  const addFiles = async (newFiles: File[]) => {
    // 处理开始前进行一次滚动，让用户看到占位符
    scrollToResults();

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
        // 1. 提取元数据 (前端提取)
        let date: string | null = null;
        let location: string | null = null;
        try {
          const exifData = await exifr.parse(file, {
            pick: ['DateTimeOriginal', 'CreateDate', 'ModifyDate', 'GPSLatitude', 'GPSLongitude', 'latitude', 'longitude']
          });
          if (exifData) {
            date = formatExifDateUI(exifData);
            const lat = exifData.latitude ?? exifData.GPSLatitude;
            const lon = exifData.longitude ?? exifData.GPSLongitude;
            if (typeof lat === 'number' && typeof lon === 'number') {
              location = await reverseGeocodeUI(lat, lon);
            }
          }
        } catch (exifErr) {
          console.error("EXIF 提取失败:", exifErr);
        }

        // 2. HEIC 转换 (服务端辅助)
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
            processFile = new File([blob], file.name.replace(/\.[^.]+$/, '.jpg'), { type: 'image/jpeg' });
          } catch (err: unknown) {
            console.error("服务端转换HEIC失败: ", err);
            throw new Error("HEIC 图片格式暂不支持或转换失败，请尝试其他格式");
          }
        }

        const imageCompressionModule = await import('browser-image-compression');
        const imageCompression = imageCompressionModule.default || imageCompressionModule;
        const options = {
          maxSizeMB: 0.3,
          maxWidthOrHeight: 1024,
          useWebWorker: true,
          initialQuality: 0.75,
          fileType: 'image/webp'
        };
        const compressedBlob = await (imageCompression as (f: File, o: unknown) => Promise<Blob>)(processFile, options);
        const compressedFile = new File([compressedBlob], file.name.replace(/\.[^.]+$/, '.webp'), { type: 'image/webp' });
        const previewUrl = URL.createObjectURL(compressedFile);

        setImages(prev => prev.map(img =>
          img.id === id ? { 
            ...img, 
            file: compressedFile, 
            previewUrl, 
            status: 'idle',
            metadata: { date, location }
          } : img
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

  const callGeminiAPI = async (img: ImageItem, prompt: string, provider: ModelProvider): Promise<string> => {
    try {
      const formData = new FormData();
      formData.append('image', img.file);
      if (img.metadata?.date) formData.append('metadataDate', img.metadata.date);
      if (img.metadata?.location) formData.append('metadataLocation', img.metadata.location);
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
    const pendingImages = images.filter(img => img.status === 'idle' || img.status === 'success' || img.status === 'error');
    if (pendingImages.length === 0) return;

    setIsGlobalGenerating(true);

    const pendingIds = pendingImages.map(img => img.id);
    setImages(prev => prev.map(img =>
      pendingIds.includes(img.id) ? { ...img, status: 'loading', error: undefined } : img
    ));

    const processPromises = pendingImages.map(async (img) => {
      try {
        const resultText = await callGeminiAPI(img, stylePrompt, modelProvider);
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
      const resultText = await callGeminiAPI(imgToRegen, stylePrompt, modelProvider);
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
