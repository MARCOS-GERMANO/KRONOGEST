import React from 'react';
import { APP_NAME } from '../config';

// Cronômetro (kronos = tempo) com ponteiro verde e barras de obra
export function LogoMark({ size = 32 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden="true" fill="none">
      <rect x="19" y="2" width="10" height="5" rx="2" fill="currentColor" />
      <circle cx="24" cy="27" r="18" stroke="currentColor" strokeWidth="3" />
      <path d="M24 27V14" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
      <path d="M24 27l9 6" stroke="var(--ok)" strokeWidth="3" strokeLinecap="round" />
      <path d="M14 38v-4m4 4v-7" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" opacity=".55" />
    </svg>
  );
}
export function Logo({ size = 32, className = '' }) {
  return (
    <span className={`inline-flex items-center gap-2 text-silver ${className}`}>
      <LogoMark size={size} />
      <span className="font-bold uppercase tracking-[0.22em]">{APP_NAME}</span>
    </span>
  );
}
