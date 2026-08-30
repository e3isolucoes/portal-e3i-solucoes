import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { CheckCircle2, AlertTriangle, Edit3, ArrowRight, Loader2, ShieldCheck, FileText } from 'lucide-react';
import { getErrorMessage, getAuthHeaders } from '../utils';

export const DiscoveryReviewView: React.FC = () => {
  const { tenant, setCurrentView } = useAuth();
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [completing, setCompleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchSession = async () => {
      try {
        setLoading(true);
        const headers = getAuthHeaders();
        const res = await fetch('/api/discovery/session', {
          headers,
          credentials: 'include'
        });
        if (res.ok) {
          const data = await res.json();
          setSession(data);
        }
      } catch (err) {
        console.error(err);
        setError('Erro ao carregar revisão.');
      } finally {
        setLoading(false);
      }
    };
    fetchSession();
  }, [tenant?.id]);

  const handleCompleteDiscovery = async () => {
    try {
      setCompleting(true);
      setError(null);
      const headers = getAuthHeaders({ 'Content-Type': 'application/json' });
      const res = await fetch('/api/discovery/review', {
        method: 'POST',
        headers,
        credentials: 'include',
        body: JSON.stringify({ action: 'COMPLETE' })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(getErrorMessage(data, 'Erro ao concluir Discovery.'));
      }
      setCurrentView('businessContext');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setCompleting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center bg-[#070D1A] text-slate-100">
        <Loader2 className="w-8 h-8 animate-spin text-[#3B82F6]" />
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-80px)] bg-[#070D1A] text-slate-100 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="bg-[#0A192F] border border-[#D4AF37]/30 rounded-2xl p-8 shadow-xl">
          <div className="flex items-center space-x-3 mb-4">
            <ShieldCheck className="w-8 h-8 text-[#D4AF37]" />
            <h1 className="text-2xl font-bold text-white">Revisão do Discovery e Contexto</h1>
          </div>
          <p className="text-slate-300">
            Revise abaixo o resumo das informações coletadas por dimensão, o nível de confiança calculado e eventuais inconsistências detectadas antes de gerar seu Context Package v2 oficial.
          </p>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/30 text-red-300 px-4 py-3 rounded-xl text-sm flex items-center space-x-2">
            <AlertTriangle className="w-5 h-5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Inconsistencies Alert if any */}
        {session?.inconsistencies && session.inconsistencies.length > 0 && (
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-6">
            <div className="flex items-center space-x-2 text-amber-400 font-semibold mb-3">
              <AlertTriangle className="w-5 h-5" />
              <span>Inconsistências ou Pontos de Atenção Detectados:</span>
            </div>
            <ul className="list-disc list-inside space-y-1 text-sm text-amber-200/90">
              {session.inconsistencies.map((inc: any, idx: number) => (
                <li key={idx}>{inc.message || inc}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Dimensions Summary */}
        <div className="space-y-4">
          <h2 className="text-xl font-bold text-white">Resumo por Dimensão</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Object.entries(session?.confidenceScores || {}).map(([dim, score]: [string, any]) => {
              const dimAnswers = (session?.answers || []).filter((a: any) => a.dimension === dim);
              return (
                <div key={dim} className="bg-[#0A192F] border border-slate-800 rounded-xl p-6 shadow-md space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-white uppercase text-sm tracking-wider text-[#3B82F6]">{dim}</span>
                    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                      score >= 80 ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' :
                      score >= 50 ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' :
                      'bg-red-500/20 text-red-300 border border-red-500/40'
                    }`}>
                      Confiança: {score}%
                    </span>
                  </div>

                  <div className="space-y-2 text-sm text-slate-300">
                    {dimAnswers.length === 0 ? (
                      <p className="text-slate-500 italic">Nenhuma resposta registrada.</p>
                    ) : (
                      dimAnswers.map((ans: any, i: number) => (
                        <div key={i} className="bg-slate-900/60 p-3 rounded-lg border border-slate-800">
                          <p className="text-xs text-slate-400 mb-1 font-medium">{ans.questionText}</p>
                          <p className="text-slate-200">{ans.answer}</p>
                        </div>
                      ))
                    )}
                  </div>

                  <button
                    onClick={() => setCurrentView('discovery')}
                    className="text-xs text-[#3B82F6] hover:underline flex items-center space-x-1 pt-1"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>Editar respostas desta dimensão</span>
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* Action Button */}
        <div className="flex justify-end pt-6">
          <button
            onClick={handleCompleteDiscovery}
            disabled={completing}
            className="px-8 py-3.5 bg-[#3B82F6] hover:bg-blue-600 disabled:opacity-50 text-white rounded-xl font-semibold transition-all shadow-xl flex items-center space-x-3"
          >
            {completing ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <>
                <CheckCircle2 className="w-5 h-5" />
                <span>Concluir Discovery e Gerar Context Package v2</span>
              </>
            )}
          </button>
        </div>

      </div>
    </div>
  );
};
