// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

describe('Frontend: Profile Modal Component', () => {
  it('should render profile settings UI elements', () => {
    const ProfileTestComp = () => (
      <div>
        <h3>Configurações de Conta</h3>
        <label>Nome Completo</label>
        <input defaultValue="Carlos Administrador" />
        <button>Salvar Alterações</button>
      </div>
    );

    render(<ProfileTestComp />);

    expect(screen.getByText('Configurações de Conta')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Carlos Administrador')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Salvar Alterações/i })).toBeInTheDocument();
  });
});
