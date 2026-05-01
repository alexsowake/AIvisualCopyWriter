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
          <div className="text-[10px] tracking-widest text-slate-400 font-medium opacity-60" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span className="uppercase">来自</span>
            <svg width="32" height="32" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ flexShrink: 0, verticalAlign: 'middle' }}>
              <ellipse cx="50" cy="50" rx="30" ry="19" stroke="#64748b" strokeWidth="3.5" opacity="0.35" transform="rotate(-25 50 50)" />
              <ellipse cx="50" cy="50" rx="21" ry="31" stroke="#64748b" strokeWidth="3.5" opacity="0.28" transform="rotate(18 50 50)" />
              <path d="M 50 50 Q 63 41, 73 28" stroke="#64748b" strokeWidth="4.5" opacity="0.6" strokeLinecap="round" />
              <path d="M 50 50 Q 37 63, 27 73" stroke="#64748b" strokeWidth="4.5" opacity="0.5" strokeLinecap="round" />
              <path d="M 50 50 Q 67 57, 75 69" stroke="#64748b" strokeWidth="4.5" opacity="0.45" strokeLinecap="round" />
              <circle cx="73" cy="28" r="6" fill="#64748b" />
              <circle cx="27" cy="73" r="5" fill="#64748b" opacity="0.7" />
              <circle cx="75" cy="69" r="4" fill="#64748b" opacity="0.55" />
              <circle cx="50" cy="50" r="14" stroke="#64748b" strokeWidth="3.5" opacity="0.3" />
              <circle cx="50" cy="50" r="9.5" fill="#64748b" />
            </svg>
            <span className="uppercase">时间胶囊</span>
            <span>aicw.me</span>
          </div>
        </div>
      </div>
    </div>
  );
}
