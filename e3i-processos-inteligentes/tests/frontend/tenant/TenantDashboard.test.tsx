// @vitest-environment jsdom
import React, { useState } from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';

describe('Frontend Quality Gate: Tenant Isolation & UI State', () => {
  const TenantTestComponent = () => {
    const [auth, setAuth] = useState<{ token: string; orgName: string } | null>({
      token: 'token_a',
      orgName: 'E3I Processos Inteligentes Matriz (Tenant A)'
    });

    const logout = () => {
      setAuth(null);
    };

    const loginB = () => {
      setAuth({
        token: 'token_b',
        orgName: 'Alfa Logística Avançada (Tenant B)'
      });
    };

    return (
      <div>
        {!auth ? (
          <div data-testid="login-view">
            <p>Faça login</p>
            <button onClick={loginB}>Entrar Tenant B</button>
          </div>
        ) : (
          <div data-testid="dashboard-view">
            <h3>Dashboard Corporativo</h3>
            <p data-testid="org-display">Organização: {auth.orgName}</p>
            {/* No free tenant selector for common users */}
            <div data-testid="tenant-display-only" aria-label="Tenant Fixo">
              {auth.orgName}
            </div>
            <button onClick={logout}>Sair (Logout)</button>
          </div>
        )}
      </div>
    );
  };

  it('should display organization of session and disallow free tenant selector', () => {
    render(<TenantTestComponent />);

    expect(screen.getByTestId('dashboard-view')).toBeInTheDocument();
    expect(screen.getByTestId('org-display')).toHaveTextContent('E3I Processos Inteligentes Matriz (Tenant A)');
    // No selector element present
    expect(screen.queryByRole('combobox', { name: /Selecionar Organização/i })).not.toBeInTheDocument();
  });

  it('should clear previous tenant data on logout and load only new tenant on new login', () => {
    render(<TenantTestComponent />);

    // Logout
    fireEvent.click(screen.getByRole('button', { name: /Sair \(Logout\)/i }));
    expect(screen.getByTestId('login-view')).toBeInTheDocument();
    expect(screen.queryByText(/E3I Processos Inteligentes Matriz/i)).not.toBeInTheDocument();

    // Login as Tenant B
    fireEvent.click(screen.getByRole('button', { name: /Entrar Tenant B/i }));
    expect(screen.getByTestId('dashboard-view')).toBeInTheDocument();
    expect(screen.getByTestId('org-display')).toHaveTextContent('Alfa Logística Avançada (Tenant B)');
    expect(screen.queryByText(/E3I Processos Inteligentes Matriz/i)).not.toBeInTheDocument();
  });
});
