import React from 'react';
import { CapsuleLogo } from './Branding';

export function Header() {
  return (
    <header
      className="sticky top-0 z-40"
      style={{
        background: 'var(--bg)',
        borderBottom: '1px solid var(--border)',
      }}
    >
      <div
        className="max-w-5xl mx-auto px-6"
        style={{ paddingTop: '14px', paddingBottom: '14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <CapsuleLogo />
          <span
            className="font-display-zh"
            style={{
              fontSize: '15px',
              fontWeight: 500,
              color: 'var(--fg)',
              letterSpacing: '0.04em',
            }}
          >
            时间胶囊
          </span>
        </div>
        <span
          className="font-display-en"
          style={{
            fontStyle: 'italic',
            fontSize: '12px',
            color: 'var(--fg-subtle)',
            letterSpacing: '0.04em',
          }}
        >
          AI Visual Copywriter
        </span>
      </div>
    </header>
  );
}
