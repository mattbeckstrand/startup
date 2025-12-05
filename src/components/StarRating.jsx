import React, { useState } from 'react';

export function StarRating({ 
  value = 0, 
  onChange, 
  readonly = false, 
  size = 'md',
  showValue = false 
}) {
  const [hoverValue, setHoverValue] = useState(null);
  
  const sizes = {
    sm: 'text-lg',
    md: 'text-2xl',
    lg: 'text-3xl',
    xl: 'text-4xl'
  };

  const displayValue = hoverValue !== null ? hoverValue : value;

  const handleClick = (starIndex, isHalf) => {
    if (readonly) return;
    const newValue = isHalf ? starIndex + 0.5 : starIndex + 1;
    onChange?.(newValue);
  };

  const handleMouseMove = (e, starIndex) => {
    if (readonly) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const isLeftHalf = e.clientX - rect.left < rect.width / 2;
    setHoverValue(isLeftHalf ? starIndex + 0.5 : starIndex + 1);
  };

  const handleMouseLeave = () => {
    setHoverValue(null);
  };

  const renderStar = (index) => {
    const starValue = index + 1;
    const isFilled = displayValue >= starValue;
    const isHalfFilled = displayValue >= index + 0.5 && displayValue < starValue;

    return (
      <span
        key={index}
        className={`relative inline-block ${sizes[size]} ${readonly ? '' : 'cursor-pointer'} select-none`}
        onMouseMove={(e) => handleMouseMove(e, index)}
        onMouseLeave={handleMouseLeave}
        onClick={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          const isLeftHalf = e.clientX - rect.left < rect.width / 2;
          handleClick(index, isLeftHalf);
        }}
      >
        {/* Empty star background */}
        <span style={{ color: 'rgba(128, 128, 128, 0.3)' }}>☆</span>
        
        {/* Filled portion overlay */}
        <span 
          className="absolute inset-0 overflow-hidden"
          style={{ 
            width: isFilled ? '100%' : isHalfFilled ? '50%' : '0%',
            color: 'var(--accent-yellow)'
          }}
        >
          ★
        </span>
      </span>
    );
  };

  return (
    <div className="flex items-center gap-1">
      <div className="flex">
        {[0, 1, 2, 3, 4].map(renderStar)}
      </div>
      {showValue && (
        <span 
          className="ml-2 text-sm"
          style={{ color: 'var(--text-secondary)' }}
        >
          {value.toFixed(1)}
        </span>
      )}
    </div>
  );
}

// Simple display-only star rating
export function StarRatingDisplay({ rating, size = 'sm' }) {
  const sizes = {
    xs: 'text-xs',
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg'
  };

  const fullStars = Math.floor(rating);
  const hasHalfStar = rating % 1 >= 0.5;
  const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);

  return (
    <span className={`${sizes[size]}`}>
      <span style={{ color: 'var(--accent-yellow)' }}>
        {'★'.repeat(fullStars)}
      </span>
      {hasHalfStar && (
        <span className="relative inline-block">
          <span style={{ color: 'rgba(128, 128, 128, 0.3)' }}>☆</span>
          <span 
            className="absolute inset-0 overflow-hidden" 
            style={{ width: '50%', color: 'var(--accent-yellow)' }}
          >
            ★
          </span>
        </span>
      )}
      <span style={{ color: 'rgba(128, 128, 128, 0.3)' }}>
        {'☆'.repeat(emptyStars)}
      </span>
    </span>
  );
}
