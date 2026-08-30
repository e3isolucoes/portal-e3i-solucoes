import React from 'react';

export interface PageHeaderProps {
  eyebrow?: {
    icon?: React.ReactNode;
    text: string;
  };
  title: string;
  description?: string;
  actions?: React.ReactNode;
  breadcrumb?: React.ReactNode;
  className?: string;
}

export const PageHeader: React.FC<PageHeaderProps> = ({
  eyebrow,
  title,
  description,
  actions,
  breadcrumb,
  className = '',
}) => {
  return (
    <div className={`space-y-3 pb-6 border-b border-border-subtle ${className}`}>
      {breadcrumb && <div className="text-xs text-text-secondary">{breadcrumb}</div>}
      
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="space-y-1">
          {eyebrow && (
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-gold/10 text-gold text-xs font-bold uppercase tracking-wider border border-gold/25">
              {eyebrow.icon}
              <span>{eyebrow.text}</span>
            </div>
          )}
          <h1 className="text-2xl sm:text-3xl font-extrabold font-display text-text-primary tracking-tight">
            {title}
          </h1>
          {description && (
            <p className="text-sm text-text-secondary max-w-3xl leading-relaxed">
              {description}
            </p>
          )}
        </div>

        {actions && <div className="flex items-center gap-3 shrink-0">{actions}</div>}
      </div>
    </div>
  );
};
