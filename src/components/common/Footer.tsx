import React from 'react';

export function Footer() {
  return (
    <footer style={{ borderTop: '1px solid var(--border)', paddingTop: '3rem', paddingBottom: '3rem', marginTop: '4rem' }}>
      <div className="max-w-5xl mx-auto px-6 text-center">
        <p
          className="font-display-en"
          style={{
            fontStyle: 'italic',
            fontSize: '13px',
            color: 'var(--fg-subtle)',
            letterSpacing: '0.04em',
          }}
        >
          听照片开口说话 · AI Visual Copywriting
        </p>
        <p style={{ marginTop: '6px', fontSize: '11px', color: 'var(--fg-subtle)', letterSpacing: '0.12em', textTransform: 'uppercase' }}>
          时间胶囊
        </p>
      </div>
    </footer>
  );
}
