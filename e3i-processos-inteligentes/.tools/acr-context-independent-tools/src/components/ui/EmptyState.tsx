import React from 'react';
import { Layers } from 'lucide-react';
import { Button } from './Button';

export interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description: string;
  actionText?: string;
  onAction?: () => void;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon = <Layers className="w-8 h-8 text-text-secondary" />,
  title,
  description,
  actionText,
  onAction,
  className = '',
}) => {
  return (
    <div className={`flex flex-col items-center justify-center text-center p-12 rounded-2xl bg-surface border border-border-subtle space-y-4 ${className}`}>
      <div className="p-4 rounded-2xl bg-surface-raised border border-border-subtle shadow-inner">
        {icon}
      </div>
      <div className="space-y-1 max-w-md">
        <h3 className="text-base font-bold font-display text-text-primary">{title}</h3>
        <p className="text-xs sm:text-sm text-text-secondary leading-relaxed">{description}</p>
      </div>
      {actionText && onAction && (
        <Button variant="primary" size="md" onClick={onAction} className="mt-2">
          {actionText}
        </Button>
      )}
    </div>
  );
};
