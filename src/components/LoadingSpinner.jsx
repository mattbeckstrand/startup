import React from 'react';

export function LoadingSpinner({ size = 'md', className = '' }) {
  const sizes = {
    sm: 'w-4 h-4',
    md: 'w-8 h-8',
    lg: 'w-12 h-12',
    xl: 'w-16 h-16'
  };

  return (
    <div className={`${sizes[size]} ${className}`}>
      <svg 
        className="animate-spin text-[rgba(255,255,255,0.6)]" 
        xmlns="http://www.w3.org/2000/svg" 
        fill="none" 
        viewBox="0 0 24 24"
      >
        <circle 
          className="opacity-25" 
          cx="12" 
          cy="12" 
          r="10" 
          stroke="currentColor" 
          strokeWidth="4"
        />
        <path 
          className="opacity-75" 
          fill="currentColor" 
          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
        />
      </svg>
    </div>
  );
}

export function FullPageLoader() {
  return (
    <div className="flex items-center justify-center min-h-[50vh]">
      <LoadingSpinner size="lg" />
    </div>
  );
}

export function SkeletonCard() {
  return (
    <div 
      className="rounded-2xl p-2 px-3 mb-1 w-full"
      style={{ background: 'rgb(48, 48, 52)' }}
    >
      {/* Header */}
      <div className="flex items-center gap-1.5 mb-3">
        <div className="w-6 h-6 rounded-full skeleton" />
        <div className="h-3 rounded skeleton" style={{ width: '80px' }} />
        <div className="flex-1" />
        <div className="h-3 rounded skeleton" style={{ width: '30px' }} />
      </div>
      
      {/* Content */}
      <div className="flex gap-3">
        <div className="w-[120px] h-[120px] rounded-xl skeleton flex-shrink-0" />
        <div className="flex-1 flex flex-col gap-2">
          <div className="h-5 rounded skeleton" style={{ width: '85%' }} />
          <div className="h-4 rounded skeleton" style={{ width: '60%' }} />
          <div className="h-3 rounded skeleton" style={{ width: '40px' }} />
          <div className="flex gap-1 mt-1">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="w-3.5 h-3.5 rounded skeleton" />
            ))}
          </div>
        </div>
      </div>
      
      {/* Actions */}
      <div className="flex gap-6 mt-3">
        {[1, 2, 3].map(i => (
          <div key={i} className="h-3.5 rounded skeleton" style={{ width: '24px' }} />
        ))}
      </div>
    </div>
  );
}

export function SkeletonAlbumCard() {
  return (
    <div className="flex-shrink-0 w-[112px] h-[112px] rounded-xl skeleton" />
  );
}
