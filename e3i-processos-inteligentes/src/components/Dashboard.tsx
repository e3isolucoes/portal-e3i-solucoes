import React from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  Building2, 
  Users, 
  ShieldCheck, 
  FileText, 
  ArrowRight, 
  Activity, 
  Layers,
  Compass,
  CheckCircle2
} from 'lucide-react';

export const Dashboard: React.FC = () => {
  const { user, tenant, tenants, auditLogs, setCurrentView } = useAuth();

  return (
    <div className="min-h-[calc(100vh-80px)] py-10 px-4 sm:px-6 lg:px-8 space-y-10 max-w-7xl mx-auto e3i-grid-bg">
      
      {/* Precision Header */}
      <div className="border-b border-border-subtle pb-6 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="text-xs font-mono text-gold tracking-widest uppercase mb-1">
            REF: E3I-M00-DASH • ESTAÇÃO DE TRABALHO ANALÍTICA
          </div>
          <h1 className="text-3xl font-display font-medium text-text-primary">
            Painel de Diagnóstico e Governança
          </h1>
          <p className="text-sm text-text-secondary mt-1">
            Organização ativa: <strong className="text-text-primary font-medium">{tenant?.name || 'N/A'}</strong> (CNPJ: <span className="tabular-nums">{tenant?.document || 'N/A'}</span>)
          </p>
        </div>

        <div className="flex items-center space-x-3 bg-surface border border-border-subtle px-4 py-2 text-xs font-mono">
          <span className="w-2 h-2 bg-success rounded-none" />
          <span className="text-text-secondary">ESTADO:</span>
          <span className="text-text-primary font-semibold">CONECTADO E AUDITADO</span>
        </div>
      </div>

      {/* KPI Instrument Grid (Tabular-nums, precise metrics, zero scale-110, zero pilled eyebrows) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        <div 
          onClick={() => setCurrentView('tenants')}
          className="bg-surface border border-border-subtle p-6 cursor-pointer hover:border-gold transition-colors space-y-3"
        >
          <div className="flex items-center justify-between text-xs text-text-muted font-mono">
            <span>MÓDULO: EMPRESAS</span>
            <span>[01]</span>
          </div>
          <div className="text-3xl font-mono font-semibold text-text-primary tabular-nums">
            {tenants.length}
          </div>
          <div className="text-xs text-text-secondary flex items-center justify-between pt-2 border-t border-border-subtle">
            <span>Inquilinos ativos</span>
            <ArrowRight className="w-3.5 h-3.5 text-gold" />
          </div>
        </div>

        <div 
          onClick={() => setCurrentView('rbac')}
          className="bg-surface border border-border-subtle p-6 cursor-pointer hover:border-gold transition-colors space-y-3"
        >
          <div className="flex items-center justify-between text-xs text-text-muted font-mono">
            <span>MÓDULO: SEGURANÇA</span>
            <span>[02]</span>
          </div>
          <div className="text-3xl font-mono font-semibold text-text-primary tabular-nums">
            4 Níveis
          </div>
          <div className="text-xs text-text-secondary flex items-center justify-between pt-2 border-t border-border-subtle">
            <span>RBAC e Permissões</span>
            <ArrowRight className="w-3.5 h-3.5 text-gold" />
          </div>
        </div>

        <div 
          onClick={() => setCurrentView('audit')}
          className="bg-surface border border-border-subtle p-6 cursor-pointer hover:border-gold transition-colors space-y-3"
        >
          <div className="flex items-center justify-between text-xs text-text-muted font-mono">
            <span>MÓDULO: AUDITORIA</span>
            <span>[03]</span>
          </div>
          <div className="text-3xl font-mono font-semibold text-text-primary tabular-nums">
            {auditLogs.length}
          </div>
          <div className="text-xs text-text-secondary flex items-center justify-between pt-2 border-t border-border-subtle">
            <span>Eventos registrados</span>
            <ArrowRight className="w-3.5 h-3.5 text-gold" />
          </div>
        </div>

        <div 
          onClick={() => setCurrentView('users')}
          className="bg-surface border border-border-subtle p-6 cursor-pointer hover:border-gold transition-colors space-y-3"
        >
          <div className="flex items-center justify-between text-xs text-text-muted font-mono">
            <span>MÓDULO: COLABORADORES</span>
            <span>[04]</span>
          </div>
          <div className="text-3xl font-mono font-semibold text-text-primary tabular-nums">
            {tenant?.usersCount ?? 1}
          </div>
          <div className="text-xs text-text-secondary flex items-center justify-between pt-2 border-t border-border-subtle">
            <span>Usuários vinculados</span>
            <ArrowRight className="w-3.5 h-3.5 text-gold" />
          </div>
        </div>

      </div>

      {/* Main Analysis Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Recent Audit Trail (Cartographic Ledger) */}
        <div className="lg:col-span-2 bg-surface border border-border-subtle p-6 space-y-6">
          <div className="flex items-center justify-between border-b border-border-subtle pb-4">
            <h2 className="text-base font-display font-medium text-text-primary flex items-center space-x-2">
              <Activity className="w-4 h-4 text-gold" />
              <span>Trilha de Auditoria Recente</span>
            </h2>
            <button 
              onClick={() => setCurrentView('audit')}
              className="text-xs font-mono text-accent hover:underline"
            >
              VER REGISTRO COMPLETO →
            </button>
          </div>

          <div className="space-y-3 font-mono text-xs">
            {auditLogs.slice(0, 5).map((log) => (
              <div key={log.id} className="p-3 bg-surface-raised border border-border-subtle flex items-center justify-between">
                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    <span className="text-gold font-semibold">[{log.action}]</span>
                    <span className="text-text-primary">{log.userName}</span>
                  </div>
                  <div className="text-text-muted text-[11px]">{log.details}</div>
                </div>
                <div className="text-text-muted text-[11px] tabular-nums shrink-0">{log.timestamp}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Tenant Dossier Sidebar */}
        <div className="bg-surface border border-border-subtle p-6 space-y-6">
          <div className="border-b border-border-subtle pb-4">
            <h2 className="text-base font-display font-medium text-text-primary flex items-center space-x-2">
              <Building2 className="w-4 h-4 text-gold" />
              <span>Ficha Técnica do Inquilino</span>
            </h2>
          </div>

          {tenant && (
            <div className="space-y-4 font-mono text-xs">
              <div className="flex justify-between py-2 border-b border-border-subtle">
                <span className="text-text-secondary">Razão Social:</span>
                <span className="text-text-primary font-sans font-medium text-right">{tenant.name}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-border-subtle">
                <span className="text-text-secondary">CNPJ:</span>
                <span className="text-text-primary tabular-nums">{tenant.document}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-border-subtle">
                <span className="text-text-secondary">Plano Contratado:</span>
                <span className="text-gold font-semibold">{tenant.plan}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-border-subtle">
                <span className="text-text-secondary">Sessão Atual:</span>
                <span className="text-text-primary">{user?.name} ({user?.role})</span>
              </div>
            </div>
          )}

          <div className="pt-2">
            <button
              onClick={() => setCurrentView('designSystem')}
              className="w-full py-2.5 px-4 bg-surface-raised border border-border-strong text-text-primary text-xs font-mono tracking-wider hover:border-gold transition-colors flex items-center justify-center space-x-2"
            >
              <Compass className="w-4 h-4 text-gold" />
              <span>CONSULTAR DESIGN SYSTEM E3I</span>
            </button>
          </div>
        </div>

      </div>

    </div>
  );
};

