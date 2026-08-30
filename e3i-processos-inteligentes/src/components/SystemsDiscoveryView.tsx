import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { getErrorMessage, getAuthHeaders } from '../utils';
import { 
  Server, 
  Cpu, 
  Network, 
  FileSpreadsheet, 
  AlertTriangle, 
  CheckCircle2, 
  XCircle, 
  Plus, 
  Sparkles, 
  ShieldCheck, 
  Layers, 
  ArrowRight, 
  RefreshCw, 
  Loader2, 
  Check, 
  Trash2, 
  Clock, 
  User, 
  Tag
} from 'lucide-react';

export const SystemsDiscoveryView: React.FC = () => {
  const { user, tenant, theme } = useAuth();
  const [activeTab, setActiveTab] = useState<'systems' | 'flows' | 'manual' | 'opportunities'>('systems');
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [synthLoading, setSynthLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Modal / Add states
  const [showAddSystemModal, setShowAddSystemModal] = useState(false);
  const [newSysName, setNewSysName] = useState('');
  const [newSysCategory, setNewSysCategory] = useState('ERP');
  const [newSysPurpose, setNewSysPurpose] = useState('');
  const [newSysOwner, setNewSysOwner] = useState('');
  const [newSysCriticality, setNewSysCriticality] = useState('HIGH');

  const [showAddManualModal, setShowAddManualModal] = useState(false);
  const [manResp, setManResp] = useState('');
  const [manPurpose, setManPurpose] = useState('');
  const [manFreq, setManFreq] = useState('Diária');
  const [manOrigin, setManOrigin] = useState('');
  const [manTarget, setManTarget] = useState('');
  const [manRisk, setManRisk] = useState('');
  const [manRework, setManRework] = useState('');

  const fetchDiscovery = async () => {
    try {
      setLoading(true);
      const headers = getAuthHeaders();
      const res = await fetch('/api/systems/discovery', {
        headers,
        credentials: 'include'
      });
      if (res.ok) {
        const json = await res.json();
        setData(json);
      } else {
        setError('Erro ao carregar o inventário de sistemas.');
      }
    } catch (err) {
      console.error(err);
      setError('Erro de conexão com o servidor.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDiscovery();
  }, [tenant?.id]);

  const handleAction = async (action: string, payload: any) => {
    try {
      const headers = getAuthHeaders({ 'Content-Type': 'application/json' });
      const res = await fetch('/api/systems/action', {
        method: 'POST',
        headers,
        credentials: 'include',
        body: JSON.stringify({ action, payload })
      });
      if (res.ok) {
        const json = await res.json();
        setData(json);
        setSuccessMsg('Ação realizada com sucesso.');
        setTimeout(() => setSuccessMsg(null), 3000);
      } else {
        const err = await res.json();
        alert(getErrorMessage(err, 'Erro ao processar ação.'));
      }
    } catch (e) {
      console.error(e);
      alert('Erro de conexão.');
    }
  };

  const handleAISynthesis = async () => {
    try {
      setSynthLoading(true);
      const headers = getAuthHeaders();
      const res = await fetch('/api/systems/ai-synthesize', {
        method: 'POST',
        headers,
        credentials: 'include'
      });
      if (res.ok) {
        const json = await res.json();
        setData(json);
        setSuccessMsg('Sintonia LLM Last executada com sucesso com base no Discovery e Org Mapper.');
        setTimeout(() => setSuccessMsg(null), 4000);
      } else {
        alert('Erro ao sintetizar com Gemini.');
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSynthLoading(false);
    }
  };

  const handleCreateSystem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSysName) return;
    await handleAction('ADD_SYSTEM', {
      name: newSysName,
      category: newSysCategory,
      purpose: newSysPurpose,
      owner: newSysOwner || 'Não definido',
      criticality: newSysCriticality,
      vendor: newSysCategory,
      dataHandled: 'Dados operacionais',
      authenticationType: 'API / Manual',
      integrationCapability: 'UNKNOWN',
      source: 'Cadastrado Manualmente',
      confidence: 100,
      validationStatus: 'CONFIRMED'
    });
    setNewSysName('');
    setNewSysPurpose('');
    setNewSysOwner('');
    setShowAddSystemModal(false);
  };

  const handleCreateManualControl = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manPurpose || !manResp) return;
    await handleAction('ADD_MANUAL_CONTROL', {
      responsible: manResp,
      purpose: manPurpose,
      frequency: manFreq,
      origin: manOrigin || 'Origem não informada',
      target: manTarget || 'Destino não informado',
      risk: manRisk || 'Risco operacional',
      estimatedRework: manRework || '4h/semana'
    });
    setManResp('');
    setManPurpose('');
    setManOrigin('');
    setManTarget('');
    setManRisk('');
    setManRework('');
    setShowAddManualModal(false);
  };

  if (loading) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center bg-[#070D1A] text-slate-100">
        <Loader2 className="w-8 h-8 animate-spin text-[#3B82F6]" />
      </div>
    );
  }

  const metrics = data?.metrics || {
    totalSystems: 0,
    criticalSystems: 0,
    manualControls: 0,
    flows: 0,
    existingIntegrations: 0,
    opportunities: 0,
    gaps: 0,
    unassignedSystems: 0
  };

  return (
    <div className="min-h-[calc(100vh-80px)] bg-[#070D1A] text-slate-100 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Header & LLM Last Action */}
        <div className="bg-[#0A192F] border border-[#D4AF37]/30 rounded-2xl p-8 shadow-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="flex items-center space-x-4">
            <div className="w-16 h-16 rounded-2xl bg-[#D4AF37]/10 border border-[#D4AF37]/30 flex items-center justify-center text-3xl">
              🔌
            </div>
            <div>
              <div className="flex items-center space-x-3">
                <span className="text-xs uppercase tracking-wider text-[#D4AF37] font-semibold">Sprint 2.4</span>
                <span className="px-2.5 py-0.5 bg-blue-500/20 text-blue-300 border border-blue-500/40 rounded-full text-xs font-semibold">
                  Systems & Integrations Discovery
                </span>
              </div>
              <h1 className="text-3xl font-bold text-white mt-1">Inventário e Fluxos de Sistemas</h1>
              <p className="text-slate-400 text-sm mt-1">
                Descoberta e mapeamento estruturado dos softwares, controles manuais, fluxos de informação e oportunidades de integração de {tenant?.name || 'Organização'}.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={handleAISynthesis}
              disabled={synthLoading}
              className="px-5 py-3 bg-gradient-to-r from-[#D4AF37] to-amber-600 hover:opacity-90 rounded-xl font-medium text-[#070D1A] font-bold transition-all shadow-lg flex items-center space-x-2 disabled:opacity-50"
            >
              {synthLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              <span>Sintetizar com LLM Last</span>
            </button>
            <button
              onClick={() => setShowAddSystemModal(true)}
              className="px-4 py-3 bg-[#3B82F6] hover:bg-blue-600 rounded-xl font-medium text-white transition-all shadow-lg flex items-center space-x-2"
            >
              <Plus className="w-4 h-4" />
              <span>Adicionar Sistema</span>
            </button>
          </div>
        </div>

        {successMsg && (
          <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 px-4 py-3 rounded-xl flex items-center space-x-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Metrics Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-4">
          <div className="bg-[#0A192F] border border-slate-800 rounded-xl p-4 text-center">
            <span className="block text-2xl font-bold text-white">{metrics.totalSystems}</span>
            <span className="text-xs text-slate-400">Sistemas</span>
          </div>
          <div className="bg-[#0A192F] border border-slate-800 rounded-xl p-4 text-center">
            <span className="block text-2xl font-bold text-rose-400">{metrics.criticalSystems}</span>
            <span className="text-xs text-slate-400">Críticos</span>
          </div>
          <div className="bg-[#0A192F] border border-slate-800 rounded-xl p-4 text-center">
            <span className="block text-2xl font-bold text-amber-400">{metrics.manualControls}</span>
            <span className="text-xs text-slate-400">Controles Manuais</span>
          </div>
          <div className="bg-[#0A192F] border border-slate-800 rounded-xl p-4 text-center">
            <span className="block text-2xl font-bold text-blue-400">{metrics.flows}</span>
            <span className="text-xs text-slate-400">Fluxos de Dados</span>
          </div>
          <div className="bg-[#0A192F] border border-slate-800 rounded-xl p-4 text-center">
            <span className="block text-2xl font-bold text-emerald-400">{metrics.existingIntegrations}</span>
            <span className="text-xs text-slate-400">Integrações</span>
          </div>
          <div className="bg-[#0A192F] border border-slate-800 rounded-xl p-4 text-center">
            <span className="block text-2xl font-bold text-purple-400">{metrics.opportunities}</span>
            <span className="text-xs text-slate-400">Oportunidades</span>
          </div>
          <div className="bg-[#0A192F] border border-slate-800 rounded-xl p-4 text-center">
            <span className="block text-2xl font-bold text-rose-400">{metrics.gaps}</span>
            <span className="text-xs text-slate-400">Gaps Identificados</span>
          </div>
          <div className="bg-[#0A192F] border border-slate-800 rounded-xl p-4 text-center">
            <span className="block text-2xl font-bold text-amber-300">{metrics.unassignedSystems}</span>
            <span className="text-xs text-slate-400">Sem Responsável</span>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-800 space-x-2">
          <button
            onClick={() => setActiveTab('systems')}
            className={`pb-3 px-4 text-sm font-medium border-b-2 transition-all flex items-center space-x-2 ${
              activeTab === 'systems'
                ? 'border-[#3B82F6] text-[#3B82F6]'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Server className="w-4 h-4" />
            <span>1. Sistemas ({data?.systems?.length || 0})</span>
          </button>
          <button
            onClick={() => setActiveTab('flows')}
            className={`pb-3 px-4 text-sm font-medium border-b-2 transition-all flex items-center space-x-2 ${
              activeTab === 'flows'
                ? 'border-[#3B82F6] text-[#3B82F6]'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Network className="w-4 h-4" />
            <span>2. Mapa de Informação ({data?.informationFlows?.length || 0})</span>
          </button>
          <button
            onClick={() => setActiveTab('manual')}
            className={`pb-3 px-4 text-sm font-medium border-b-2 transition-all flex items-center space-x-2 ${
              activeTab === 'manual'
                ? 'border-[#3B82F6] text-[#3B82F6]'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>3. Controles Manuais ({data?.manualControls?.length || 0})</span>
          </button>
          <button
            onClick={() => setActiveTab('opportunities')}
            className={`pb-3 px-4 text-sm font-medium border-b-2 transition-all flex items-center space-x-2 ${
              activeTab === 'opportunities'
                ? 'border-[#3B82F6] text-[#3B82F6]'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Sparkles className="w-4 h-4 text-[#D4AF37]" />
            <span>4. Oportunidades & Gaps ({data?.opportunities?.length || 0})</span>
          </button>
        </div>

        {/* Tab 1: Systems */}
        {activeTab === 'systems' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-bold text-white">Sistemas e Softwares Mapeados</h2>
              <span className="text-xs text-slate-400">Normalizados com o Catálogo Corporativo E3I</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {data?.systems?.map((sys: any) => (
                <div key={sys.id} className="bg-[#0A192F] border border-slate-800 rounded-2xl p-6 shadow-md space-y-4 flex flex-col justify-between">
                  <div className="space-y-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="text-xs font-semibold text-[#D4AF37] uppercase tracking-wider">{sys.category}</span>
                        <h3 className="text-lg font-bold text-white mt-0.5">{sys.name}</h3>
                      </div>
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                        sys.criticality === 'CRITICAL' ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40' :
                        sys.criticality === 'HIGH' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' :
                        'bg-blue-500/20 text-blue-300 border border-blue-500/40'
                      }`}>
                        {sys.criticality}
                      </span>
                    </div>

                    <p className="text-sm text-slate-300">{sys.purpose}</p>

                    <div className="space-y-1.5 text-xs text-slate-400 pt-2 border-t border-slate-800">
                      <div className="flex items-center space-x-2">
                        <User className="w-3.5 h-3.5 text-[#3B82F6]" />
                        <span>Responsável: <strong className="text-slate-200">{sys.owner}</strong></span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Layers className="w-3.5 h-3.5 text-[#3B82F6]" />
                        <span>Áreas: {sys.areasUsing?.join(', ')}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Tag className="w-3.5 h-3.5 text-[#3B82F6]" />
                        <span>Capacidade: {sys.integrationCapability}</span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-slate-800 flex items-center justify-between">
                    <span className={`text-xs px-2 py-1 rounded-md font-medium ${
                      sys.validationStatus === 'CONFIRMED' ? 'bg-emerald-500/20 text-emerald-300' :
                      sys.validationStatus === 'REJECTED' ? 'bg-rose-500/20 text-rose-300' :
                      'bg-amber-500/20 text-amber-300'
                    }`}>
                      {sys.validationStatus}
                    </span>

                    <div className="flex items-center space-x-2">
                      {sys.validationStatus !== 'CONFIRMED' && (
                        <button
                          onClick={() => handleAction('CONFIRM_SYSTEM', { id: sys.id })}
                          className="px-3 py-1.5 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/40 rounded-lg text-xs font-medium transition-all flex items-center space-x-1"
                        >
                          <Check className="w-3 h-3" />
                          <span>Confirmar</span>
                        </button>
                      )}
                      {sys.validationStatus !== 'REJECTED' && (
                        <button
                          onClick={() => handleAction('REJECT_SYSTEM', { id: sys.id })}
                          className="px-3 py-1.5 bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 border border-rose-500/40 rounded-lg text-xs font-medium transition-all"
                        >
                          Rejeitar
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab 2: Information Flows */}
        {activeTab === 'flows' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-bold text-white">Mapa de Fluxos de Informação</h2>
              <span className="text-xs text-slate-400">Relações de dados entre sistemas e pessoas</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {data?.informationFlows?.map((flow: any) => (
                <div key={flow.id} className="bg-[#0A192F] border border-slate-800 rounded-2xl p-6 shadow-md space-y-4">
                  <div className="flex justify-between items-start">
                    <span className="px-2.5 py-0.5 bg-blue-500/20 text-blue-300 border border-blue-500/40 rounded-full text-xs font-semibold">
                      {flow.mechanism}
                    </span>
                    <span className="text-xs text-slate-400">Confiança: {flow.confidence}%</span>
                  </div>

                  <div className="bg-slate-900/60 p-4 rounded-xl border border-slate-800 space-y-2 text-center">
                    <span className="block font-bold text-white text-sm">{flow.source}</span>
                    <ArrowRight className="w-4 h-4 text-[#D4AF37] mx-auto my-1" />
                    <span className="block font-bold text-[#3B82F6] text-sm">{flow.target}</span>
                  </div>

                  <div className="space-y-1 text-xs text-slate-300">
                    <p><strong>Tipo de Dado:</strong> {flow.dataType}</p>
                    <p><strong>Frequência:</strong> {flow.frequency}</p>
                    <p><strong>Direção:</strong> {flow.direction}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab 3: Manual Controls */}
        {activeTab === 'manual' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-xl font-bold text-white">Controles Manuais & Planilhas Paralelas</h2>
                <p className="text-xs text-slate-400">Identificação de planilhas, copiar/colar e controles operacionais paralelos</p>
              </div>
              <button
                onClick={() => setShowAddManualModal(true)}
                className="px-4 py-2 bg-[#3B82F6] hover:bg-blue-600 rounded-xl font-medium text-white text-xs transition-all shadow-md flex items-center space-x-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Adicionar Controle Manual</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {data?.manualControls?.map((mc: any) => (
                <div key={mc.id} className="bg-[#0A192F] border border-amber-500/30 rounded-2xl p-6 shadow-md space-y-4">
                  <div className="flex justify-between items-start">
                    <div className="flex items-center space-x-2 text-amber-400">
                      <FileSpreadsheet className="w-5 h-5" />
                      <h3 className="text-lg font-bold text-white">{mc.purpose}</h3>
                    </div>
                    <span className="px-2.5 py-0.5 bg-amber-500/20 text-amber-300 border border-amber-500/40 rounded-full text-xs font-semibold">
                      {mc.frequency}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-xs bg-slate-900/60 p-3 rounded-xl border border-slate-800">
                    <div>
                      <span className="text-slate-400 block">Origem</span>
                      <span className="text-slate-200 font-medium">{mc.origin}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block">Destino</span>
                      <span className="text-slate-200 font-medium">{mc.target}</span>
                    </div>
                  </div>

                  <div className="space-y-1.5 text-xs text-slate-300">
                    <p><strong>Responsável:</strong> {mc.responsible}</p>
                    <p className="text-rose-300"><strong>Risco:</strong> {mc.risk}</p>
                    <p className="text-amber-300"><strong>Retrabalho Estimado:</strong> {mc.estimatedRework}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab 4: Opportunities & Gaps */}
        {activeTab === 'opportunities' && (
          <div className="space-y-8">
            <div className="space-y-4">
              <h2 className="text-xl font-bold text-white">Oportunidades de Integração</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {data?.opportunities?.map((opp: any) => (
                  <div key={opp.id} className="bg-[#0A192F] border border-[#D4AF37]/30 rounded-2xl p-6 shadow-md space-y-3">
                    <div className="flex justify-between items-start">
                      <span className="px-2.5 py-0.5 bg-[#D4AF37]/20 text-[#D4AF37] border border-[#D4AF37]/40 rounded-full text-xs font-semibold">
                        {opp.status}
                      </span>
                      {opp.suggestedByAI && (
                        <span className="text-xs text-blue-400 flex items-center space-x-1">
                          <Sparkles className="w-3.5 h-3.5" />
                          <span>IA Sugerido</span>
                        </span>
                      )}
                    </div>
                    <p className="text-base font-semibold text-white">{opp.description}</p>
                    <p className="text-xs text-slate-300"><strong>Impacto:</strong> {opp.impact}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-4 pt-6 border-t border-slate-800">
              <h2 className="text-xl font-bold text-white">Gaps Operacionais Detectados</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {data?.gaps?.map((gap: any) => (
                  <div key={gap.id} className="bg-[#0A192F] border border-rose-500/30 rounded-2xl p-6 shadow-md space-y-3">
                    <div className="flex justify-between items-start">
                      <span className="px-2.5 py-0.5 bg-rose-500/20 text-rose-300 border border-rose-500/40 rounded-full text-xs font-semibold">
                        {gap.gapType} ({gap.severity})
                      </span>
                      <span className="text-xs text-slate-400">{gap.status}</span>
                    </div>
                    <p className="text-sm text-slate-200">{gap.description}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

      </div>

      {/* Modal: Add System */}
      {showAddSystemModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-[#0A192F] border border-[#D4AF37]/40 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-6">
            <h3 className="text-xl font-bold text-white">Cadastrar Novo Sistema</h3>
            <form onSubmit={handleCreateSystem} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Nome do Sistema</label>
                <input
                  type="text"
                  value={newSysName}
                  onChange={(e) => setNewSysName(e.target.value)}
                  placeholder="Ex: Trello, Salesforce, Senior..."
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-[#3B82F6]"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Categoria</label>
                <select
                  value={newSysCategory}
                  onChange={(e) => setNewSysCategory(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-[#3B82F6]"
                >
                  <option value="ERP">ERP</option>
                  <option value="CRM">CRM</option>
                  <option value="Financeiro">Financeiro</option>
                  <option value="RH">RH</option>
                  <option value="Atendimento">Atendimento</option>
                  <option value="Projetos">Projetos</option>
                  <option value="Documentos">Documentos</option>
                  <option value="Planilhas">Planilhas</option>
                  <option value="WhatsApp">WhatsApp</option>
                  <option value="Outros">Outros</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Finalidade</label>
                <input
                  type="text"
                  value={newSysPurpose}
                  onChange={(e) => setNewSysPurpose(e.target.value)}
                  placeholder="Ex: Gestão de tarefas e projetos"
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-[#3B82F6]"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Responsável</label>
                <input
                  type="text"
                  value={newSysOwner}
                  onChange={(e) => setNewSysOwner(e.target.value)}
                  placeholder="Ex: João Gerente"
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-[#3B82F6]"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Criticidade</label>
                <select
                  value={newSysCriticality}
                  onChange={(e) => setNewSysCriticality(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-[#3B82F6]"
                >
                  <option value="CRITICAL">Crítica</option>
                  <option value="HIGH">Alta</option>
                  <option value="MEDIUM">Média</option>
                  <option value="LOW">Baixa</option>
                </select>
              </div>

              <div className="flex justify-end space-x-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddSystemModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-sm"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#3B82F6] hover:bg-blue-600 text-white font-medium rounded-xl text-sm"
                >
                  Salvar Sistema
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Add Manual Control */}
      {showAddManualModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-[#0A192F] border border-[#D4AF37]/40 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-6">
            <h3 className="text-xl font-bold text-white">Registrar Controle Manual / Planilha</h3>
            <form onSubmit={handleCreateManualControl} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Responsável</label>
                <input
                  type="text"
                  value={manResp}
                  onChange={(e) => setManResp(e.target.value)}
                  placeholder="Ex: Maria Financeiro"
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-[#3B82F6]"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Finalidade / Descrição</label>
                <input
                  type="text"
                  value={manPurpose}
                  onChange={(e) => setManPurpose(e.target.value)}
                  placeholder="Ex: Planilha de controle de comissões"
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-[#3B82F6]"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Origem</label>
                  <input
                    type="text"
                    value={manOrigin}
                    onChange={(e) => setManOrigin(e.target.value)}
                    placeholder="Ex: CRM"
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-[#3B82F6]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Destino</label>
                  <input
                    type="text"
                    value={manTarget}
                    onChange={(e) => setManTarget(e.target.value)}
                    placeholder="Ex: ERP"
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-[#3B82F6]"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Risco Associado</label>
                <input
                  type="text"
                  value={manRisk}
                  onChange={(e) => setManRisk(e.target.value)}
                  placeholder="Ex: Erro humano e duplicidade"
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-[#3B82F6]"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Retrabalho Estimado</label>
                <input
                  type="text"
                  value={manRework}
                  onChange={(e) => setManRework(e.target.value)}
                  placeholder="Ex: 10h / mês"
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-[#3B82F6]"
                />
              </div>

              <div className="flex justify-end space-x-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddManualModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-sm"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#3B82F6] hover:bg-blue-600 text-white font-medium rounded-xl text-sm"
                >
                  Registrar Controle
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
