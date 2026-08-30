import React from 'react';
import { AlertCircle, RotateCcw } from 'lucide-react';
import { Button } from './Button';

export interface ErrorStateProps {
  title?: string;
  message: string;
  onRetry?: () => void;
  className?: string;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  title = 'Ocorreu um erro ao carregar os dados',
  message,
  onRetry,
  className = '',
}) => {
  return (
    <div className={`flex flex-col items-center justify-center text-center p-12 rounded-2xl bg-surface border border-danger/30 space-y-4 ${className}`}>
      <div className="p-4 rounded-2xl bg-danger/10 border border-danger/20 text-danger">
        <AlertCircle className="w-8 h-8" />
      </div>
      <div className="space-y-1 max-w-md">
        <h3 className="text-base font-bold font-display text-text-primary">{title}</h3>
        <p className="text-xs sm:text-sm text-text-secondary leading-relaxed">{message}</p>
      </div>
      {onRetry && (
        <Button variant="secondary" size="md" icon={<RotateCcw className="w-4 h-4" />} onClick={onRetry} className="mt-2">
          Tentar novamente
        </Button>
      )}
    </div>
  );
};
