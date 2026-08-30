import React from 'react';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  elevation?: 'flat' | 'raised' | 'floating';
  children: React.ReactNode;
}

export const Card: React.FC<CardProps> & {
  Header: React.FC<CardHeaderProps>;
  Body: React.FC<CardBodyProps>;
  Footer: React.FC<CardFooterProps>;
} = ({ elevation = 'raised', children, className = '', ...props }) => {
  const elevations = {
    flat: 'bg-surface border border-border-subtle',
    raised: 'bg-surface border border-border-subtle shadow-md shadow-canvas/50',
    floating: 'bg-surface-raised border border-border-strong shadow-xl shadow-canvas/80',
  };

  return (
    <div className={`rounded-2xl overflow-hidden transition-all duration-200 ${elevations[elevation]} ${className}`} {...props}>
      {children}
    </div>
  );
};

export interface CardHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

const CardHeader: React.FC<CardHeaderProps> = ({ children, className = '', ...props }) => (
  <div className={`px-6 py-4 border-b border-border-subtle flex items-center justify-between gap-4 ${className}`} {...props}>
    {children}
  </div>
);

export interface CardBodyProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

const CardBody: React.FC<CardBodyProps> = ({ children, className = '', ...props }) => (
  <div className={`p-6 ${className}`} {...props}>
    {children}
  </div>
);

export interface CardFooterProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

const CardFooter: React.FC<CardFooterProps> = ({ children, className = '', ...props }) => (
  <div className={`px-6 py-4 bg-surface-raised/50 border-t border-border-subtle flex items-center justify-end gap-3 ${className}`} {...props}>
    {children}
  </div>
);

Card.Header = CardHeader;
Card.Body = CardBody;
Card.Footer = CardFooter;
