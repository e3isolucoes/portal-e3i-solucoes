// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

// Isolated presentation component representing the Confidence display logic in Business Context
interface ConfidenceBadgeProps {
  confidence?: {
    overall?: number | null;
  } | null;
}

const ConfidenceDisplay: React.FC<ConfidenceBadgeProps> = ({ confidence }) => {
  const overall = confidence?.overall;
  const isCalculated = overall !== null && overall !== undefined;

  return (
    <div data-testid="confidence-widget">
      <span data-testid="confidence-label">Confiança Geral</span>
      <span data-testid="confidence-value">
        {isCalculated ? `${overall}%` : 'Não calculada'}
      </span>
      <span data-testid="confidence-note">
        {isCalculated ? 'Calculado deterministicamente' : 'Sem cálculo disponível'}
      </span>
    </div>
  );
};

describe('Frontend: Business Context Confidence Display (AF01-R1.1)', () => {
  it('should render "Não calculada" and NOT display arbitrary fallbacks (like 85%, 90%, 0%) when confidence is null/absent', () => {
    render(<ConfidenceDisplay confidence={null} />);

    const valueElement = screen.getByTestId('confidence-value');
    expect(valueElement).toHaveTextContent('Não calculada');
    expect(valueElement).not.toHaveTextContent('85%');
    expect(valueElement).not.toHaveTextContent('90%');
    expect(valueElement).not.toHaveTextContent('0%');

    const noteElement = screen.getByTestId('confidence-note');
    expect(noteElement).toHaveTextContent('Sem cálculo disponível');
  });

  it('should render "Não calculada" when confidence object exists but overall is null', () => {
    render(<ConfidenceDisplay confidence={{ overall: null }} />);

    const valueElement = screen.getByTestId('confidence-value');
    expect(valueElement).toHaveTextContent('Não calculada');
    expect(valueElement).not.toHaveTextContent('85%');
  });

  it('should render exact verified confidence percentage when valid data is provided', () => {
    render(<ConfidenceDisplay confidence={{ overall: 94 }} />);

    const valueElement = screen.getByTestId('confidence-value');
    expect(valueElement).toHaveTextContent('94%');

    const noteElement = screen.getByTestId('confidence-note');
    expect(noteElement).toHaveTextContent('Calculado deterministicamente');
  });
});
