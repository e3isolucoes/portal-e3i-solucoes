import React from 'react';

export interface SkeletonProps {
  variant?: 'text' | 'card' | 'table-row';
  className?: string;
}

export const Skeleton: React.FC<SkeletonProps> = ({ variant = 'text', className = '' }) => {
  if (variant === 'text') {
    return <div className={`h-4 bg-surface-raised rounded-lg animate-pulse w-full ${className}`} />;
  }

  if (variant === 'card') {
    return (
      <div className={`p-6 rounded-2xl bg-surface border border-border-subtle space-y-4 animate-pulse ${className}`}>
        <div className="flex items-center justify-between">
          <div className="h-5 bg-surface-raised rounded-lg w-1/3" />
          <div className="h-6 w-16 bg-surface-raised rounded-full" />
        </div>
        <div className="space-y-2">
          <div className="h-4 bg-surface-raised rounded-lg w-full" />
          <div className="h-4 bg-surface-raised rounded-lg w-2/3" />
        </div>
      </div>
    );
  }

  if (variant === 'table-row') {
    return (
      <div className={`flex items-center gap-4 px-6 py-4 bg-surface border-b border-border-subtle animate-pulse ${className}`}>
        <div className="h-4 bg-surface-raised rounded-lg w-1/4" />
        <div className="h-4 bg-surface-raised rounded-lg w-1/3" />
        <div className="h-4 bg-surface-raised rounded-lg w-1/6" />
        <div className="h-6 w-20 bg-surface-raised rounded-full ml-auto" />
      </div>
    );
  }

  return null;
};
