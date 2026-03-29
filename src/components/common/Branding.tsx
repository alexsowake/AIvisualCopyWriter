import React from 'react';

/**
 * CapsuleLogo: A time-capsule SVG mark
 * - Vertical pill outline (the sealed capsule)
 * - Mid-equator dividing line
 * - Upper porthole circle (window / viewer)
 * - Three lower dots (time / film frames)
 */
export function CapsuleLogo() {
  return (
    <svg
      width="22"
      height="34"
      viewBox="0 0 22 34"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{ color: 'var(--fg)', flexShrink: 0 }}
    >
      <rect x="1.75" y="1.75" width="18.5" height="30.5" rx="9.25" stroke="currentColor" strokeWidth="1.5" />
      <line x1="1.75" y1="17" x2="20.25" y2="17" stroke="currentColor" strokeWidth="1.25" />
      <circle cx="11" cy="10" r="3.75" stroke="currentColor" strokeWidth="1.25" />
      <circle cx="7.5" cy="24" r="1" fill="currentColor" />
      <circle cx="11" cy="24" r="1" fill="currentColor" />
      <circle cx="14.5" cy="24" r="1" fill="currentColor" />
    </svg>
  );
}

/**
 * Sparkle icon used for branding emphasis
 */
export function SparkleIcon() {
  return (
    <span style={{ fontFamily: 'inherit' }}>✦</span>
  );
}
