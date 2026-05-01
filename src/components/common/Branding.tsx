import React from 'react';

/**
 * CapsuleLogo: Asymmetric Orbit
 * Central body (the photo) with three caption satellites on crossed
 * elliptical trails. Curved gravity paths, fading opacity by distance.
 * Renders square; pass `size` to scale.
 */
export function CapsuleLogo({ size = 26 }: { size?: number } = {}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{ color: 'var(--fg)', flexShrink: 0 }}
    >
      {/* Crossed elliptical orbit trails */}
      <ellipse cx="50" cy="50" rx="30" ry="19" stroke="currentColor" strokeWidth="0.9" opacity="0.18" transform="rotate(-25 50 50)" />
      <ellipse cx="50" cy="50" rx="21" ry="31" stroke="currentColor" strokeWidth="0.9" opacity="0.13" transform="rotate(18 50 50)" />
      {/* Curved gravity connections */}
      <path d="M 50 50 Q 63 41, 73 28" stroke="currentColor" strokeWidth="1.5" opacity="0.4"  strokeLinecap="round" />
      <path d="M 50 50 Q 37 63, 27 73" stroke="currentColor" strokeWidth="1.5" opacity="0.35" strokeLinecap="round" />
      <path d="M 50 50 Q 67 57, 75 69" stroke="currentColor" strokeWidth="1.5" opacity="0.3"  strokeLinecap="round" />
      {/* Three satellites — near large, far small */}
      <circle cx="73" cy="28" r="3.5" fill="currentColor" />
      <circle cx="27" cy="73" r="3"   fill="currentColor" opacity="0.65" />
      <circle cx="75" cy="69" r="2.5" fill="currentColor" opacity="0.5" />
      {/* Central body + halo */}
      <circle cx="50" cy="50" r="13"  stroke="currentColor" strokeWidth="1.5" opacity="0.18" />
      <circle cx="50" cy="50" r="8.5" fill="currentColor" />
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
