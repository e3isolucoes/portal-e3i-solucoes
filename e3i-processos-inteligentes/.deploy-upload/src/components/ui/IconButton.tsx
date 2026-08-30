import React from 'react';

export interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  'aria-label': string;
  icon: React.ReactNode;
  variant?: 'surface' | 'ghost' | 'gold' | 'danger';
  size?: 'sm' | 'md' | 'lg';
}

export const IconButton: React.FC<IconButtonProps> = ({
  'aria-label': ariaLabel,
  icon,
  variant = 'surface',
  size = 'md',
  className = '',
  ...props
}) => {
  const baseStyles = 'inline-flex items-center justify-center rounded-xl transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-canvas disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0';

  const variants = {
    surface: 'bg-surface hover:bg-surface-raised text-text-primary border border-border-subtle hover:border-border-strong',
    ghost: 'bg-transparent hover:bg-surface-raised text-text-secondary hover:text-text-primary',
    gold: 'bg-gold/10 hover:bg-gold/20 text-gold border border-gold/30',
    danger: 'bg-danger/10 hover:bg-danger/20 text-danger border border-danger/30',
  };

  const sizes = {
    sm: 'p-1.5 text-xs',
    md: 'p-2.5 text-sm',
    lg: 'p-3 text-base',
  };

  return (
    <button
      aria-label={ariaLabel}
      title={ariaLabel}
      className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {icon}
    </button>
  );
};
