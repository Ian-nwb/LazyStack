import React from 'react'

/** The LazyStack mark: two stack chevrons under a 2×2 plan grid. Monochrome; inherits `currentColor`. */
export const LazyStackMark: React.FC<{ className?: string }> = ({ className }) => (
  <svg viewBox="4 4 60 56" className={className} aria-hidden="true" focusable="false">
    <path d="M6 46 30 58 54 46" fill="none" stroke="currentColor" strokeWidth={5} strokeOpacity={0.4} strokeLinejoin="miter" />
    <path d="M14 32 38 44 62 32" fill="none" stroke="currentColor" strokeWidth={5} strokeOpacity={0.7} strokeLinejoin="miter" />
    <path
      d="M30 6 40.2 11.1 30 16.2 19.8 11.1Z M43.8 12.9 54 18 43.8 23.1 33.6 18Z M16.2 12.9 26.4 18 16.2 23.1 6 18Z M30 19.8 40.2 24.9 30 30 19.8 24.9Z"
      fill="currentColor"
    />
  </svg>
)
