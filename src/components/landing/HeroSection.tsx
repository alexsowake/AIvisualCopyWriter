"use client";

import React from 'react';

export function HeroSection() {
  return (
    <section style={{ background: 'var(--bg)', paddingTop: 'clamp(3.5rem, 10vw, 9rem)', paddingBottom: 'clamp(2.5rem, 10vw, 7rem)', overflow: 'hidden' }}>
      <div className="max-w-5xl mx-auto px-6">
        <div className="stagger-in">

          {/* Overline */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '2rem' }}>
            <div style={{ width: '28px', height: '1px', background: 'var(--fg)' }} />
            <span style={{
              fontFamily: "'DM Sans', sans-serif",
              fontSize: '11px',
              letterSpacing: '0.18em',
              color: 'var(--fg-muted)',
              textTransform: 'uppercase',
              fontWeight: 400,
            }}>
              AI Visual Copywriting
            </span>
          </div>

          {/* Main title */}
          <h1
            className="font-display-zh text-balance"
            style={{
              fontSize: 'clamp(3.75rem, 13vw, 9.5rem)',
              lineHeight: 1.04,
              letterSpacing: '-0.01em',
              color: 'var(--fg)',
              marginBottom: '1.75rem',
              fontWeight: 400,
            }}
          >
            听照片<br />开口说话
          </h1>

          {/* Subtitle */}
          <p
            className="font-display-en"
            style={{
              fontStyle: 'italic',
              fontSize: 'clamp(1rem, 2vw, 1.2rem)',
              color: 'var(--fg-muted)',
              maxWidth: '420px',
              lineHeight: 1.7,
              marginBottom: '2.75rem',
              fontWeight: 400,
            }}
          >
            上传照片，AI 为你创作独特的极简旁白。
          </p>

          {/* CTA */}
          <button
            onClick={() => document.getElementById('upload-area')?.scrollIntoView({ behavior: 'smooth' })}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '10px',
              padding: '11px 28px',
              background: 'var(--fg)',
              color: 'var(--bg)',
              fontSize: '13.5px',
              fontWeight: 500,
              letterSpacing: '0.04em',
              border: '1.5px solid var(--fg)',
              cursor: 'pointer',
              fontFamily: "'DM Sans', sans-serif",
              transition: 'background 0.2s ease, color 0.2s ease',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = 'var(--bg)';
              e.currentTarget.style.color = 'var(--fg)';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = 'var(--fg)';
              e.currentTarget.style.color = 'var(--bg)';
            }}
          >
            开始创作
            <svg width="13" height="13" viewBox="0 0 13 13" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
              <path d="M2 6.5h9M7.5 2.5l4 4-4 4" />
            </svg>
          </button>

        </div>
      </div>
    </section>
  );
}
