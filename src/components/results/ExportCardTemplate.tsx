"use client";

import React from 'react';
import { CopyMode } from '../../hooks/useImageProcessor';

interface ExportCardTemplateProps {
  id: string;
  previewUrl: string;
  result: string;
  copyMode: CopyMode;
}

export function ExportCardTemplate({ id, previewUrl, result, copyMode }: ExportCardTemplateProps) {
  return (
    <div id={`export-wrapper-${id}`} className="absolute left-[-9999px] top-[-9999px] opacity-0 pointer-events-none z-[-1]">
      <div
        id={`export-card-${id}`}
        className="flex flex-col bg-white p-6 shadow-sm w-[400px] box-border"
      >
        {/* 使用原生 img 而非 Next.js Image，因为 html2canvas 导出时 wrapper 会被移至 document.body，
            脱离 React 组件树后 Next.js Image 无法正常渲染 */}
        {/* paddingTop: '75%' = 4:3 宽高比，原图居中裁剪，避免竖向或横向被拉伸 */}
        <div className="w-full mb-6" style={{ position: 'relative', paddingTop: '75%', overflow: 'hidden', borderRadius: '8px' }}>
          <img
            src={previewUrl}
            alt="export"
            loading="eager"
            style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', display: 'block', objectFit: 'cover' }}
          />
        </div>
        {copyMode === 'quote-style' ? (
          <div className="flex-1 flex flex-col px-4 text-slate-800" style={{ fontFamily: "'LXGW WenKai', serif" }}>
            <div className="text-base text-left leading-relaxed">
              {result.split('\n\n')[0]}
            </div>
            {result.split('\n\n')[1] && (
              <div 
                className="text-right mt-5 text-slate-500 text-[13.5px] italic leading-relaxed" 
                style={{ 
                  maxWidth: '85%', 
                  marginLeft: 'auto',
                  wordBreak: 'break-all',
                  overflowWrap: 'break-word'
                }}
              >
                {result.split('\n\n')[1]}
              </div>
            )}
          </div>
        ) : (
          <div className="flex-1 flex flex-col px-4 text-slate-800" style={{ fontFamily: "'LXGW WenKai', serif" }}>
            <div className="text-base text-left leading-relaxed">
              {result.split('\n\n')[0]}
            </div>
            {result.split('\n\n').slice(1).join('\n\n').trim() && (
              <div 
                className="text-right mt-5 text-slate-500 text-[13.5px] italic leading-relaxed"
                style={{ 
                  maxWidth: '85%', 
                  marginLeft: 'auto',
                  wordBreak: 'break-all',
                  overflowWrap: 'break-word'
                }}
              >
                {result.split('\n\n').slice(1).join('\n').split('\n').map((line: string, i: number) => (
                  <div key={i}>{line}</div>
                ))}
              </div>
            )}
          </div>
        )}
        <div className="w-full flex justify-end mt-12 mb-2">
          <div className="text-[10px] tracking-widest text-slate-400 font-medium opacity-60 uppercase flex items-center gap-1.5">
            <span>来自</span>
            <svg width="10" height="15" viewBox="0 0 22 34" fill="none" stroke="currentColor" xmlns="http://www.w3.org/2000/svg" style={{ display: 'block', transform: 'translateY(1.5px)' }}>
               <rect x="1.75" y="1.75" width="18.5" height="30.5" rx="9.25" strokeWidth="2.5" />
               <line x1="1.75" y1="17" x2="20.25" y2="17" strokeWidth="2.5" />
               <circle cx="11" cy="10" r="3.75" strokeWidth="2" />
               <circle cx="7.5" cy="24" r="1.5" fill="currentColor" stroke="none" />
               <circle cx="11" cy="24" r="1.5" fill="currentColor" stroke="none" />
               <circle cx="14.5" cy="24" r="1.5" fill="currentColor" stroke="none" />
            </svg>
            <span>时间胶囊</span>
          </div>
        </div>
      </div>
    </div>
  );
}
