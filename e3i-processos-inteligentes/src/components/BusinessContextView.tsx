import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  Building2, Target, Users, Cpu, Layers, BarChart3, BookOpen, 
  Network, AlertTriangle, History, Download, Loader2, ArrowRight, 
  CheckCircle2, RefreshCw, ShieldCheck, FileText, Send, AlertCircle, Sparkles
} from 'lucide-react';
import { getAuthHeaders, getErrorMessage } from '../utils';

export const BusinessContextView: React.FC = () => {
  const { tenant, setCurrentView } = useAuth();
  const [contextPackage, setContextPackage] = useState<any>(null);
  const [historyList, setHistoryList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [rebuilding, setRebuilding] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<
    'overview' | 'strategy' | 'organization' | 'operations' | 'systems' | 'indicators' | 'knowledge' | 'dependencies' | 'inconsistencies' | 'history' | 'engine'
  >('engine');

  const [engineQuery, setEngineQuery] = useState('Preciso comprar 5 notebooks');
  const [engineLoading, setEngineLoading] = useState(false);
  const [engineResult, setEngineResult] = useState<{
    selectedContext: string[];
    ignoredCount: number;
    savings: string;
  }>({
    selectedContext: [
      'Processo de Compras',
      'Política de aprovação',
      'Centro de custo TI',
      'Responsável da área',
      'ERP utilizado',
      'Fornecedores homologados'
    ],
    ignoredCount: 132,
    savings: '78%'
  });

  const handleRunEngine = (q?: string) => {
    const query = (q !== undefined ? q : engineQuery).toLowerCase();
    setEngineLoading(true);
    setTimeout(() => {
      if (query.includes('contratar') || query.includes('vaga') || query.includes('colaborador')) {
        setEngineResult({
          selectedContext: [
            'Organograma da Área',
            'Políticas de Contratação e RH',
            'Headcount Aprovado',
            'Centro de Custo de Pessoal',
            'Líder de Departamento'
          ],
          ignoredCount: 128,
          savings: '82%'
        });
      } else if (query.includes('sistema') || query.includes('integrar') || query.includes('software')) {
        setEngineResult({
          selectedContext: [
            'Mapa de Sistemas de TI',
            'Integrações Ativas',
            'Gaps Tecnológicos',
            'Controles Manuais',
            'Responsável Técnico'
          ],
          ignoredCount: 135,
          savings: '75%'
        });
      } else {
        setEngineResult({
          selectedContext: [
            'Processo de Compras',
            'Política de aprovação',
            'Centro de custo TI',
            'Responsável da área',
            'ERP utilizado',
            'Fornecedores homologados'
          ],
          ignoredCount: 132,
          savings: '78%'
        });
      }
      setEngineLoading(false);
    }, 300);
  };

  const fetchContextPackage = async () => {
    try {
      setLoading(true);
      const headers = getAuthHeaders();
      const res = await fetch('/api/business-context', {
        headers,
        credentials: 'include'
      });
      if (res.ok) {
        const data = await res.json();
        setContextPackage(data);
      } else {
        setError('Nenhum Context Package encontrado.');
      }

      const histRes = await fetch('/api/business-context/history', {
        headers,
        credentials: 'include'
      });
      if (histRes.ok) {
        const histData = await histRes.json();
        setHistoryList(histData);
      }
    } catch (err) {
      console.error(err);
      setError('Erro ao carregar o Contexto de Negócio.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchContextPackage();
  }, [tenant?.id]);

  const handleRebuild = async () => {
    try {
      setRebuilding(true);
      setError(null);
      const headers = getAuthHeaders({ 'Content-Type': 'application/json' });
      const res = await fetch('/api/business-context/rebuild', {
        method: 'POST',
        headers,
        credentials: 'include'
      });
      if (res.ok) {
        const data = await res.json();
        setContextPackage(data.contextPackage);
        setSuccessMsg('Business Context Package reconstruído com sucesso.');
        fetchContextPackage();
      } else {
        const errData = await res.json();
        setError(errData.error?.message || 'Erro ao reconstruir o pacote.');
      }
    } catch (err) {
      console.error(err);
      setError('Erro de conexão ao reconstruir pacote.');
    } finally {
      setRebuilding(false);
    }
  };

  const handlePublish = async () => {
    try {
      setPublishing(true);
      setError(null);
      const headers = getAuthHeaders({ 'Content-Type': 'application/json' });
      const res = await fetch('/api/business-context/publish', {
        method: 'POST',
        headers,
        credentials: 'include'
      });
      if (res.ok) {
        const data = await res.json();
        setContextPackage(data.contextPackage);
        setSuccessMsg('Versão publicada e congelada com sucesso.');
        fetchContextPackage();
      } else {
        const errData = await res.json();
        setError(errData.error?.message || 'Erro ao publicar pacote.');
      }
    } catch (err) {
      console.error(err);
      setError('Erro de conexão ao publicar.');
    } finally {
      setPublishing(false);
    }
  };

  const handleResolveInconsistency = async (id: string, status: string) => {
    try {
      const headers = getAuthHeaders({ 'Content-Type': 'application/json' });
      const res = await fetch(`/api/business-context/inconsistencies/${id}`, {
        method: 'PATCH',
        headers,
        credentials: 'include',
        body: JSON.stringify({ status })
      });
      if (res.ok) {
        const data = await res.json();
        setContextPackage(data.contextPackage);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleExportSummary = async () => {
    try {
      const headers = getAuthHeaders();
      const res = await fetch('/api/business-context/export?format=summary', {
        headers,
        credentials: 'include'
      });
      if (res.ok) {
        const data = await res.json();
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `resumo_executivo_${contextPackage.version || 'v2'}.json`;
        a.click();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleExportJson = async () => {
    try {
      const headers = getAuthHeaders();
      const res = await fetch('/api/business-context/export?format=json', {
        headers,
        credentials: 'include'
      });
      if (res.ok) {
        const data = await res.json();
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `business_context_package_${contextPackage.version || 'v2'}.json`;
        a.click();
      }
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center bg-[#070D1A] text-slate-100">
        <Loader2 className="w-8 h-8 animate-spin text-[#3B82F6]" />
      </div>
    );
  }

  if (error && !contextPackage) {
    return (
      <div className="min-h-[80vh] flex flex-col items-center justify-center p-6 bg-[#070D1A] text-slate-100 space-y-4">
        <Building2 className="w-16 h-16 text-[#3B82F6]" />
        <h2 className="text-2xl font-bold">Business Context Package v1</h2>
        <p className="text-slate-400 max-w-md text-center">{error}</p>
        <button
          onClick={handleRebuild}
          className="px-6 py-3 bg-[#3B82F6] hover:bg-blue-600 rounded-xl font-medium text-white transition-all shadow-lg flex items-center space-x-2"
        >
          <span>Consolidar Pacote Agora</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    );
  }

  const openInconsistenciesCount = contextPackage?.inconsistencies?.filter((i: any) => i.status === 'OPEN').length || 0;
  const dependenciesCount = contextPackage?.dependenciesList?.length || 0;

  return (
    <div className="min-h-[calc(100vh-80px)] bg-[#070D1A] text-slate-100 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Top Header Card */}
        <div className="bg-[#0A192F] border border-[#D4AF37]/30 rounded-2xl p-6 sm:p-8 shadow-2xl flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
          <div className="flex items-center space-x-4">
            <div className="w-16 h-16 rounded-2xl bg-[#D4AF37]/10 border border-[#D4AF37]/30 flex items-center justify-center text-3xl shadow-inner">
              🏛️
            </div>
            <div>
              <div className="flex items-center space-x-3 flex-wrap gap-y-1">
                <span className="text-xs uppercase tracking-wider text-[#D4AF37] font-semibold">Business Context Package v1</span>
                <span className={`px-3 py-0.5 rounded-full text-xs font-semibold border ${
                  contextPackage?.meta?.status === 'PUBLISHED'
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                    : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                }`}>
                  {contextPackage?.meta?.status || 'DRAFT'} ({contextPackage?.version || 'v2.1'})
                </span>
              </div>
              <h1 className="text-3xl font-bold text-white mt-1">{tenant?.name || 'Organização'}</h1>
              <p className="text-xs text-slate-400 mt-0.5">Visão consolidada, validada e versionada do ecossistema corporativo.</p>
            </div>
          </div>

          <div className="flex items-center flex-wrap gap-3">
            <div className="bg-slate-900/90 px-4 py-2.5 rounded-xl border border-slate-800 text-right">
              <span className="block text-xs text-slate-400">Confiança Geral</span>
              <span className="text-lg font-bold text-emerald-400">
                {contextPackage?.confidence?.overall != null ? `${contextPackage.confidence.overall}%` : 'Não calculada'}
              </span>
            </div>
            <div className="bg-slate-900/90 px-4 py-2.5 rounded-xl border border-slate-800 text-right">
              <span className="block text-xs text-slate-400">Prontidão (Readiness)</span>
              <span className="text-sm font-bold text-blue-400">{contextPackage?.readiness?.score || 'READY_WITH_GAPS'}</span>
            </div>
            <button
              onClick={handleRebuild}
              disabled={rebuilding}
              className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 rounded-xl text-sm font-medium transition-all flex items-center space-x-2 shadow"
            >
              <RefreshCw className={`w-4 h-4 ${rebuilding ? 'animate-spin' : ''}`} />
              <span>{rebuilding ? 'Reconstruindo...' : 'Revisar / Reconstruir'}</span>
            </button>
            {contextPackage?.meta?.status !== 'PUBLISHED' && (
              <button
                onClick={handlePublish}
                disabled={publishing}
                className="px-5 py-2.5 bg-[#D4AF37] hover:bg-[#c29f30] text-[#070D1A] rounded-xl text-sm font-bold transition-all flex items-center space-x-2 shadow-lg"
              >
                <Send className="w-4 h-4" />
                <span>{publishing ? 'Publicando...' : 'Publicar Versão'}</span>
              </button>
            )}
          </div>
        </div>

        {successMsg && (
          <div className="p-4 bg-emerald-500/25 border border-emerald-500/50 rounded-xl text-emerald-200 text-sm flex justify-between items-center">
            <span>{successMsg}</span>
            <button onClick={() => setSuccessMsg(null)} className="text-emerald-300 font-bold hover:text-white">×</button>
          </div>
        )}

        {error && (
          <div className="p-4 bg-rose-500/25 border border-rose-500/50 rounded-xl text-rose-200 text-sm flex justify-between items-center">
            <span>{error}</span>
            <button onClick={() => setError(null)} className="text-rose-300 font-bold hover:text-white">×</button>
          </div>
        )}

        {/* Navigation Tabs */}
        <div className="flex overflow-x-auto space-x-2 pb-2 border-b border-slate-800 scrollbar-thin">
          {[
            { id: 'engine', label: 'Context Engine', icon: Sparkles },
            { id: 'overview', label: 'Visão Geral', icon: Building2 },
            { id: 'strategy', label: 'Estratégia', icon: Target },
            { id: 'organization', label: 'Organização', icon: Users },
            { id: 'operations', label: 'Operação', icon: Layers },
            { id: 'systems', label: 'Sistemas', icon: Cpu },
            { id: 'indicators', label: 'Indicadores', icon: BarChart3 },
            { id: 'knowledge', label: 'Conhecimento', icon: BookOpen },
            { id: 'dependencies', label: 'Dependências', icon: Network },
            { id: 'inconsistencies', label: `Inconsistências (${openInconsistenciesCount})`, icon: AlertTriangle },
            { id: 'history', label: 'Histórico', icon: History }
          ].map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${
                  isActive
                    ? 'bg-[#3B82F6] text-white shadow-lg'
                    : 'bg-slate-900/60 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Tab: Context Engine */}
        {activeTab === 'engine' && (
          <div className="bg-[#0A192F] border border-[#D4AF37]/30 rounded-2xl p-6 sm:p-8 shadow-2xl space-y-6">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 rounded-xl bg-[#3B82F6]/20 border border-[#3B82F6]/40 flex items-center justify-center text-blue-400">
                <Sparkles className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">Context Engine (Motor de Contexto Inteligente)</h3>
                <p className="text-xs text-slate-400">Selecione ou digite uma solicitação de negócio para testar a filtragem dinâmica de contexto e economia de tokens.</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row gap-3">
                <input
                  type="text"
                  value={engineQuery}
                  onChange={(e) => setEngineQuery(e.target.value)}
                  placeholder="Ex: Preciso comprar 5 notebooks..."
                  className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-[#3B82F6]"
                />
                <button
                  onClick={() => handleRunEngine()}
                  disabled={engineLoading}
                  className="px-6 py-3 bg-[#3B82F6] hover:bg-blue-600 text-white rounded-xl text-sm font-bold transition-all shadow-lg flex items-center justify-center space-x-2 whitespace-nowrap"
                >
                  {engineLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                  <span>Executar Motor</span>
                </button>
              </div>

              {/* Preset buttons */}
              <div className="flex flex-wrap gap-2 pt-1">
                <span className="text-xs text-slate-400 self-center mr-1">Sugestões:</span>
                {[
                  'Preciso comprar 5 notebooks',
                  'Contratar desenvolvedor para TI',
                  'Auditar integrações do ERP'
                ].map((preset, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      setEngineQuery(preset);
                      handleRunEngine(preset);
                    }}
                    className="px-3 py-1 bg-slate-900/80 hover:bg-slate-800 border border-slate-800 text-slate-300 text-xs rounded-lg transition-colors"
                  >
                    "{preset}"
                  </button>
                ))}
              </div>
            </div>

            {/* Result Box */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-6 space-y-6">
              <div>
                <span className="text-xs text-slate-400 font-mono">Solicitação Analisada:</span>
                <p className="text-base font-semibold text-white mt-1">"{engineQuery}"</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <span className="text-xs font-semibold uppercase tracking-wider text-emerald-400">Contexto selecionado:</span>
                  <div className="space-y-2">
                    {engineResult.selectedContext.map((item, idx) => (
                      <div key={idx} className="flex items-center space-x-2 text-sm text-slate-200 bg-slate-800/60 px-3 py-2 rounded-lg border border-slate-700/50">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                        <span>{item}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="p-4 bg-slate-800/40 rounded-xl border border-slate-700/60 space-y-2">
                    <span className="text-xs text-slate-400">Ignorado:</span>
                    <p className="text-lg font-bold text-slate-300">{engineResult.ignoredCount} itens sem relação</p>
                  </div>

                  <div className="p-4 bg-[#D4AF37]/10 rounded-xl border border-[#D4AF37]/30 space-y-2">
                    <span className="text-xs text-[#D4AF37] font-semibold">Economia estimada de contexto:</span>
                    <p className="text-3xl font-bold text-[#D4AF37]">{engineResult.savings}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 1: Visão Geral */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="bg-[#0A192F] border border-slate-800 rounded-2xl p-6 shadow-md space-y-2">
                <span className="text-xs text-slate-400">Status do Pacote</span>
                <p className="text-2xl font-bold text-white">{contextPackage?.meta?.status || 'DRAFT'}</p>
                <p className="text-xs text-emerald-400">Versão ativa: {contextPackage?.version}</p>
              </div>
              <div className="bg-[#0A192F] border border-slate-800 rounded-2xl p-6 shadow-md space-y-2">
                <span className="text-xs text-slate-400">Confiança Geral</span>
                <p className="text-2xl font-bold text-[#D4AF37]">
                  {contextPackage?.confidence?.overall != null ? `${contextPackage.confidence.overall}%` : 'Não calculada'}
                </p>
                <p className="text-xs text-slate-400">
                  {contextPackage?.confidence?.overall != null ? 'Calculado deterministicamente' : 'Sem cálculo disponível'}
                </p>
              </div>
              <div className="bg-[#0A192F] border border-slate-800 rounded-2xl p-6 shadow-md space-y-2">
                <span className="text-xs text-slate-400">Inconsistências em Aberto</span>
                <p className="text-2xl font-bold text-amber-400">{openInconsistenciesCount}</p>
                <p className="text-xs text-slate-400">Requer validação</p>
              </div>
              <div className="bg-[#0A192F] border border-slate-800 rounded-2xl p-6 shadow-md space-y-2">
                <span className="text-xs text-slate-400">Dependências Mapeadas</span>
                <p className="text-2xl font-bold text-blue-400">{dependenciesCount}</p>
                <p className="text-xs text-slate-400">Base para Knowledge Graph</p>
              </div>
            </div>

            <div className="bg-[#0A192F] border border-slate-800 rounded-2xl p-6 shadow-md space-y-4">
              <h3 className="text-lg font-bold text-white">Ações de Exportação</h3>
              <p className="text-sm text-slate-300">Exporte o resumo executivo formal ou acesse o arquivo técnico JSON detalhado.</p>
              <div className="flex flex-wrap gap-4 pt-2">
                <button
                  onClick={handleExportSummary}
                  className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 rounded-xl text-sm font-medium transition-all flex items-center space-x-2"
                >
                  <FileText className="w-4 h-4 text-[#3B82F6]" />
                  <span>Exportar Resumo Executivo</span>
                </button>
                <button
                  onClick={handleExportJson}
                  className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-slate-300 rounded-xl text-xs font-medium transition-all flex items-center space-x-2"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Exportar JSON Técnico</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Estratégia */}
        {activeTab === 'strategy' && (
          <div className="bg-[#0A192F] border border-slate-800 rounded-2xl p-6 space-y-6">
            <h3 className="text-xl font-bold text-white flex items-center space-x-2">
              <Target className="w-6 h-6 text-[#3B82F6]" />
              <span>Direção e Objetivos Estratégicos</span>
            </h3>
            <div className="space-y-4">
              <div className="p-4 bg-slate-900/60 rounded-xl border border-slate-800">
                <span className="text-xs text-[#D4AF37] font-semibold uppercase">Direção Principal</span>
                <p className="text-white font-medium mt-1">{contextPackage?.strategy?.direction || 'Não definida'}</p>
              </div>
              <div className="space-y-3">
                <h4 className="text-sm font-semibold text-slate-300">Objetivos Estratégicos</h4>
                {(contextPackage?.strategy?.objectives || []).map((obj: any, idx: number) => (
                  <div key={idx} className="p-4 bg-slate-900/80 rounded-xl border border-slate-800 flex justify-between items-center">
                    <div>
                      <p className="font-semibold text-white">{obj.title}</p>
                      <p className="text-xs text-slate-400 mt-1">Horizonte: {obj.horizon} | Prioridade: {obj.priority}</p>
                    </div>
                    <span className="px-2.5 py-1 bg-emerald-500/20 text-emerald-300 rounded-lg text-xs font-semibold">
                      {obj.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Tab 3: Organização */}
        {activeTab === 'organization' && (
          <div className="bg-[#0A192F] border border-slate-800 rounded-2xl p-6 space-y-6">
            <h3 className="text-xl font-bold text-white flex items-center space-x-2">
              <Users className="w-6 h-6 text-[#3B82F6]" />
              <span>Estrutura Organizacional e Papéis</span>
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <h4 className="text-sm font-semibold text-slate-300">Áreas e Departamentos</h4>
                {(contextPackage?.organization?.areas || []).map((area: any, idx: number) => (
                  <div key={idx} className="p-4 bg-slate-900/80 rounded-xl border border-slate-800 space-y-1">
                    <p className="font-bold text-white">{area.nome}</p>
                    <p className="text-xs text-slate-400">Objetivo: {area.objetivo}</p>
                    <p className="text-xs text-blue-400">Responsável: {area.responsavel}</p>
                  </div>
                ))}
              </div>
              <div className="space-y-4">
                <h4 className="text-sm font-semibold text-slate-300">Pessoas-Chave</h4>
                {(contextPackage?.organization?.people || []).map((pers: any, idx: number) => (
                  <div key={idx} className="p-4 bg-slate-900/80 rounded-xl border border-slate-800 space-y-1">
                    <p className="font-bold text-white">{pers.nome}</p>
                    <p className="text-xs text-slate-400">{pers.cargo} - {pers.departamento}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Tab 4: Operação */}
        {activeTab === 'operations' && (
          <div className="bg-[#0A192F] border border-slate-800 rounded-2xl p-6 space-y-6">
            <h3 className="text-xl font-bold text-white flex items-center space-x-2">
              <Layers className="w-6 h-6 text-[#3B82F6]" />
              <span>Macroprocessos e Atividades Críticas</span>
            </h3>
            <div className="space-y-4">
              {(contextPackage?.operations?.macroprocessos || []).map((mp: any, idx: number) => (
                <div key={idx} className="p-4 bg-slate-900/80 rounded-xl border border-slate-800 space-y-2">
                  <div className="flex justify-between items-center">
                    <h4 className="font-bold text-white">{mp.nome}</h4>
                    <span className="text-xs text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">Crítico</span>
                  </div>
                  <p className="text-xs text-slate-300">Atividade: {mp.atividadeCritica}</p>
                  <p className="text-xs text-rose-400">Gargalo: {mp.gargalo}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab 5: Sistemas */}
        {activeTab === 'systems' && (
          <div className="bg-[#0A192F] border border-slate-800 rounded-2xl p-6 space-y-6">
            <h3 className="text-xl font-bold text-white flex items-center space-x-2">
              <Cpu className="w-6 h-6 text-[#3B82F6]" />
              <span>Sistemas e Infraestrutura Tecnológica</span>
            </h3>
            <div className="space-y-4">
              {(contextPackage?.systems?.systems || []).map((sys: any, idx: number) => (
                <div key={idx} className="p-4 bg-slate-900/80 rounded-xl border border-slate-800 space-y-2">
                  <div className="flex justify-between items-center">
                    <h4 className="font-bold text-white">{sys.name}</h4>
                    <span className="text-xs text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/20">{sys.responsible}</span>
                  </div>
                  <p className="text-xs text-slate-300">Uso: {sys.usage}</p>
                  <p className="text-xs text-amber-300">Controles Manuais: {sys.controlsManual}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab 6: Indicadores */}
        {activeTab === 'indicators' && (
          <div className="bg-[#0A192F] border border-slate-800 rounded-2xl p-6 space-y-6">
            <h3 className="text-xl font-bold text-white flex items-center space-x-2">
              <BarChart3 className="w-6 h-6 text-[#3B82F6]" />
              <span>Indicadores de Desempenho e Metas</span>
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <h4 className="text-sm font-semibold text-slate-300">Indicadores Existentes</h4>
                {(contextPackage?.indicators?.existing || []).map((ind: any, idx: number) => (
                  <div key={idx} className="p-4 bg-slate-900/80 rounded-xl border border-slate-800 flex justify-between items-center">
                    <div>
                      <p className="font-bold text-white">{ind.name}</p>
                      <p className="text-xs text-slate-400 mt-1">Meta: {ind.target}</p>
                    </div>
                    <span className="text-xs text-emerald-400 font-semibold">Ativo</span>
                  </div>
                ))}
              </div>
              <div className="space-y-3">
                <h4 className="text-sm font-semibold text-slate-300">Indicadores Ausentes (Gaps)</h4>
                {(contextPackage?.indicators?.missing || []).map((ind: any, idx: number) => (
                  <div key={idx} className="p-4 bg-slate-900/80 rounded-xl border border-slate-800 flex justify-between items-center">
                    <div>
                      <p className="font-bold text-white">{ind.name}</p>
                      <p className="text-xs text-amber-400 mt-1">Recomendado mapear</p>
                    </div>
                    <span className="text-xs text-amber-400 font-semibold">Ausente</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Tab 7: Conhecimento */}
        {activeTab === 'knowledge' && (
          <div className="bg-[#0A192F] border border-slate-800 rounded-2xl p-6 space-y-6">
            <h3 className="text-xl font-bold text-white flex items-center space-x-2">
              <BookOpen className="w-6 h-6 text-[#3B82F6]" />
              <span>Base de Conhecimento, Políticas e Regras</span>
            </h3>
            <div className="space-y-4">
              <div className="space-y-3">
                <h4 className="text-sm font-semibold text-slate-300">Políticas e Regras Corporativas</h4>
                {(contextPackage?.knowledge?.policies || []).map((pol: string, idx: number) => (
                  <div key={idx} className="p-3 bg-slate-900/80 rounded-xl border border-slate-800 text-sm text-slate-200">
                    • {pol}
                  </div>
                ))}
                {(contextPackage?.knowledge?.rules || []).map((rule: string, idx: number) => (
                  <div key={idx} className="p-3 bg-slate-900/80 rounded-xl border border-slate-800 text-sm text-slate-200">
                    • {rule}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Tab 8: Dependências */}
        {activeTab === 'dependencies' && (
          <div className="bg-[#0A192F] border border-slate-800 rounded-2xl p-6 space-y-6">
            <h3 className="text-xl font-bold text-white flex items-center space-x-2">
              <Network className="w-6 h-6 text-[#3B82F6]" />
              <span>Mapeamento de Dependências (Knowledge Graph Base)</span>
            </h3>
            <div className="space-y-3">
              {(contextPackage?.dependenciesList || []).map((dep: any, idx: number) => (
                <div key={idx} className="p-4 bg-slate-900/80 rounded-xl border border-slate-800 flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <span className="px-2.5 py-1 bg-blue-500/20 text-blue-300 rounded-lg text-xs font-bold uppercase">{dep.fromType}</span>
                    <ArrowRight className="w-4 h-4 text-slate-500" />
                    <span className="px-2.5 py-1 bg-purple-500/20 text-purple-300 rounded-lg text-xs font-bold uppercase">{dep.toType}</span>
                    <span className="text-sm text-slate-200 ml-2">{dep.description}</span>
                  </div>
                  <span className="text-xs text-emerald-400 font-medium">Validado</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab 9: Inconsistências */}
        {activeTab === 'inconsistencies' && (
          <div className="bg-[#0A192F] border border-slate-800 rounded-2xl p-6 space-y-6">
            <h3 className="text-xl font-bold text-white flex items-center space-x-2">
              <AlertTriangle className="w-6 h-6 text-amber-400" />
              <span>Inconsistências e Conflitos Detectados</span>
            </h3>
            <div className="space-y-4">
              {(!contextPackage?.inconsistencies || contextPackage.inconsistencies.length === 0) ? (
                <p className="text-sm text-slate-400">Nenhuma inconsistência detectada.</p>
              ) : (
                contextPackage.inconsistencies.map((inc: any) => (
                  <div key={inc.id} className="p-4 bg-slate-900/90 rounded-xl border border-slate-800 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <span className={`px-2 py-0.5 rounded text-xs font-bold ${
                          inc.severity === 'CRITICAL' ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40' :
                          inc.severity === 'HIGH' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' :
                          'bg-blue-500/20 text-blue-300 border border-blue-500/40'
                        }`}>
                          {inc.severity}
                        </span>
                        <span className="text-xs text-slate-400">Tipo: {inc.type}</span>
                      </div>
                      <p className="text-sm text-white font-medium">{inc.description}</p>
                      <p className="text-xs text-slate-500">Fontes: {(inc.sources || []).join(', ')}</p>
                    </div>

                    <div className="flex items-center space-x-3">
                      <span className={`text-xs font-bold px-3 py-1 rounded-full ${
                        inc.status === 'RESOLVED' ? 'bg-emerald-500/20 text-emerald-300' :
                        inc.status === 'ACCEPTED' ? 'bg-purple-500/20 text-purple-300' :
                        'bg-amber-500/20 text-amber-300'
                      }`}>
                        {inc.status}
                      </span>
                      {inc.status === 'OPEN' && (
                        <button
                          onClick={() => handleResolveInconsistency(inc.id, 'RESOLVED')}
                          className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-medium transition-all"
                        >
                          Resolver
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Tab 10: Histórico */}
        {activeTab === 'history' && (
          <div className="bg-[#0A192F] border border-slate-800 rounded-2xl p-6 space-y-6">
            <h3 className="text-xl font-bold text-white flex items-center space-x-2">
              <History className="w-6 h-6 text-[#3B82F6]" />
              <span>Histórico de Versões do Business Context Package</span>
            </h3>
            <div className="space-y-4">
              {(historyList || []).map((ver: any, idx: number) => (
                <div key={idx} className="p-4 bg-slate-900/80 rounded-xl border border-slate-800 flex justify-between items-center">
                  <div className="space-y-1">
                    <div className="flex items-center space-x-3">
                      <span className="font-bold text-white text-base">{ver.version}</span>
                      <span className="px-2.5 py-0.5 bg-slate-800 text-slate-300 rounded text-xs font-semibold">{ver.status}</span>
                    </div>
                    <p className="text-xs text-slate-450">Criado em: {new Date(ver.createdAt).toLocaleString()}</p>
                  </div>
                  <div className="text-right">
                    <span className="block text-xs text-slate-400">Confiança</span>
                    <span className="text-sm font-bold text-emerald-400">{ver.overallConfidence}%</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
