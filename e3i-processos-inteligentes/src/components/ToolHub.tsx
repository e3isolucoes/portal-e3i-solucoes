import React, { useEffect, useState } from 'react';
import { ArrowRight, ClipboardCheck, ExternalLink, FileSearch, LockKeyhole, RefreshCw, Scale, ShieldCheck } from 'lucide-react';
import { ClientTool } from '../types';
import { useAuth } from '../context/AuthContext';
import { useToast } from './ui';
import { getAuthHeaders, getErrorMessage } from '../utils';

const iconFor = (id: string) => id === 'gestao-compras' ? ClipboardCheck : id === 'painel-obrigacoes' ? Scale : FileSearch;

export const ToolHub: React.FC = () => {
  const { tenant, user, setCurrentView } = useAuth();
  const { showToast } = useToast();
  const [tools, setTools] = useState<ClientTool[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const canManage = user?.role === 'E3I_ADMIN';

  const loadTools = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/client-tools', { headers: getAuthHeaders(), credentials: 'include' });
      const data = await res.json();
      if (!res.ok) throw new Error(getErrorMessage(data, 'Não foi possível carregar as ferramentas.'));
      setTools(data.tools || []);
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Erro ao carregar ferramentas.', 'error');
    } finally { setLoading(false); }
  };

  useEffect(() => { loadTools(); }, [tenant?.id]);

  const toggleGrant = async (tool: ClientTool) => {
    setSavingId(tool.id);
    try {
      const res = await fetch(`/api/admin/organizations/${tenant?.id}/client-tools/${tool.id}`, { method: tool.granted ? 'DELETE' : 'PUT', headers: getAuthHeaders({ 'Content-Type': 'application/json' }), credentials: 'include' });
      const data = await res.json();
      if (!res.ok) throw new Error(getErrorMessage(data, 'Não foi possível alterar a concessão.'));
      setTools(current => current.map(item => item.id === tool.id ? { ...item, granted: !tool.granted } : item));
      showToast(tool.granted ? 'Acesso revogado.' : 'Acesso concedido.', 'success');
    } catch (error) { showToast(error instanceof Error ? error.message : 'Erro ao alterar acesso.', 'error'); }
    finally { setSavingId(null); }
  };

  const openTool = async (tool: ClientTool) => {
    if (!tool.granted) return;
    const res = await fetch(`/api/client-tools/${tool.id}/launch`, { method: 'POST', headers: getAuthHeaders(), credentials: 'include' });
    const data = await res.json();
    if (!res.ok) { showToast(getErrorMessage(data, 'Acesso não autorizado.'), 'error'); return; }
    if (tool.id === 'processos-inteligentes') { setCurrentView('dashboard'); return; }
    if (tool.id === 'gestao-compras') { setCurrentView('smartQuotation'); return; }
    if (tool.id === 'painel-obrigacoes') { sessionStorage.setItem('e3i_obligations_launch_url', data.url); setCurrentView('obligationsPanel'); return; }
    window.open(data.url, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="min-h-[calc(100vh-80px)] bg-[#F0F2EC] text-[#0E1A29]">
      <div className="border-b border-[#CFD6C6] bg-[#E6EAE0] px-6 py-10">
        <div className="mx-auto flex max-w-[1180px] flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div className="max-w-3xl"><p className="mb-3 flex items-center gap-2 font-mono text-[10px] uppercase tracking-[.16em] text-[#8F6A11]"><ShieldCheck className="h-4 w-4" /> Ambiente da organização</p><h1 className="font-display text-4xl font-semibold tracking-tight">Ferramentas e soluções</h1><p className="mt-3 leading-7 text-[#5C6672]">Aplicações concedidas para <strong className="text-[#17395C]">{tenant?.tradeName || tenant?.name || 'sua organização'}</strong>. Cada abertura passa por uma nova validação de acesso.</p></div>
          <button onClick={loadTools} className="inline-flex items-center justify-center gap-2 rounded-sm border border-[#B9C1B3] bg-[#FBFBF8] px-4 py-2.5 text-sm font-semibold"><RefreshCw className="h-4 w-4" /> Atualizar</button>
        </div>
      </div>

      <div className="mx-auto max-w-[1180px] px-6 py-10">
        {loading ? <div className="rounded border border-[#CFD6C6] bg-[#FBFBF8] p-12 text-center text-[#5C6672]">Carregando concessões…</div>
        : tools.length === 0 ? <div className="rounded border border-[#CFD6C6] bg-[#FBFBF8] p-12 text-center"><LockKeyhole className="mx-auto h-10 w-10 text-[#8F6A11]" /><h2 className="mt-4 font-display text-2xl font-semibold">Nenhuma ferramenta liberada</h2><p className="mt-2 text-[#5C6672]">Solicite à E³I a concessão de acesso para sua organização.</p></div>
        : <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {tools.map((tool, index) => { const Icon = iconFor(tool.id); return (
            <article key={tool.id} className={`flex min-h-[350px] flex-col rounded border bg-[#FBFBF8] p-7 ${tool.granted ? 'border-[#B9CDBF]' : 'border-[#CFD6C6] opacity-80'}`}>
              <div className="flex items-start justify-between"><span className="grid h-12 w-12 place-items-center rounded-sm bg-[#E6EAE0] text-[#17395C]"><Icon className="h-6 w-6" /></span><span className={`rounded-sm border px-2.5 py-1 font-mono text-[9px] uppercase tracking-[.12em] ${tool.granted ? 'border-[#B9CDBF] text-[#2C5A3C]' : 'border-[#CFD6C6] text-[#5C6672]'}`}>{tool.granted ? 'Acesso ativo' : 'Não concedida'}</span></div>
              <p className="mt-7 font-mono text-[10px] uppercase tracking-[.14em] text-[#8F6A11]">{tool.category} · 0{index + 1}</p><h2 className="mt-3 font-display text-2xl font-semibold">{tool.name}</h2><p className="mt-3 flex-1 text-[15px] leading-7 text-[#5C6672]">{tool.description}</p>
              {tool.granted && <button onClick={() => openTool(tool)} className="mt-6 inline-flex w-full items-center justify-between rounded-sm bg-[#0E1A29] px-4 py-3 font-semibold text-white transition hover:bg-[#17395C]">Acessar ferramenta <ExternalLink className="h-4 w-4" /></button>}
              {canManage && <button disabled={savingId === tool.id} onClick={() => toggleGrant(tool)} className={`mt-2 w-full rounded-sm border px-4 py-2.5 text-sm font-semibold ${tool.granted ? 'border-[#DDBDB9] text-[#93261F]' : 'border-[#D9A925] text-[#8F6A11]'}`}>{savingId === tool.id ? 'Salvando…' : tool.granted ? 'Revogar acesso' : 'Conceder acesso'}</button>}
            </article>); })}
        </div>}

        <div className="mt-10 grid gap-6 border-t border-[#CFD6C6] pt-8 md:grid-cols-[1fr_auto] md:items-center"><div><p className="font-display text-2xl font-semibold">Precisa de outra solução?</p><p className="mt-2 text-[#5C6672]">A E³I também estrutura diagnósticos, indicadores e automações sob medida.</p></div><a href="mailto:contato@e3isolucoes.com.br?subject=Nova%20solução%20para%20minha%20empresa" className="inline-flex items-center justify-center gap-2 rounded-sm border border-[#17395C] px-5 py-3 font-semibold text-[#17395C]">Falar com especialista <ArrowRight className="h-4 w-4" /></a></div>
        <p className="mt-8 font-mono text-[9px] uppercase tracking-[.1em] text-[#5C6672]">Concessões são vinculadas à organização ativa e revogações entram em vigor imediatamente.</p>
      </div>
    </div>
  );
};
