import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Modal, Button, Badge } from './ui';
import { Command, HelpCircle, Compass, LayoutDashboard, Layers, Target, Network, Server, Building2, Users, ShieldCheck, FileText, Palette } from 'lucide-react';

export const KeyboardShortcutsModal: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Atalhos de Teclado & Acessibilidade"
      description="Navegue rapidamente pela plataforma E³I usando atalhos de teclado"
      maxWidth="lg"
    >
      <div className="space-y-6 text-sm text-text-secondary">
        <div className="space-y-3">
          <h4 className="font-bold text-text-primary text-xs uppercase tracking-wider">Navegação por Módulos (Pressione 'g' e depois a letra)</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="p-3 rounded-xl bg-surface-raised border border-border-subtle flex items-center justify-between">
              <span className="text-text-primary font-medium">Painel Inicial</span>
              <Badge variant="gold">g + d</Badge>
            </div>
            <div className="p-3 rounded-xl bg-surface-raised border border-border-subtle flex items-center justify-between">
              <span className="text-text-primary font-medium">Discovery</span>
              <Badge variant="gold">g + i</Badge>
            </div>
            <div className="p-3 rounded-xl bg-surface-raised border border-border-subtle flex items-center justify-between">
              <span className="text-text-primary font-medium">Contexto de Negócio</span>
              <Badge variant="gold">g + c</Badge>
            </div>
            <div className="p-3 rounded-xl bg-surface-raised border border-border-subtle flex items-center justify-between">
              <span className="text-text-primary font-medium">Strategy Canvas</span>
              <Badge variant="gold">g + s</Badge>
            </div>
            <div className="p-3 rounded-xl bg-surface-raised border border-border-subtle flex items-center justify-between">
              <span className="text-text-primary font-medium">Empresas (Tenants)</span>
              <Badge variant="gold">g + t</Badge>
            </div>
            <div className="p-3 rounded-xl bg-surface-raised border border-border-subtle flex items-center justify-between">
              <span className="text-text-primary font-medium">Usuários & Equipe</span>
              <Badge variant="gold">g + u</Badge>
            </div>
          </div>
        </div>

        <div className="space-y-3 pt-4 border-t border-border-subtle">
          <h4 className="font-bold text-text-primary text-xs uppercase tracking-wider">Comandos Globais</h4>
          <div className="space-y-2">
            <div className="p-3 rounded-xl bg-surface-raised border border-border-subtle flex items-center justify-between">
              <span className="text-text-primary font-medium">Abrir Ajuda de Atalhos</span>
              <Badge variant="info">?</Badge>
            </div>
            <div className="p-3 rounded-xl bg-surface-raised border border-border-subtle flex items-center justify-between">
              <span className="text-text-primary font-medium">Fechar Modais / Menus</span>
              <Badge variant="neutral">Esc</Badge>
            </div>
            <div className="p-3 rounded-xl bg-surface-raised border border-border-subtle flex items-center justify-between">
              <span className="text-text-primary font-medium">Focar Busca Global</span>
              <Badge variant="gold">Cmd/Ctrl + K</Badge>
            </div>
          </div>
        </div>

        <div className="pt-4 border-t border-border-subtle flex justify-end">
          <Button variant="primary" size="md" onClick={onClose}>
            Entendido
          </Button>
        </div>
      </div>
    </Modal>
  );
};
