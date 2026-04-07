"use client";

import { useState, useEffect, useRef } from 'react';
import exifr from 'exifr';

// Define types
export interface ImageItem {
  id: string;
  file: File;
  originalFile: File;
  previewUrl: string;
  status: 'idle' | 'processing-image' | 'loading' | 'success' | 'error';
  statusMessage?: string; // Humanized status string
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
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3_000);
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=14&accept-language=zh`,
      { headers: { 'User-Agent': 'VisualCopywriter-UI/1.0' }, signal: controller.signal }
    );
    clearTimeout(timeout);
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

// 定义 EXIF 数据的精确接口，避免使用 any
interface ExifData {
  DateTimeOriginal?: Date | string;
  CreateDate?: Date | string;
  ModifyDate?: Date | string;
  latitude?: number;
  longitude?: number;
  GPSLatitude?: number;
  GPSLongitude?: number;
}

// 辅助函数：格式化日期
function formatExifDateUI(exifData: ExifData): string | null {
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
  const [copyMode, setCopyMode] = useState<CopyMode>('quote-style');
  const [isGlobalGenerating, setIsGlobalGenerating] = useState<boolean>(false);
  const [modelName, setModelName] = useState<string>('AI');
  const [toast, setToast] = useState<{ message: string; type: 'info' | 'error' | 'success' } | null>(null);

  const MAX_IMAGES = 6;

  // Ref to track active fetch requests per image ID
  const activeRequests = useRef<Map<string, AbortController>>(new Map());

  // Show a temporary toast notification
  const showToast = (message: string, type: 'info' | 'error' | 'success' = 'info') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  useEffect(() => {
    fetch('/api/generate-copy')
      .then(res => res.json())
      .then(data => {
        if (data.modelName) setModelName(data.modelName);
      })
      .catch(console.error);

    // Cleanup: abort all active requests on unmount
    const currentActiveRequests = activeRequests.current; // 捕获当前 Ref 值以闭包安全地执行清理
    return () => {
      currentActiveRequests.forEach(controller => controller.abort());
    };
  }, []);

  // 辅助函数：平滑滚动到结果区域
  const scrollToResults = (force = false) => {
    // 只有在非生成状态或强制时才滚动
    if (isGlobalGenerating && !force) return;

    // 延迟一小段时间确保 DOM 已更新，同时也给移动端一点反应时间
    setTimeout(() => {
      const element = document.getElementById('results-section');
      if (element) {
        // 使用 behavior: 'smooth' 可能在某些移动端全屏模式下有冲突
        // 但这是目前最优雅的方式
        const targetPosition = element.getBoundingClientRect().top + window.pageYOffset - 80;
        window.scrollTo({
          top: targetPosition,
          behavior: 'smooth'
        });
      }
    }, 200);
  };

  const addFiles = async (newFiles: File[]) => {
    let filesToProcess = newFiles;
    const currentCount = images.length;

    // Enforce 6 image limit
    if (currentCount + newFiles.length > MAX_IMAGES) {
      const remainingSlots = Math.max(0, MAX_IMAGES - currentCount);
      if (remainingSlots === 0) {
        showToast(`已达到最大限制（${MAX_IMAGES} 张），无法上传更多`, 'error');
        return;
      }
      filesToProcess = newFiles.slice(0, remainingSlots);
      showToast(`一次最多处理 ${MAX_IMAGES} 张图片，已为您选取前 ${remainingSlots} 张`, 'info');
    }

    // 处理开始前进行一次滚动，让用户看到占位符
    scrollToResults();

    for (const file of filesToProcess) {
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
        const location: string | null = null;
        try {
          const exifData = await exifr.parse(file, {
            pick: ['DateTimeOriginal', 'CreateDate', 'ModifyDate', 'GPSLatitude', 'GPSLongitude', 'latitude', 'longitude', 'Orientation', 'Make', 'Model'],
            gps: true,
          });
          if (exifData) {
            date = formatExifDateUI(exifData);
            const lat = exifData.latitude ?? exifData.GPSLatitude;
            const lon = exifData.longitude ?? exifData.GPSLongitude;
            if (typeof lat === 'number' && typeof lon === 'number') {
              // 非阻塞：地理编码异步执行，结果后续回填，不阻塞图片处理
              const capturedId = id;
              reverseGeocodeUI(lat, lon).then(loc => {
                if (loc) {
                  setImages(prev => prev.map(img =>
                    img.id === capturedId
                      ? { ...img, metadata: { date: img.metadata?.date ?? null, location: loc } }
                      : img
                  ));
                }
              });
            }
          }
        } catch (exifErr) {
          console.error("EXIF 提取失败:", exifErr);
        }

        // 2. HEIC 转换 (服务端辅助)
        let processFile = file;
        const isHeic = file.type === 'image/heic' || file.type === 'image/heif' || file.name.toLowerCase().endsWith('.heic') || file.name.toLowerCase().endsWith('.heif');

        if (isHeic) {
          // 策略 1：浏览器原生解码（Safari/Chrome 120+/Android 14+）
          // 注意：Android 上 createImageBitmap(heic) 不会 throw，而是无限期挂起，需加超时
          let converted = false;
          try {
            const bitmap = await Promise.race([
              createImageBitmap(file),
              new Promise<never>((_, reject) =>
                setTimeout(() => reject(new Error('createImageBitmap timeout')), 5_000)
              ),
            ]);
            // 防御：某些 Android 返回 0×0 bitmap（静默失败）
            if (bitmap.width === 0 || bitmap.height === 0) {
              bitmap.close();
              throw new Error('createImageBitmap returned empty bitmap');
            }
            const canvas = document.createElement('canvas');
            canvas.width = bitmap.width;
            canvas.height = bitmap.height;
            const ctx = canvas.getContext('2d')!;
            ctx.drawImage(bitmap, 0, 0);
            bitmap.close();
            const jpegBlob = await new Promise<Blob>((resolve, reject) => {
              canvas.toBlob(
                blob => blob ? resolve(blob) : reject(new Error('toBlob failed')),
                'image/jpeg', 0.85
              );
            });
            processFile = new File([jpegBlob], file.name.replace(/\.[^.]+$/, '.jpg'), { type: 'image/jpeg' });
            converted = true;
          } catch {
            console.warn('[HEIC] createImageBitmap 不支持，尝试客户端 heic2any');
          }

          // 策略 1.5：客户端 heic2any 转换（解决 Android 和 PC 无原生支持问题）
          if (!converted) {
            try {
              const heic2any = (await import('heic2any')).default;
              const convertedResult = await heic2any({
                blob: file,
                toType: 'image/jpeg',
                quality: 0.8
              });
              const jpegBlob = Array.isArray(convertedResult) ? convertedResult[0] : convertedResult;
              processFile = new File([jpegBlob], file.name.replace(/\.[^.]+$/, '.jpg'), { type: 'image/jpeg' });
              converted = true;
            } catch (e) {
              console.warn('[HEIC] heic2any 客户端转换失败:', e);
            }
          }

          // 策略 2：服务端 heic-convert（15s 超时，最终兜底）
          if (!converted) {
            const heicController = new AbortController();
            const heicTimeout = setTimeout(() => heicController.abort(), 15_000);
            try {
              const formData = new FormData();
              formData.append('file', file);
              const res = await fetch('/api/convert-heic', {
                method: 'POST', body: formData, signal: heicController.signal
              });
              clearTimeout(heicTimeout);
              if (!res.ok) {
                const errData = await res.json().catch(() => ({}));
                throw new Error(`服务端转换崩溃: ${errData.error || res.status}`);
              }
              const blob = await res.blob();
              processFile = new File([blob], file.name.replace(/\.[^.]+$/, '.jpg'), { type: 'image/jpeg' });
            } catch (err: unknown) {
              clearTimeout(heicTimeout);
              console.error('[HEIC] 所有转换方式均失败:', err);
              throw new Error(err instanceof Error ? err.message : 'HEIC 转换失败');
            }
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
            originalFile: processFile,
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
      addFiles(newFiles).catch(err => {
        console.error('addFiles failed:', err);
        showToast('图片处理出错，请重试', 'error');
      });
    }
    // 重置 input，允许重复选择相同文件（移动端常见需求）
    e.target.value = '';
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
    // 取消可能正在进行的网络请求
    if (activeRequests.current.has(id)) {
      activeRequests.current.get(id)?.abort();
      activeRequests.current.delete(id);
    }

    setImages(prev => {
      const imageToRemove = prev.find(img => img.id === id);
      // 释放 ObjectURL 内存
      if (imageToRemove?.previewUrl) URL.revokeObjectURL(imageToRemove.previewUrl);
      return prev.filter(img => img.id !== id);
    });
  };

  /**
   * 清空所有图片并释放内存
   */
  const clearAllImages = () => {
    setImages(prev => {
      prev.forEach(img => {
        if (img.previewUrl) URL.revokeObjectURL(img.previewUrl);
      });
      return [];
    });
    // 同时中断所有正在进行的请求
    activeRequests.current.forEach(controller => controller.abort());
    activeRequests.current.clear();
  };

  const stopGeneration = (id: string) => {
    if (activeRequests.current.has(id)) {
      activeRequests.current.get(id)?.abort();
      activeRequests.current.delete(id);
      
      setImages(prev => prev.map(img => 
        img.id === id ? { 
          ...img, 
          status: 'error', 
          statusMessage: undefined, 
          error: '已手动停止生成' 
        } : img
      ));
    }
  };

  const callGeminiAPI = async (img: ImageItem, prompt: string, provider: ModelProvider, signal: AbortSignal): Promise<string> => {
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
        signal,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `请求失败，状态码: ${response.status}`);
      }

      const data = await response.json();
      if (data.error) throw new Error(data.error);

      // Robust cleaning of the AI response
      return cleanAIResponse(data.result);
    } catch (error: unknown) {
      if (error instanceof Error && error.name === 'AbortError') throw error;
      console.error('API Error:', error);
      throw error;
    }
  };

  /**
   * Cleans AI generated text from common artifacts (JSON, thought markers, etc.)
   */
  const cleanAIResponse = (text: string): string => {
    if (!text) return "";
    
    let cleaned = text.trim();

    // 1. Remove Markdown code blocks (JSON blocks primarily)
    cleaned = cleaned.replace(/```(json)?\s*([\s\S]*?)\s*```/g, "$2");

    // 2. Try to parse as JSON if it looks like one (extract 'content' or 'result' or 'caption' if present)
    if (cleaned.startsWith('{') && cleaned.endsWith('}')) {
      try {
        const obj = JSON.parse(cleaned);
        // Common likely keys for content
        cleaned = obj.content || obj.result || obj.caption || obj.text || obj.narration || obj.quote || cleaned;
        if (typeof cleaned !== 'string') cleaned = JSON.stringify(cleaned);
      } catch { /* ignore parse error */ }
    }

    // 3. Strip "thought", "thinking", "analysis" lines (some models prefix thoughts)
    const thoughtPatterns = [
      /^["']?thought["']?\s*[:：]\s*.*$/gim,
      /^["']?thinking["']?\s*[:：]\s*.*$/gim,
      /^["']?analysis["']?\s*[:：]\s*.*$/gim,
      /^<thought>[\s\S]*?<\/thought>/gi,
      /^\[thought\][\s\S]*?\[\/thought\]/gi,
      /^\(?Internal Thought:.*?\)?$/gim
    ];
    
    thoughtPatterns.forEach(pattern => {
      cleaned = cleaned.replace(pattern, "");
    });

    // 4. Final trim and remove any leftover thought artifacts like lone quotes or key names
    cleaned = cleaned.replace(/^(thought|thinking|content|result|caption|text)\s*[:：]\s*/i, "");
    
    return cleaned.trim();
  };

  const processImages = async () => {
    const pendingImages = images.filter(img =>
      img.status === 'idle' || img.status === 'success' ||
      (img.status === 'error' && img.previewUrl)
    );
    if (pendingImages.length === 0) return;

    setIsGlobalGenerating(true);

    const pendingIds = pendingImages.map(img => img.id);
    const modelDisplayName = modelProvider === 'kimi' ? 'Kimi' : (modelProvider === 'qwen' ? '通义千问' : 'Gemini');
    
    setImages(prev => prev.map(img =>
      pendingIds.includes(img.id) ? { 
        ...img, 
        status: 'loading', 
        statusMessage: `${modelDisplayName} 正在创作中，预计耗时 30 秒`,
        error: undefined 
      } : img
    ));

    const processPromises = pendingImages.map(async (img) => {
      let retryCount = 0;
      const maxRetries = 3;
      
      const attemptGenerate = async (): Promise<void> => {
        // 为每次尝试创建一个 AbortController，也可以共用初始的一个
        if (!activeRequests.current.has(img.id)) {
          activeRequests.current.set(img.id, new AbortController());
        }
        const controller = activeRequests.current.get(img.id)!;

        try {
          const resultText = await callGeminiAPI(img, stylePrompt, modelProvider, controller.signal);
          setImages(prev => prev.map(p =>
            p.id === img.id ? { ...p, status: 'success', result: resultText, statusMessage: undefined } : p
          ));
          activeRequests.current.delete(img.id);
        } catch (error: unknown) {
          // 如果是主动中止，不进行后续 retry 或 错误设置
          if (error instanceof Error && error.name === 'AbortError') return;

          const errorMessage = error instanceof Error ? error.message : '生成失败，请重试';
          const isRetryable = errorMessage.includes('503') || errorMessage.includes('429');
          
          if (isRetryable && retryCount < maxRetries) {
            retryCount++;
            setImages(prev => prev.map(p =>
              p.id === img.id ? { 
                ...p, 
                statusMessage: `服务繁忙，正在帮你第 ${retryCount} 次重试...` 
              } : p
            ));
            
            // 指数退避
            await new Promise(resolve => setTimeout(resolve, 1500 * Math.pow(2, retryCount - 1)));
            return attemptGenerate();
          }

          setImages(prev => prev.map(p =>
            p.id === img.id ? { 
              ...p, 
              status: 'error', 
              statusMessage: undefined,
              error: errorMessage
            } : p
          ));
          activeRequests.current.delete(img.id);
        }
      };

      return attemptGenerate();
    });

    await Promise.allSettled(processPromises);
    setIsGlobalGenerating(false);
  };

  const regenerateImage = async (id: string) => {
    const imgToRegen = images.find(img => img.id === id);
    if (!imgToRegen) return;
    if (!imgToRegen.previewUrl) {
      showToast('该图片处理失败，请删除后重新上传', 'error');
      return;
    }

    const modelDisplayName = modelProvider === 'kimi' ? 'Kimi' : (modelProvider === 'qwen' ? '通义千问' : 'Gemini');

    setImages(prev => prev.map(img =>
      img.id === id ? { 
        ...img, 
        status: 'loading', 
        statusMessage: `${modelDisplayName} 正在重新创作，预计耗时 30 秒`,
        error: undefined 
      } : img
    ));

    let retryCount = 0;
    const maxRetries = 3;

    const attemptRegen = async (): Promise<void> => {
      if (!activeRequests.current.has(id)) {
        activeRequests.current.set(id, new AbortController());
      }
      const controller = activeRequests.current.get(id)!;

      try {
        const resultText = await callGeminiAPI(imgToRegen, stylePrompt, modelProvider, controller.signal);
        setImages(prev => prev.map(p =>
          p.id === id ? { ...p, status: 'success', result: resultText, statusMessage: undefined } : p
        ));
        activeRequests.current.delete(id);
      } catch (error: unknown) {
        if (error instanceof Error && error.name === 'AbortError') return;

        const errorMessage = error instanceof Error ? error.message : '生成失败，请重试';
        const isRetryable = errorMessage.includes('503') || errorMessage.includes('429');

        if (isRetryable && retryCount < maxRetries) {
          retryCount++;
          setImages(prev => prev.map(p =>
            p.id === id ? { 
              ...p, 
              statusMessage: `服务繁忙，正在为您全力重试 (${retryCount}/3)...` 
            } : p
          ));
          await new Promise(resolve => setTimeout(resolve, 1500 * Math.pow(2, retryCount - 1)));
          return attemptRegen();
        }

        setImages(prev => prev.map(p =>
          p.id === id ? { 
            ...p, 
            status: 'error', 
            statusMessage: undefined,
            error: errorMessage
          } : p
        ));
        activeRequests.current.delete(id);
      }
    };

    await attemptRegen();
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
    clearAllImages,
    stopGeneration,
    processImages,
    regenerateImage,
    toast,
    showToast,
    MAX_IMAGES
  };
}