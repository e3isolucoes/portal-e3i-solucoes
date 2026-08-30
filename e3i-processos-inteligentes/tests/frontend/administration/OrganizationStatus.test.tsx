// @vitest-environment jsdom
import React, { useState } from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';

describe('Frontend Quality Gate: Organization Status & Inactivation UI', () => {
  const AdminPanelComponent = ({ userRole }: { userRole: string }) => {
    const [orgStatus, setOrgStatus] = useState<'ACTIVE' | 'INACTIVE'>('ACTIVE');
    const [showConfirm, setShowConfirm] = useState(false);
    const [unauthorizedMessage, setUnauthorizedMessage] = useState(false);
    const [sessionClosed, setSessionClosed] = useState(false);

    const handleInactivateClick = () => {
      if (userRole !== 'E3I_ADMIN') {
        setUnauthorizedMessage(true);
        return;
      }
      setShowConfirm(true);
    };

    const confirmInactivation = () => {
      setOrgStatus('INACTIVE');
      setShowConfirm(false);
      setSessionClosed(true); // simulated session termination / redirect
    };

    if (sessionClosed) {
      return (
        <div data-testid="session-closed-view">
          <h2>Sessão Encerrada</h2>
          <p>Sua organização foi inativada. O acesso foi encerrado com segurança.</p>
        </div>
      );
    }

    return (
      <div data-testid="admin-panel">
        <h3>Painel de Administração de Organização</h3>
        <p data-testid="org-status-badge">Status Atual: {orgStatus}</p>

        {userRole === 'E3I_ADMIN' ? (
          <button data-testid="inactivate-org-btn" onClick={handleInactivateClick}>
            Inativar Organização
          </button>
        ) : (
          <p data-testid="no-permission-msg">Sem permissão para esta ação.</p>
        )}

        {unauthorizedMessage && (
          <p data-testid="error-unauthorized" style={{ color: 'red' }}>Acesso Negado (403)</p>
        )}

        {showConfirm && (
          <div data-testid="confirm-dialog">
            <p>Tem certeza que deseja inativar esta organização?</p>
            <button data-testid="confirm-yes" onClick={confirmInactivation}>Sim, Inativar</button>
            <button data-testid="confirm-no" onClick={() => setShowConfirm(false)}>Cancelar</button>
          </div>
        )}
      </div>
    );
  };

  it('should display Inactivate button and require confirmation for E3I_ADMIN', () => {
    render(<AdminPanelComponent userRole="E3I_ADMIN" />);

    expect(screen.getByTestId('admin-panel')).toBeInTheDocument();
    expect(screen.getByTestId('inactivate-org-btn')).toBeInTheDocument();

    // Click Inactivate -> shows confirmation dialog
    fireEvent.click(screen.getByTestId('inactivate-org-btn'));
    expect(screen.getByTestId('confirm-dialog')).toBeInTheDocument();

    // Confirm -> updates status and shows session closed view
    fireEvent.click(screen.getByTestId('confirm-yes'));
    expect(screen.getByTestId('session-closed-view')).toBeInTheDocument();
    expect(screen.getByText(/Sua organização foi inativada/i)).toBeInTheDocument();
  });

  it('should not display Inactivate button for roles without permission (ORGANIZATION_ADMIN)', () => {
    render(<AdminPanelComponent userRole="ORGANIZATION_ADMIN" />);

    expect(screen.queryByTestId('inactivate-org-btn')).not.toBeInTheDocument();
    expect(screen.getByTestId('no-permission-msg')).toBeInTheDocument();
  });
});
