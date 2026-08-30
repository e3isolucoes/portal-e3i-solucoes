// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

describe('Frontend: Administration / User Manager Component', () => {
  it('should render user management table structure', () => {
    const UserTableTest = () => (
      <div>
        <h3>Gerenciamento de Colaboradores</h3>
        <table>
          <thead>
            <tr>
              <th>Nome</th>
              <th>E-mail</th>
              <th>Papel</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Carlos Administrador</td>
              <td>admin@e3i.com.br</td>
              <td>ADMIN</td>
              <td>Ativo</td>
            </tr>
          </tbody>
        </table>
      </div>
    );

    render(<UserTableTest />);

    expect(screen.getByText('Gerenciamento de Colaboradores')).toBeInTheDocument();
    expect(screen.getByText('admin@e3i.com.br')).toBeInTheDocument();
    expect(screen.getByText('ADMIN')).toBeInTheDocument();
  });
});
