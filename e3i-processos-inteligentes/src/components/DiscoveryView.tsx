import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Compass, ArrowRight, ArrowLeft, HelpCircle, CheckCircle2, AlertTriangle, Save, Loader2, RefreshCw } from 'lucide-react';
import { getErrorMessage, getAuthHeaders } from '../utils';

export const DiscoveryView: React.FC = () => {
  const { user, tenant, setCurrentView } = useAuth();
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [answerInput, setAnswerInput] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const dimensions = [
    { id: 'company', name: 'Empresa', icon: '🏢' },
    { id: 'strategy', name: 'Estratégia', icon: '🎯' },
    { id: 'organization', name: 'Organização', icon: '👥' },
    { id: 'operations', name: 'Operação', icon: '⚙️' },
    { id: 'systems', name: 'Sistemas', icon: '💻' },
    { id: 'indicators', name: 'Indicadores', icon: '📈' },
    { id: 'knowledge', name: 'Conhecimento', icon: '📚' },
    { id: 'findings', name: 'Dores & Oportunidades', icon: '💡' }
  ];

  const fetchOrCreateSession = async () => {
    try {
      setLoading(true);
      setError(null);
      const headers = getAuthHeaders();
      console.log('[E3I Discovery Diagnostics] Fetching session with headers...');
      const res = await fetch('/api/discovery/session', {
        headers,
        credentials: 'include'
      });
      console.log('[E3I Discovery Diagnostics] /api/discovery/session status:', res.status);
      if (res.ok) {
        const data = await res.json();
        console.log('[E3I Discovery Diagnostics] Session found:', data);
        setSession(data);
        if (data.status === 'REVIEW') {
          setCurrentView('discoveryReview');
          return;
        }
      } else {
        const errJson = await res.json().catch(() => ({}));
        console.log('[E3I Discovery Diagnostics] Session not found (404/error), starting session...', errJson);
        // Start session
        const startHeaders = getAuthHeaders({ 'Content-Type': 'application/json' });
        const startRes = await fetch('/api/discovery/start', {
          method: 'POST',
          headers: startHeaders,
          credentials: 'include'
        });
        const startData = await startRes.json();
        console.log('[E3I Discovery Diagnostics] /api/discovery/start status:', startRes.status, startData);
        if (startRes.ok) {
          setSession(startData);
        } else {
          setError(getErrorMessage(startData, 'Não foi possível iniciar a sessão de descoberta. Verifique sua autenticação.'));
        }
      }
    } catch (err: any) {
      console.error('[E3I Discovery Diagnostics] Error in fetchOrCreateSession:', err);
      setError(getErrorMessage(err, 'Erro ao carregar o Discovery.'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrCreateSession();
  }, [tenant?.id]);

  const handleSaveAnswer = async (isDontKnow = false) => {
    if (!session) return;
    if (!isDontKnow && !answerInput.trim()) {
      setError('Por favor, digite uma resposta ou selecione "Não sei".');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);
      const headers = getAuthHeaders({ 'Content-Type': 'application/json' });
      const res = await fetch('/api/discovery/answer', {
        method: 'POST',
        headers,
        credentials: 'include',
        body: JSON.stringify({
          dimension: session.currentDimension,
          questionId: session.currentQuestion?.id,
          answer: isDontKnow ? 'Não sei informar no momento.' : answerInput,
          isDontKnow
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(getErrorMessage(data, 'Erro ao salvar resposta.'));
      }

      setSession(data);
      setAnswerInput('');
      if (data.status === 'REVIEW') {
        setCurrentView('discoveryReview');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center bg-[#070D1A] text-slate-100">
        <div className="flex items-center space-x-3">
          <Loader2 className="w-8 h-8 animate-spin text-[#3B82F6]" />
          <span className="text-lg font-medium">Iniciando seu Discovery Adaptativo...</span>
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-[80vh] flex flex-col items-center justify-center p-6 bg-[#070D1A] text-slate-100">
        <AlertTriangle className="w-12 h-12 text-amber-400 mb-4" />
        <h2 className="text-xl font-bold mb-2">Sessão não encontrada</h2>
        <p className="text-slate-400 mb-6 text-center max-w-md">{error || 'Não foi possível carregar ou iniciar a sessão de descoberta.'}</p>
        <button
          onClick={() => { setError(null); fetchOrCreateSession(); }}
          className="px-6 py-2.5 bg-[#3B82F6] hover:bg-blue-600 rounded-xl text-white font-medium transition-all shadow-lg"
        >
          Tentar Novamente
        </button>
      </div>
    );
  }

  const currentDimIndex = dimensions.findIndex(d => d.id === session.currentDimension);
  const currentDimObj = dimensions[currentDimIndex] || dimensions[0];

  return (
    <div className="min-h-[calc(100vh-80px)] bg-[#070D1A] text-slate-100 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-8">
        
        {/* Header & Progress */}
        <div className="bg-[#0A192F] border border-[#3B82F6]/30 rounded-2xl p-6 shadow-xl">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 rounded-xl bg-[#3B82F6]/20 border border-[#3B82F6]/40 flex items-center justify-center text-2xl">
                {currentDimObj.icon}
              </div>
              <div>
                <span className="text-xs uppercase tracking-wider text-[#D4AF37] font-semibold">Dimensão Atual</span>
                <h1 className="text-2xl font-bold text-white">{currentDimObj.name}</h1>
              </div>
            </div>
            <div className="flex items-center space-x-2 bg-slate-900/80 px-4 py-2 rounded-xl border border-slate-800">
              <span className="text-sm text-slate-400">Progresso Geral:</span>
              <span className="text-sm font-bold text-[#3B82F6]">{session.progressPercent || 0}%</span>
            </div>
          </div>

          {/* Dimension Steps Indicator */}
          <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
            {dimensions.map((dim, idx) => {
              const isActive = dim.id === session.currentDimension;
              const isCompleted = currentDimIndex > idx || session.completedDimensions?.includes(dim.id);
              return (
                <div
                  key={dim.id}
                  className={`h-2 rounded-full transition-all ${
                    isActive
                      ? 'bg-[#3B82F6] shadow-[0_0_12px_rgba(59,130,246,0.5)]'
                      : isCompleted
                      ? 'bg-emerald-500'
                      : 'bg-slate-800'
                  }`}
                  title={dim.name}
                />
              );
            })}
          </div>
        </div>

        {/* Question Card */}
        <div className="bg-[#0A192F] border border-slate-800 rounded-2xl p-8 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-[#3B82F6]/5 rounded-bl-full pointer-events-none" />

          {error && (
            <div className="mb-6 bg-red-500/10 border border-red-500/30 text-red-300 px-4 py-3 rounded-xl text-sm flex items-center space-x-2">
              <AlertTriangle className="w-5 h-5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="mb-6">
            <span className="inline-block px-3 py-1 bg-[#D4AF37]/10 border border-[#D4AF37]/30 text-[#D4AF37] text-xs font-semibold rounded-full mb-3">
              Pergunta {session.questionNumber || 1}
            </span>
            <h2 className="text-xl sm:text-2xl font-semibold text-white leading-relaxed">
              {session.currentQuestion?.text}
            </h2>
          </div>

          {session.currentQuestion?.example && (
            <div className="mb-6 bg-slate-900/60 border border-slate-800 rounded-xl p-4 text-sm text-slate-300 flex items-start space-x-3">
              <span className="text-[#3B82F6] font-semibold shrink-0">💡 Exemplo:</span>
              <p className="italic">{session.currentQuestion.example}</p>
            </div>
          )}

          {/* Answer Input */}
          <div className="space-y-4">
            <textarea
              rows={4}
              value={answerInput}
              onChange={(e) => setAnswerInput(e.target.value)}
              placeholder="Digite sua resposta de forma simples, sem termos técnicos..."
              className="w-full bg-slate-900 border border-slate-700 rounded-xl p-4 text-white placeholder-slate-500 focus:outline-none focus:border-[#3B82F6] focus:ring-1 focus:ring-[#3B82F6] transition-all resize-none"
            />

            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
              <div className="flex items-center space-x-3 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => handleSaveAnswer(true)}
                  disabled={submitting}
                  className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-sm font-medium transition-all border border-slate-700 flex items-center justify-center space-x-2"
                >
                  <HelpCircle className="w-4 h-4 text-amber-400" />
                  <span>Não sei / Pular por enquanto</span>
                </button>
              </div>

              <div className="flex items-center space-x-3 w-full sm:w-auto justify-end">
                <button
                  type="button"
                  onClick={() => handleSaveAnswer(false)}
                  disabled={submitting || !answerInput.trim()}
                  className="w-full sm:w-auto px-6 py-3 bg-[#3B82F6] hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl font-medium transition-all shadow-lg flex items-center justify-center space-x-2"
                >
                  {submitting ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      <span>Continuar</span>
                      <ArrowRight className="w-5 h-5" />
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Autosave footer */}
        <div className="text-center text-xs text-slate-500 flex items-center justify-center space-x-2">
          <Save className="w-3.5 h-3.5 text-emerald-400" />
          <span>Suas respostas são salvas automaticamente em segurança. Você pode sair e retornar a qualquer momento.</span>
        </div>

      </div>
    </div>
  );
};
