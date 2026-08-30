import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { getErrorMessage, getAuthHeaders } from '../utils';
import { 
  Building2, 
  Users, 
  ShieldAlert, 
  CheckCircle2, 
  AlertTriangle, 
  Plus, 
  Edit3, 
  Trash2, 
  Layers, 
  Network, 
  UserCheck, 
  Sparkles, 
  FileText,
  Search,
  Check,
  X,
  ArrowRight,
  Compass,
  Link2
} from 'lucide-react';
import { OrganizationMap, OrganizationArea, OrganizationalRole, OrganizationalPerson, Responsibility, ReportingRelationship, OrganizationalDependency, OrganizationalGap } from '../types';

export const OrganizationMapView: React.FC = () => {
  const { user, tenant } = useAuth();
  const [orgMap, setOrgMap] = useState<OrganizationMap | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'simples' | 'organograma' | 'gaps'>('simples');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Modal states
  const [areaModalOpen, setAreaModalOpen] = useState(false);
  const [editingArea, setEditingArea] = useState<Partial<OrganizationArea> | null>(null);

  const fetchOrgMap = async () => {
    setLoading(true);
    try {
      const headers = getAuthHeaders();
      const res = await fetch('/api/organization-map', {
        headers,
        credentials: 'include'
      });
      if (res.ok) {
        const data = await res.json();
        setOrgMap(data);
      } else {
        const err = await res.json();
        setErrorMsg(getErrorMessage(err, 'Erro ao carregar o Organograma.'));
      }
    } catch (e) {
      console.error(e);
      setErrorMsg('Erro de conexão com o servidor.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrgMap();
  }, [tenant?.id]);

  const handleSaveArea = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingArea || !editingArea.nome) return;
    try {
      const headers = getAuthHeaders({ 'Content-Type': 'application/json' });
      const res = await fetch('/api/organization-map/area', {
        method: 'POST',
        headers,
        credentials: 'include',
        body: JSON.stringify(editingArea)
      });
      if (res.ok) {
        const updated = await res.json();
        setOrgMap(updated);
        setAreaModalOpen(false);
        setEditingArea(null);
        setSuccessMsg('Área salva com sucesso!');
        setTimeout(() => setSuccessMsg(null), 3000);
      } else {
        const err = await res.json();
        setErrorMsg(getErrorMessage(err, 'Erro ao salvar área.'));
      }
    } catch (e) {
      console.error(e);
      setErrorMsg('Erro ao salvar área.');
    }
  };

  const handleConfirmArea = async (areaId: string) => {
    try {
      const headers = getAuthHeaders({ 'Content-Type': 'application/json' });
      const res = await fetch('/api/organization-map/area', {
        method: 'POST',
        headers,
        credentials: 'include',
        body: JSON.stringify({ id: areaId, validationStatus: 'CONFIRMED', status: 'Ativa' })
      });
      if (res.ok) {
        const updated = await res.json();
        setOrgMap(updated);
        setSuccessMsg('Área confirmada com sucesso!');
        setTimeout(() => setSuccessMsg(null), 3000);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleResolveGap = async (gapId: string) => {
    try {
      const headers = getAuthHeaders({ 'Content-Type': 'application/json' });
      const res = await fetch('/api/organization-map/gap/resolve', {
        method: 'POST',
        headers,
        credentials: 'include',
        body: JSON.stringify({ gapId })
      });
      if (res.ok) {
        const updated = await res.json();
        setOrgMap(updated);
        setSuccessMsg('Lacuna resolvida com sucesso!');
        setTimeout(() => setSuccessMsg(null), 3000);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleAISynthesize = async () => {
    try {
      setLoading(true);
      const headers = getAuthHeaders();
      const res = await fetch('/api/organization-map/ai-synthesize', {
        method: 'POST',
        headers,
        credentials: 'include'
      });
      if (res.ok) {
        const updated = await res.json();
        setOrgMap(updated);
        setSuccessMsg('Síntese e cruzamento efetuados via Gemini com sucesso.');
        setTimeout(() => setSuccessMsg(null), 4000);
      }
    } catch (e) {
      console.error(e);
      setErrorMsg('Erro na síntese com IA.');
    } finally {
      setLoading(false);
    }
  };

  if (loading && !orgMap) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center bg-canvas">
        <div className="text-center space-y-4 font-mono text-xs text-text-secondary">
          <div className="w-8 h-8 border-2 border-accent border-t-transparent animate-spin mx-auto" />
          <p>CARREGANDO ESTAÇÃO ORG MAPPER...</p>
        </div>
      </div>
    );
  }

  const openAreas = orgMap?.areas || [];
  const openRoles = orgMap?.roles || [];
  const openPeople = orgMap?.people || [];
  const openResponsibilities = orgMap?.responsibilities || [];
  const openGaps = orgMap?.gaps || [];
  const openDependencies = orgMap?.dependencies || [];

  return (
    <div className="min-h-[calc(100vh-80px)] bg-canvas text-text-primary py-10 px-4 sm:px-6 lg:px-8 e3i-grid-bg">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Precision Header */}
        <div className="border-b border-border-subtle pb-6 flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <div className="text-xs font-mono text-gold tracking-widest uppercase mb-1">
              REF: E3I-M04-ORG • CARTOGRAFIA ORGANIZACIONAL
            </div>
            <h1 className="text-3xl font-display font-medium text-text-primary">
              Organization Mapper
            </h1>
            <p className="text-sm text-text-secondary mt-1">
              Mapeamento de estruturas, áreas, responsabilidades, dependências e organograma analítico para tomada de decisão.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleAISynthesize}
              className="px-4 py-2.5 bg-surface-raised border border-border-strong text-text-primary text-xs font-mono tracking-wider hover:border-gold transition-colors flex items-center space-x-2"
              title="Cruza dados do Discovery e Strategy Canvas"
            >
              <Sparkles className="w-4 h-4 text-gold" />
              <span>SINTETIZAR (LLM LAST)</span>
            </button>

            <button
              onClick={() => {
                setEditingArea({ nome: '', objetivo: '', responsavel: '', status: 'Ativa', confidence: 90, validationStatus: 'CONFIRMED' });
                setAreaModalOpen(true);
              }}
              className="px-4 py-2.5 bg-accent hover:bg-accent-hover text-white text-xs font-mono tracking-wider transition-colors flex items-center space-x-2"
            >
              <Plus className="w-4 h-4" />
              <span>NOVA ÁREA</span>
            </button>
          </div>
        </div>

        {/* Notifications */}
        {successMsg && (
          <div className="p-4 bg-surface border border-success text-success text-xs font-mono flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}
        {errorMsg && (
          <div className="p-4 bg-surface border border-danger text-danger text-xs font-mono flex items-center space-x-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Metrics Bar (Tabular-nums) */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-4 font-mono">
          <div className="bg-surface border border-border-subtle p-4 space-y-1">
            <span className="text-[11px] text-text-muted">ÁREAS</span>
            <div className="text-2xl font-semibold text-text-primary tabular-nums">{openAreas.length}</div>
          </div>
          <div className="bg-surface border border-border-subtle p-4 space-y-1">
            <span className="text-[11px] text-text-muted">FUNÇÕES</span>
            <div className="text-2xl font-semibold text-text-primary tabular-nums">{openRoles.length}</div>
          </div>
          <div className="bg-surface border border-border-subtle p-4 space-y-1">
            <span className="text-[11px] text-text-muted">COLABORADORES</span>
            <div className="text-2xl font-semibold text-text-primary tabular-nums">{openPeople.length}</div>
          </div>
          <div className="bg-surface border border-border-subtle p-4 space-y-1">
            <span className="text-[11px] text-text-muted">RESPONSABILIDADES</span>
            <div className="text-2xl font-semibold text-text-primary tabular-nums">{openResponsibilities.length}</div>
          </div>
          <div className="bg-surface border border-border-subtle p-4 space-y-1">
            <span className="text-[11px] text-text-muted">DEPENDÊNCIAS</span>
            <div className="text-2xl font-semibold text-text-primary tabular-nums">{openDependencies.length}</div>
          </div>
          <div className="bg-surface border border-border-subtle p-4 space-y-1">
            <span className="text-[11px] text-text-muted">LACUNAS (GAPS)</span>
            <div className="text-2xl font-semibold text-warning tabular-nums">{openGaps.filter(g => g.status === 'OPEN').length}</div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-border-subtle font-mono text-xs">
          {[
            { id: 'simples', label: '01. ÁREAS & ESTRUTURA' },
            { id: 'organograma', label: '02. ORGANOGRAMA & RELAÇÕES' },
            { id: 'gaps', label: `03. LACUNAS E PENDÊNCIAS (${openGaps.filter(g => g.status === 'OPEN').length})` }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-6 py-3 border-b-2 font-semibold transition-colors ${
                activeTab === tab.id
                  ? 'border-gold text-text-primary bg-surface'
                  : 'border-transparent text-text-muted hover:text-text-secondary'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content 1: Áreas & Estrutura */}
        {activeTab === 'simples' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {openAreas.map(area => (
                <div key={area.id} className="bg-surface border border-border-subtle p-6 space-y-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="text-[10px] font-mono text-gold uppercase">ÁREA ORGANIZACIONAL</span>
                      <h3 className="text-lg font-display font-medium text-text-primary mt-0.5">{area.nome}</h3>
                    </div>
                    <span className={`text-[10px] font-mono px-2 py-0.5 border ${
                      area.validationStatus === 'CONFIRMED'
                        ? 'border-success text-success bg-surface-raised'
                        : 'border-warning text-warning bg-surface-raised'
                    }`}>
                      {area.validationStatus || 'DRAFT'}
                    </span>
                  </div>

                  <p className="text-xs text-text-secondary">{area.objetivo || 'Sem objetivo declarado.'}</p>

                  <div className="pt-2 border-t border-border-subtle text-xs font-mono space-y-1.5">
                    <div className="flex justify-between">
                      <span className="text-text-muted">RESPONSÁVEL:</span>
                      <span className="text-text-primary">{area.responsavel || 'Não definido'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-text-muted">STATUS:</span>
                      <span className="text-text-primary">{area.status}</span>
                    </div>
                  </div>

                  <div className="pt-4 flex items-center justify-between border-t border-border-subtle">
                    <button
                      onClick={() => {
                        setEditingArea(area);
                        setAreaModalOpen(true);
                      }}
                      className="text-xs font-mono text-accent hover:underline flex items-center space-x-1"
                    >
                      <Edit3 className="w-3 h-3" />
                      <span>EDITAR</span>
                    </button>

                    {area.validationStatus !== 'CONFIRMED' && (
                      <button
                        onClick={() => handleConfirmArea(area.id)}
                        className="text-xs font-mono text-success hover:underline flex items-center space-x-1"
                      >
                        <Check className="w-3 h-3" />
                        <span>CONFIRMAR</span>
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab Content 2: Organograma & Relações */}
        {activeTab === 'organograma' && (
          <div className="space-y-6">
            <div className="bg-surface border border-border-subtle p-6 space-y-6">
              <h2 className="text-lg font-display font-medium text-text-primary">Hierarquia de Reporte & Relações</h2>
              
              <div className="space-y-3 font-mono text-xs">
                {(orgMap?.reportingRelationships || []).map((rel, idx) => (
                  <div key={idx} className="p-3 bg-surface-raised border border-border-subtle flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <span className="text-gold">[{rel.fromId}]</span>
                      <ArrowRight className="w-3.5 h-3.5 text-text-muted" />
                      <span className="text-text-primary">TIPO: {rel.relationshipType} → {rel.toId}</span>
                    </div>
                    <span className="text-text-muted text-[11px]">{rel.status || 'Ativo'}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-surface border border-border-subtle p-6 space-y-6">
              <h2 className="text-lg font-display font-medium text-text-primary">Colaboradores & Funções Vinculadas</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 font-mono text-xs">
                {openPeople.map(p => (
                  <div key={p.id} className="p-4 bg-surface-raised border border-border-subtle space-y-2">
                    <div className="font-semibold text-text-primary text-sm font-sans">{p.nome}</div>
                    <div className="text-text-secondary">{p.cargo} • <span className="text-gold">{p.departamento}</span></div>
                    <div className="text-text-muted text-[11px]">{p.email}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Tab Content 3: Lacunas & Pendências */}
        {activeTab === 'gaps' && (
          <div className="space-y-4">
            {openGaps.length === 0 ? (
              <div className="p-12 text-center bg-surface border border-border-subtle font-mono text-xs text-text-muted">
                NENHUMA LACUNA OU INCONSISTÊNCIA DETECTADA NA CARTOGRAFIA ATUAL.
              </div>
            ) : (
              openGaps.map(gap => (
                <div key={gap.id} className="bg-surface border border-border-subtle p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2 font-mono text-xs">
                      <span className={`px-2 py-0.5 border ${
                        gap.severity === 'HIGH' ? 'border-warning text-warning' :
                        gap.severity === 'MEDIUM' ? 'border-info text-info' :
                        'border-accent text-accent'
                      }`}>
                        {gap.severity}
                      </span>
                      <span className="text-text-muted">TIPO: {gap.type}</span>
                    </div>
                    <p className="text-sm text-text-primary font-medium">{gap.description}</p>
                  </div>

                  <div className="flex items-center space-x-3">
                    <span className={`text-xs font-mono px-3 py-1 border ${
                      gap.status === 'RESOLVED' ? 'border-success text-success' : 'border-warning text-warning'
                    }`}>
                      {gap.status}
                    </span>
                    {gap.status === 'OPEN' && (
                      <button
                        onClick={() => handleResolveGap(gap.id)}
                        className="px-4 py-2 bg-surface-raised border border-border-strong text-text-primary text-xs font-mono hover:border-gold transition-colors"
                      >
                        RESOLVER
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        )}

      </div>

      {/* Area Modal */}
      {areaModalOpen && editingArea && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-surface border border-border-strong max-w-lg w-full p-6 space-y-6">
            <div className="flex justify-between items-center border-b border-border-subtle pb-4">
              <h3 className="text-lg font-display font-medium text-text-primary">
                {editingArea.id ? 'Editar Área Organizacional' : 'Nova Área Organizacional'}
              </h3>
              <button onClick={() => setAreaModalOpen(false)} className="text-text-muted hover:text-text-primary">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveArea} className="space-y-4 font-mono text-xs">
              <div className="space-y-1.5">
                <label className="text-text-secondary">Nome da Área:</label>
                <input
                  type="text"
                  required
                  value={editingArea.nome || ''}
                  onChange={e => setEditingArea({ ...editingArea, nome: e.target.value })}
                  className="w-full bg-surface-raised border border-border-strong px-3 py-2 text-text-primary focus:border-gold outline-none"
                  placeholder="Ex: Controladoria Corporativa"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-text-secondary">Objetivo:</label>
                <textarea
                  rows={3}
                  value={editingArea.objetivo || ''}
                  onChange={e => setEditingArea({ ...editingArea, objetivo: e.target.value })}
                  className="w-full bg-surface-raised border border-border-strong px-3 py-2 text-text-primary focus:border-gold outline-none resize-none"
                  placeholder="Descreva o propósito da área..."
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-text-secondary">Responsável:</label>
                <input
                  type="text"
                  value={editingArea.responsavel || ''}
                  onChange={e => setEditingArea({ ...editingArea, responsavel: e.target.value })}
                  className="w-full bg-surface-raised border border-border-strong px-3 py-2 text-text-primary focus:border-gold outline-none"
                  placeholder="Nome do gestor ou controller"
                />
              </div>

              <div className="pt-4 flex justify-end space-x-3 border-t border-border-subtle">
                <button
                  type="button"
                  onClick={() => setAreaModalOpen(false)}
                  className="px-4 py-2 bg-surface-raised border border-border-strong text-text-secondary hover:text-text-primary"
                >
                  CANCELAR
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-accent hover:bg-accent-hover text-white font-semibold"
                >
                  SALVAR ÁREA
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
