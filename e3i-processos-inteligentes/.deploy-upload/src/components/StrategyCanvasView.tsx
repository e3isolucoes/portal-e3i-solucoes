import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  Target, 
  CheckCircle2, 
  AlertTriangle, 
  HelpCircle, 
  Plus, 
  Edit3, 
  Trash2, 
  RefreshCw, 
  Layers, 
  ShieldAlert, 
  TrendingUp, 
  ArrowRight, 
  Check, 
  X, 
  Sparkles,
  Info
} from 'lucide-react';
import { StrategyCanvas, StrategicObjective, StrategicRisk, StrategicHypothesis, StrategicIndicator } from '../types';
import { getAuthHeaders, getErrorMessage } from '../utils';

export const StrategyCanvasView: React.FC = () => {
  const { user, tenant } = useAuth();
  const [canvas, setCanvas] = useState<StrategyCanvas | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'objectives' | 'priorities' | 'indicators' | 'valueChain' | 'risks' | 'hypotheses' | 'gaps'>('overview');

  // Modal / editing states
  const [newObjModal, setNewObjModal] = useState(false);
  const [objForm, setObjForm] = useState({ title: '', description: '', priority: 'Alta' as const, horizon: '12 meses', owner: '' });
  
  const [newRiskModal, setNewRiskModal] = useState(false);
  const [riskForm, setRiskForm] = useState({ category: 'operacional' as const, description: '', origin: 'Discovery', estimatedImpact: 'Médio' });

  const [newKpiModal, setNewKpiModal] = useState(false);
  const [kpiForm, setKpiForm] = useState({ name: '', target: '', current: '' });

  const fetchCanvas = async () => {
    setLoading(true);
    try {
      const headers = getAuthHeaders();
      const res = await fetch('/api/strategy-canvas', {
        headers,
        credentials: 'include'
      });
      if (!res.ok) throw new Error("Falha ao carregar o Strategy Canvas.");
      const data = await res.json();
      setCanvas(data);
    } catch (err: any) {
      setError(err.message || "Erro desconhecido.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCanvas();
  }, [tenant?.id]);

  const handleUpdateObjectiveStatus = async (objId: string, status: 'CONFIRMED' | 'REJECTED' | 'NEEDS_REVIEW') => {
    try {
      const headers = getAuthHeaders({ 'Content-Type': 'application/json' });
      const res = await fetch('/api/strategy-canvas/objective', {
        method: 'POST',
        headers,
        credentials: 'include',
        body: JSON.stringify({ objectiveId: objId, status })
      });
      if (!res.ok) throw new Error("Erro ao atualizar objetivo.");
      const updated = await res.json();
      setCanvas(updated);
      setSuccessMsg("Objetivo atualizado com sucesso.");
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleCreateObjective = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const headers = getAuthHeaders({ 'Content-Type': 'application/json' });
      const res = await fetch('/api/strategy-canvas/objective', {
        method: 'POST',
        headers,
        credentials: 'include',
        body: JSON.stringify({ action: 'create', ...objForm })
      });
      if (!res.ok) throw new Error("Erro ao criar objetivo.");
      const updated = await res.json();
      setCanvas(updated);
      setNewObjModal(false);
      setObjForm({ title: '', description: '', priority: 'Alta', horizon: '12 meses', owner: '' });
      setSuccessMsg("Novo objetivo estratégico adicionado.");
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleCreateRisk = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const headers = getAuthHeaders({ 'Content-Type': 'application/json' });
      const res = await fetch('/api/strategy-canvas/risk', {
        method: 'POST',
        headers,
        credentials: 'include',
        body: JSON.stringify(riskForm)
      });
      if (!res.ok) throw new Error("Erro ao registrar risco.");
      const updated = await res.json();
      setCanvas(updated);
      setNewRiskModal(false);
      setRiskForm({ category: 'operacional', description: '', origin: 'Discovery', estimatedImpact: 'Médio' });
      setSuccessMsg("Risco registrado com sucesso.");
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleCreateKpi = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const headers = getAuthHeaders({ 'Content-Type': 'application/json' });
      const res = await fetch('/api/strategy-canvas/kpi', {
        method: 'POST',
        headers,
        credentials: 'include',
        body: JSON.stringify(kpiForm)
      });
      if (!res.ok) throw new Error("Erro ao adicionar indicador.");
      const updated = await res.json();
      setCanvas(updated);
      setNewKpiModal(false);
      setKpiForm({ name: '', target: '', current: '' });
      setSuccessMsg("Indicador vinculado com sucesso.");
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleCompleteCanvas = async () => {
    try {
      const headers = getAuthHeaders();
      const res = await fetch('/api/strategy-canvas/complete', {
        method: 'POST',
        headers,
        credentials: 'include'
      });
      if (!res.ok) throw new Error("Erro ao concluir Strategy Canvas.");
      const data = await res.json();
      setCanvas(data.canvas);
      setSuccessMsg("Strategy Canvas concluído! Nova versão do Context Package gerada.");
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      setError(err.message);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-3">
          <div className="w-12 h-12 border-4 border-[#D4AF37] border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm text-slate-300 font-medium">Extraindo dados do Context Package e montando Strategy Canvas Adaptativo...</p>
        </div>
      </div>
    );
  }

  if (!canvas) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12 text-center">
        <div className="p-8 bg-[#070D1A] border border-[#D4AF37]/30 rounded-2xl shadow-2xl">
          <Target className="w-16 h-16 text-[#D4AF37] mx-auto mb-4 animate-pulse" />
          <h2 className="text-2xl font-bold text-white mb-2">Nenhum Strategy Canvas Encontrado</h2>
          <p className="text-sm text-slate-300 mb-6">Complete o Discovery para que a IA estruture automaticamente a direção estratégica da sua empresa.</p>
          <button 
            onClick={fetchCanvas}
            className="px-6 py-3 bg-gradient-to-r from-[#F3E5AB] via-[#D4AF37] to-[#AA7C11] text-[#070D1A] font-bold rounded-xl shadow-lg hover:brightness-110 transition-all"
          >
            Gerar Strategy Canvas Adaptativo
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-[#070D1A] border border-[#D4AF37]/30 p-6 rounded-2xl shadow-xl">
        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            <span className="px-3 py-1 bg-[#3B82F6]/20 text-[#3B82F6] border border-[#3B82F6]/40 text-xs font-bold rounded-full">
              Versão {canvas.version}
            </span>
            <span className="text-xs text-slate-400">Atualizado em: {new Date(canvas.updatedAt).toLocaleDateString('pt-BR')}</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white flex items-center space-x-3">
            <Target className="w-8 h-8 text-[#D4AF37]" />
            <span>Strategy Canvas Adaptativo</span>
          </h1>
          <p className="text-sm text-slate-300 max-w-2xl">
            Visão estratégica estruturada a partir do seu Discovery. O sistema reutiliza informações conhecidas, destacando sugestões e lacunas para validação rápida.
          </p>
        </div>
        <div className="flex items-center space-x-3 shrink-0">
          <button
            onClick={fetchCanvas}
            className="px-4 py-2.5 bg-slate-800/80 border border-slate-700 text-slate-200 hover:text-white rounded-xl text-xs font-semibold flex items-center space-x-2 transition-all"
          >
            <RefreshCw className="w-4 h-4 text-[#D4AF37]" />
            <span>Atualizar Dados</span>
          </button>
          <button
            onClick={handleCompleteCanvas}
            className="px-5 py-2.5 bg-gradient-to-r from-[#F3E5AB] via-[#D4AF37] to-[#AA7C11] text-[#070D1A] rounded-xl text-xs font-bold shadow-lg hover:brightness-110 transition-all flex items-center space-x-2"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>Concluir & Versionar Pacote</span>
          </button>
        </div>
      </div>

      {successMsg && (
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-xl text-sm font-medium flex items-center space-x-3">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/30 text-red-400 rounded-xl text-sm font-medium flex items-center space-x-3">
          <AlertTriangle className="w-5 h-5 text-red-400 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="flex overflow-x-auto space-x-2 border-b border-slate-800 pb-2">
        {[
          { id: 'overview', label: 'Visão Geral & Direção', icon: Target },
          { id: 'objectives', label: `Objetivos (${canvas.objectives.length})`, icon: TrendingUp },
          { id: 'priorities', label: `Prioridades (${canvas.priorities.length})`, icon: Layers },
          { id: 'indicators', label: `Indicadores (${canvas.indicators.length})`, icon: CheckCircle2 },
          { id: 'valueChain', label: 'Cadeia de Valor', icon: ArrowRight },
          { id: 'risks', label: `Riscos (${canvas.risks.length})`, icon: ShieldAlert },
          { id: 'hypotheses', label: `Hipóteses (${canvas.hypotheses.length})`, icon: HelpCircle },
          { id: 'gaps', label: `Lacunas & Alinhamento (${canvas.gaps.length})`, icon: AlertTriangle },
        ].map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-4 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center space-x-2 ${
                activeTab === tab.id
                  ? 'bg-[#3B82F6]/20 text-[#3B82F6] border border-[#3B82F6]/40 shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <Icon className="w-4 h-4 text-[#D4AF37]" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* TAB CONTENT */}

      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Direção Estratégica Card */}
          <div className="lg:col-span-2 bg-[#070D1A] border border-[#D4AF37]/30 p-6 rounded-2xl shadow-xl space-y-6">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <h2 className="text-lg font-bold text-white flex items-center space-x-2">
                <Target className="w-5 h-5 text-[#D4AF37]" />
                <span>Direção Estratégica</span>
              </h2>
              <span className={`px-2.5 py-1 text-[10px] font-bold uppercase rounded-full ${
                canvas.direction.status === 'CONFIRMED' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
              }`}>
                {canvas.direction.status === 'CONFIRMED' ? 'Confirmado' : 'SUGESTÃO'}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="bg-slate-900/60 p-4 rounded-xl border border-slate-800 space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Objetivo Principal</span>
                <p className="text-sm font-semibold text-white">{canvas.direction.mainObjective || 'Não definido'}</p>
              </div>
              <div className="bg-slate-900/60 p-4 rounded-xl border border-slate-800 space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Foco Predominante</span>
                <p className="text-sm font-semibold text-[#D4AF37] capitalize">{canvas.direction.focus || 'Crescimento'}</p>
              </div>
              <div className="bg-slate-900/60 p-4 rounded-xl border border-slate-800 space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Horizonte de Planejamento</span>
                <p className="text-sm font-semibold text-white">{canvas.direction.horizon || '12 meses'}</p>
              </div>
              <div className="bg-slate-900/60 p-4 rounded-xl border border-slate-800 space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Missão (Inferida)</span>
                <p className="text-sm text-slate-300 italic">{canvas.direction.mission || 'Gerar valor sustentável através de excelência operacional.'}</p>
              </div>
            </div>
          </div>

          {/* Quick Metrics & Lacunas Summary */}
          <div className="bg-[#070D1A] border border-[#D4AF37]/30 p-6 rounded-2xl shadow-xl space-y-6">
            <h2 className="text-lg font-bold text-white flex items-center space-x-2 border-b border-slate-800 pb-4">
              <Sparkles className="w-5 h-5 text-[#D4AF37]" />
              <span>Resumo & Saúde</span>
            </h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-slate-900/60 rounded-xl border border-slate-800">
                <span className="text-xs text-slate-300">Objetivos Confirmados</span>
                <span className="text-sm font-bold text-emerald-400">
                  {canvas.objectives.filter(o => o.status === 'CONFIRMED').length} / {canvas.objectives.length}
                </span>
              </div>
              <div className="flex items-center justify-between p-3 bg-slate-900/60 rounded-xl border border-slate-800">
                <span className="text-xs text-slate-300">Lacunas Identificadas</span>
                <span className="text-sm font-bold text-amber-400">{canvas.gaps.length}</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-slate-900/60 rounded-xl border border-slate-800">
                <span className="text-xs text-slate-300">Riscos Mapeados</span>
                <span className="text-sm font-bold text-red-400">{canvas.risks.length}</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-slate-900/60 rounded-xl border border-slate-800">
                <span className="text-xs text-slate-300">Hipóteses Ativas</span>
                <span className="text-sm font-bold text-[#3B82F6]">{canvas.hypotheses.length}</span>
              </div>
            </div>
          </div>

        </div>
      )}

      {activeTab === 'objectives' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-white flex items-center space-x-2">
              <TrendingUp className="w-5 h-5 text-[#D4AF37]" />
              <span>Objetivos Estratégicos</span>
            </h2>
            <button
              onClick={() => setNewObjModal(true)}
              className="px-4 py-2 bg-[#3B82F6]/20 border border-[#3B82F6]/40 text-[#3B82F6] hover:bg-[#3B82F6]/30 rounded-xl text-xs font-bold transition-all flex items-center space-x-2"
            >
              <Plus className="w-4 h-4" />
              <span>Novo Objetivo</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {canvas.objectives.map((obj) => (
              <div key={obj.id} className="bg-[#070D1A] border border-[#D4AF37]/20 p-6 rounded-2xl shadow-xl space-y-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#D4AF37]">Prioridade: {obj.priority}</span>
                    <h3 className="text-base font-bold text-white">{obj.title}</h3>
                  </div>
                  <span className={`px-2.5 py-1 text-[10px] font-bold uppercase rounded-full shrink-0 ${
                    obj.status === 'CONFIRMED' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' :
                    obj.status === 'REJECTED' ? 'bg-red-500/20 text-red-400 border border-red-500/30' :
                    'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                  }`}>
                    {obj.status === 'CONFIRMED' ? 'Confirmado' : obj.status === 'REJECTED' ? 'Rejeitado' : 'SUGESTÃO'}
                  </span>
                </div>

                <p className="text-xs text-slate-300">{obj.description}</p>

                <div className="flex items-center justify-between text-xs text-slate-400 pt-2 border-t border-slate-800">
                  <span>Horizonte: {obj.horizon}</span>
                  <span>Confiança: {obj.confidence}%</span>
                </div>

                <div className="flex items-center space-x-2 pt-2">
                  {obj.status !== 'CONFIRMED' && (
                    <button
                      onClick={() => handleUpdateObjectiveStatus(obj.id, 'CONFIRMED')}
                      className="px-3 py-1.5 bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 rounded-lg text-xs font-bold flex items-center space-x-1 hover:bg-emerald-500/30 transition-all"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>Confirmar</span>
                    </button>
                  )}
                  {obj.status !== 'REJECTED' && (
                    <button
                      onClick={() => handleUpdateObjectiveStatus(obj.id, 'REJECTED')}
                      className="px-3 py-1.5 bg-red-500/20 text-red-400 border border-red-500/40 rounded-lg text-xs font-bold flex items-center space-x-1 hover:bg-red-500/30 transition-all"
                    >
                      <X className="w-3.5 h-3.5" />
                      <span>Rejeitar</span>
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'priorities' && (
        <div className="space-y-6">
          <h2 className="text-xl font-bold text-white flex items-center space-x-2">
            <Layers className="w-5 h-5 text-[#D4AF37]" />
            <span>Prioridades Principais (Até 5)</span>
          </h2>
          <div className="bg-[#070D1A] border border-[#D4AF37]/30 p-6 rounded-2xl shadow-xl space-y-4">
            {canvas.priorities.map((pri, idx) => (
              <div key={pri.id} className="flex items-center justify-between p-4 bg-slate-900/60 rounded-xl border border-slate-800">
                <div className="flex items-center space-x-3">
                  <span className="w-7 h-7 rounded-full bg-[#3B82F6]/20 text-[#3B82F6] font-bold flex items-center justify-center text-xs">
                    {idx + 1}
                  </span>
                  <span className="text-sm font-semibold text-white">{pri.title}</span>
                </div>
                <span className={`px-3 py-1 text-xs font-bold rounded-full ${
                  pri.level === 'Alta' ? 'bg-red-500/20 text-red-400 border border-red-500/30' :
                  pri.level === 'Média' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' :
                  'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                }`}>
                  {pri.level}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'indicators' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-white flex items-center space-x-2">
              <CheckCircle2 className="w-5 h-5 text-[#D4AF37]" />
              <span>Indicadores & KPIs</span>
            </h2>
            <button
              onClick={() => setNewKpiModal(true)}
              className="px-4 py-2 bg-[#3B82F6]/20 border border-[#3B82F6]/40 text-[#3B82F6] hover:bg-[#3B82F6]/30 rounded-xl text-xs font-bold transition-all flex items-center space-x-2"
            >
              <Plus className="w-4 h-4" />
              <span>Vincular KPI</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {canvas.indicators.map((kpi) => (
              <div key={kpi.id} className="bg-[#070D1A] border border-[#D4AF37]/20 p-6 rounded-2xl shadow-xl space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-white">{kpi.name}</h3>
                  <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full ${
                    kpi.isSuggestion ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                  }`}>
                    {kpi.isSuggestion ? 'Recomendação IA' : 'Confirmado'}
                  </span>
                </div>
                <div className="text-xs text-slate-300 flex justify-between">
                  <span>Atual: {kpi.current || 'Não medido'}</span>
                  <span>Meta: {kpi.target || 'A definir'}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'valueChain' && (
        <div className="space-y-6">
          <h2 className="text-xl font-bold text-white flex items-center space-x-2">
            <ArrowRight className="w-5 h-5 text-[#D4AF37]" />
            <span>Cadeia de Valor Simplificada</span>
          </h2>
          <div className="bg-[#070D1A] border border-[#D4AF37]/30 p-6 rounded-2xl shadow-xl">
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              {canvas.valueChain.map((step, idx) => (
                <div key={idx} className="bg-slate-900/80 border border-slate-800 p-4 rounded-xl space-y-2 relative">
                  <div className="w-6 h-6 rounded-full bg-[#D4AF37]/20 text-[#D4AF37] font-bold text-xs flex items-center justify-center">
                    {idx + 1}
                  </div>
                  <h4 className="text-sm font-bold text-white">{step.step}</h4>
                  <p className="text-xs text-slate-300">{step.description}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'risks' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-white flex items-center space-x-2">
              <ShieldAlert className="w-5 h-5 text-[#D4AF37]" />
              <span>Riscos Estratégicos & Operacionais</span>
            </h2>
            <button
              onClick={() => setNewRiskModal(true)}
              className="px-4 py-2 bg-[#3B82F6]/20 border border-[#3B82F6]/40 text-[#3B82F6] hover:bg-[#3B82F6]/30 rounded-xl text-xs font-bold transition-all flex items-center space-x-2"
            >
              <Plus className="w-4 h-4" />
              <span>Adicionar Risco</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {canvas.risks.map((risk) => (
              <div key={risk.id} className="bg-[#070D1A] border border-red-500/20 p-6 rounded-2xl shadow-xl space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-red-400">Categoria: {risk.category}</span>
                  <span className="text-xs font-semibold text-slate-400">Impacto: {risk.estimatedImpact}</span>
                </div>
                <p className="text-sm font-semibold text-white">{risk.description}</p>
                <div className="text-xs text-slate-400">Origem: {risk.origin}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'hypotheses' && (
        <div className="space-y-6">
          <h2 className="text-xl font-bold text-white flex items-center space-x-2">
            <HelpCircle className="w-5 h-5 text-[#D4AF37]" />
            <span>Hipóteses & Inferências Não Confirmadas</span>
          </h2>
          <div className="bg-[#070D1A] border border-[#D4AF37]/30 p-6 rounded-2xl shadow-xl space-y-4">
            {canvas.hypotheses.map((hyp) => (
              <div key={hyp.id} className="p-4 bg-slate-900/60 rounded-xl border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-[#3B82F6] uppercase tracking-wider">Hipótese IA</span>
                  <span className="text-xs font-semibold text-slate-400">Confiança: {hyp.confidence}%</span>
                </div>
                <p className="text-sm text-slate-200">{hyp.statement}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'gaps' && (
        <div className="space-y-6">
          <h2 className="text-xl font-bold text-white flex items-center space-x-2">
            <AlertTriangle className="w-5 h-5 text-amber-400" />
            <span>Lacunas & Alinhamento Operacional</span>
          </h2>
          <div className="bg-[#070D1A] border border-amber-500/30 p-6 rounded-2xl shadow-xl space-y-4">
            {canvas.gaps.map((gap) => (
              <div key={gap.id} className="p-4 bg-amber-500/10 rounded-xl border border-amber-500/30 flex items-start space-x-3">
                <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <span className="text-xs font-bold text-amber-400 uppercase tracking-wider">Elemento: {gap.element}</span>
                  <p className="text-sm text-white font-medium">{gap.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* MODALS */}
      {newObjModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[999] flex items-center justify-center p-4">
          <div className="bg-[#070D1A] border border-[#D4AF37]/40 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-6">
            <h3 className="text-lg font-bold text-white">Adicionar Objetivo Estratégico</h3>
            <form onSubmit={handleCreateObjective} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Título</label>
                <input 
                  type="text" 
                  value={objForm.title}
                  onChange={e => setObjForm({...objForm, title: e.target.value})}
                  required
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2 text-sm text-white"
                  placeholder="Ex: Expandir canais digitais"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Descrição</label>
                <textarea 
                  value={objForm.description}
                  onChange={e => setObjForm({...objForm, description: e.target.value})}
                  required
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2 text-sm text-white"
                  placeholder="Detalhes do objetivo..."
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Prioridade</label>
                  <select 
                    value={objForm.priority}
                    onChange={e => setObjForm({...objForm, priority: e.target.value as any})}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2 text-sm text-white"
                  >
                    <option value="Alta">Alta</option>
                    <option value="Média">Média</option>
                    <option value="Baixa">Baixa</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Horizonte</label>
                  <input 
                    type="text" 
                    value={objForm.horizon}
                    onChange={e => setObjForm({...objForm, horizon: e.target.value})}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2 text-sm text-white"
                  />
                </div>
              </div>
              <div className="flex justify-end space-x-3 pt-4">
                <button 
                  type="button" 
                  onClick={() => setNewObjModal(false)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl text-xs font-bold"
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  className="px-5 py-2 bg-[#D4AF37] text-[#070D1A] rounded-xl text-xs font-bold"
                >
                  Salvar Objetivo
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {newRiskModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[999] flex items-center justify-center p-4">
          <div className="bg-[#070D1A] border border-red-500/40 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-6">
            <h3 className="text-lg font-bold text-white">Registrar Novo Risco</h3>
            <form onSubmit={handleCreateRisk} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Categoria</label>
                <select 
                  value={riskForm.category}
                  onChange={e => setRiskForm({...riskForm, category: e.target.value as any})}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2 text-sm text-white capitalize"
                >
                  <option value="operacional">Operacional</option>
                  <option value="estratégico">Estratégico</option>
                  <option value="financeiro">Financeiro</option>
                  <option value="tecnologia">Tecnologia</option>
                  <option value="pessoas">Pessoas</option>
                  <option value="compliance">Compliance</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Descrição do Risco</label>
                <textarea 
                  value={riskForm.description}
                  onChange={e => setRiskForm({...riskForm, description: e.target.value})}
                  required
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2 text-sm text-white"
                  placeholder="Descreva o risco..."
                />
              </div>
              <div className="flex justify-end space-x-3 pt-4">
                <button 
                  type="button" 
                  onClick={() => setNewRiskModal(false)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl text-xs font-bold"
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  className="px-5 py-2 bg-red-500 text-white rounded-xl text-xs font-bold"
                >
                  Salvar Risco
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {newKpiModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[999] flex items-center justify-center p-4">
          <div className="bg-[#070D1A] border border-[#D4AF37]/40 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-6">
            <h3 className="text-lg font-bold text-white">Vincular Indicador / KPI</h3>
            <form onSubmit={handleCreateKpi} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Nome do Indicador</label>
                <input 
                  type="text" 
                  value={kpiForm.name}
                  onChange={e => setKpiForm({...kpiForm, name: e.target.value})}
                  required
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2 text-sm text-white"
                  placeholder="Ex: Churn Rate mensal"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Valor Atual</label>
                  <input 
                    type="text" 
                    value={kpiForm.current}
                    onChange={e => setKpiForm({...kpiForm, current: e.target.value})}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2 text-sm text-white"
                    placeholder="Ex: 4.5%"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Meta</label>
                  <input 
                    type="text" 
                    value={kpiForm.target}
                    onChange={e => setKpiForm({...kpiForm, target: e.target.value})}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2 text-sm text-white"
                    placeholder="Ex: &lt; 2.0%"
                  />
                </div>
              </div>
              <div className="flex justify-end space-x-3 pt-4">
                <button 
                  type="button" 
                  onClick={() => setNewKpiModal(false)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl text-xs font-bold"
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  className="px-5 py-2 bg-[#D4AF37] text-[#070D1A] rounded-xl text-xs font-bold"
                >
                  Vincular KPI
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
