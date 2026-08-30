import React, { useEffect, useState } from 'react';
import { AlertTriangle, Building2, Check, Clock3, Mail, RefreshCw, ShieldCheck, X } from 'lucide-react';
import { getAuthHeaders, getErrorMessage } from '../utils';
import { Button, Modal, useToast } from './ui';

type AccessRequest = {
  id: string; name: string; corporateEmail: string; phone: string; jobTitle: string;
  companyName: string; document: string; requestedToolIds: string[]; reason: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED'; createdAt: string;
  activationNotificationStatus?: 'NOT_REQUIRED' | 'SENT' | 'FAILED' | 'NOT_CONFIGURED';
  activationLastSentAt?: string;
};

export const AccessRequestsView: React.FC = () => {
  const [requests, setRequests] = useState<AccessRequest[]>([]);
  const [toolNames, setToolNames] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [organizationRequired, setOrganizationRequired] = useState<AccessRequest | null>(null);
  const { showToast } = useToast();

  const load = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/access-requests', { headers: getAuthHeaders(), credentials: 'include' });
      const data = await response.json();
      if (!response.ok) throw new Error(getErrorMessage(data, 'Não foi possível carregar as solicitações.'));
      setRequests(data.requests || []);
      setToolNames(Object.fromEntries((data.tools || []).map((tool: { id: string; name: string }) => [tool.id, tool.name])));
    } catch (error) { showToast(error instanceof Error ? error.message : 'Erro ao carregar solicitações.', 'error'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const decide = async (requestId: string, decision: 'APPROVED' | 'REJECTED', createOrganization = false) => {
    setSaving(requestId);
    try {
      const response = await fetch(`/api/admin/access-requests/${requestId}`, { method: 'PATCH', headers: getAuthHeaders({ 'Content-Type': 'application/json' }), credentials: 'include', body: JSON.stringify({ decision, createOrganization }) });
      const data = await response.json();
      if (response.status === 409 && data.code === 'ORGANIZATION_REQUIRED') {
        setOrganizationRequired(requests.find(item => item.id === requestId) || null);
        return;
      }
      if (!response.ok) throw new Error(getErrorMessage(data, 'Não foi possível concluir a análise.'));
      setRequests(current => current.map(item => item.id === requestId ? data.request : item));
      setOrganizationRequired(null);
      if (decision === 'APPROVED') {
        const messages: Record<string, { text: string; type: 'success' | 'error' }> = {
          SENT: { text: 'Acesso aprovado. O link de ativação foi enviado ao solicitante.', type: 'success' },
          NOT_REQUIRED: { text: 'Acesso aprovado. A conta existente já está ativa.', type: 'success' },
          FAILED: { text: 'Acesso aprovado, mas o e-mail de ativação falhou. Use “Reenviar ativação”.', type: 'error' },
          NOT_CONFIGURED: { text: 'Acesso aprovado, mas o serviço de e-mail não está configurado.', type: 'error' },
        };
        const feedback = messages[data.activationNotificationStatus] || messages.FAILED;
        showToast(feedback.text, feedback.type);
      } else showToast('Solicitação rejeitada.', 'success');
    } catch (error) { showToast(error instanceof Error ? error.message : 'Erro ao analisar solicitação.', 'error'); }
    finally { setSaving(null); }
  };

  const resendActivation = async (requestId: string) => {
    setSaving(requestId);
    try {
      const response = await fetch(`/api/admin/access-requests/${requestId}/resend-activation`, { method: 'POST', headers: getAuthHeaders(), credentials: 'include' });
      const data = await response.json();
      if (data.request) setRequests(current => current.map(item => item.id === requestId ? data.request : item));
      if (!response.ok) throw new Error(getErrorMessage(data, 'Não foi possível reenviar a ativação.'));
      showToast('Novo link de ativação enviado ao solicitante.', 'success');
    } catch (error) { showToast(error instanceof Error ? error.message : 'Erro ao reenviar ativação.', 'error'); }
    finally { setSaving(null); }
  };

  return <div className="min-h-[calc(100vh-80px)] bg-canvas px-6 py-10 text-text-primary">
    <div className="mx-auto max-w-[1180px]">
      <div className="flex flex-col gap-5 border-b border-border-subtle pb-7 sm:flex-row sm:items-end sm:justify-between"><div><p className="font-mono text-[10px] uppercase tracking-[.16em] text-gold">Governança de acesso</p><h1 className="mt-2 font-display text-4xl font-semibold">Solicitações de acesso</h1><p className="mt-2 text-text-muted">Valide a empresa e o solicitante antes de conceder qualquer ferramenta.</p></div><button onClick={load} className="inline-flex items-center gap-2 rounded-sm border border-border-strong bg-surface px-4 py-2.5 text-sm font-semibold"><RefreshCw className="h-4 w-4" /> Atualizar</button></div>
      {loading ? <p className="py-12 text-center text-text-muted">Carregando solicitações…</p> : requests.length === 0 ? <div className="mt-8 rounded border border-border-subtle bg-surface p-12 text-center"><ShieldCheck className="mx-auto h-9 w-9 text-gold" /><p className="mt-4 font-display text-2xl font-semibold">Nenhuma solicitação</p></div> : <div className="mt-8 space-y-4">{requests.map(request => <article key={request.id} className="rounded border border-border-subtle bg-surface p-6"><div className="flex flex-col gap-5 lg:flex-row lg:justify-between"><div><div className="flex flex-wrap items-center gap-3"><h2 className="font-display text-2xl font-semibold">{request.companyName}</h2><span className="rounded-sm border border-border-subtle px-2 py-1 font-mono text-[9px] uppercase tracking-wider">{request.status}</span>{request.activationNotificationStatus && request.activationNotificationStatus !== 'NOT_REQUIRED' && <span className={`rounded-sm px-2 py-1 font-mono text-[9px] uppercase tracking-wider ${request.activationNotificationStatus === 'SENT' ? 'bg-success/10 text-success' : 'bg-danger/10 text-danger'}`}>E-mail: {request.activationNotificationStatus === 'SENT' ? 'enviado' : request.activationNotificationStatus === 'FAILED' ? 'falhou' : 'não configurado'}</span>}</div><p className="mt-2 text-sm text-text-secondary">{request.name} · {request.jobTitle} · {request.corporateEmail} · {request.phone}</p><p className="mt-1 font-mono text-[10px] text-text-muted">CNPJ {request.document} · {new Date(request.createdAt).toLocaleString('pt-BR')}</p><div className="mt-4 flex flex-wrap gap-2">{request.requestedToolIds.map(id => <span key={id} className="rounded-sm bg-surface-raised px-2.5 py-1 text-xs font-semibold text-accent">{toolNames[id] || id}</span>)}</div>{request.reason && <p className="mt-4 max-w-3xl text-sm leading-6 text-text-secondary">{request.reason}</p>}</div>{request.status === 'PENDING' ? <div className="flex shrink-0 gap-2 self-start"><button disabled={saving === request.id} onClick={() => decide(request.id, 'REJECTED')} className="inline-flex items-center gap-2 rounded-sm border border-danger px-3 py-2 text-sm font-semibold text-danger"><X className="h-4 w-4" /> Rejeitar</button><button disabled={saving === request.id} onClick={() => decide(request.id, 'APPROVED')} className="inline-flex items-center gap-2 rounded-sm bg-accent px-3 py-2 text-sm font-semibold text-white"><Check className="h-4 w-4" /> Aprovar</button></div> : request.status === 'APPROVED' && request.activationNotificationStatus !== 'NOT_REQUIRED' ? <button disabled={saving === request.id} onClick={() => resendActivation(request.id)} className="inline-flex shrink-0 items-center gap-2 self-start rounded-sm border border-border-strong px-3 py-2 text-sm font-semibold"><Mail className="h-4 w-4" /> Reenviar ativação</button> : null}</div></article>)}</div>}
      <p className="mt-8 flex items-center gap-2 text-xs text-text-muted"><Clock3 className="h-4 w-4" /> Aprovações e rejeições são registradas na trilha de auditoria.</p>
    </div>
    <Modal
      isOpen={Boolean(organizationRequired)}
      onClose={() => setOrganizationRequired(null)}
      title="Cadastrar empresa e aprovar"
      description="A organização ainda não existe no Portal E3I. Confirme os dados antes de prosseguir."
      maxWidth="md"
    >
      {organizationRequired && <div className="space-y-5">
        <div className="flex gap-3 rounded-sm border border-warning/40 bg-warning/10 p-4 text-sm text-text-secondary">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-warning" />
          <p>Esta ação criará uma organização isolada, vinculará o solicitante e concederá somente as ferramentas listadas abaixo.</p>
        </div>
        <div className="rounded-sm border border-border-subtle bg-surface-raised p-4">
          <div className="flex items-center gap-2 font-display text-xl font-semibold"><Building2 className="h-5 w-5 text-gold" /> {organizationRequired.companyName}</div>
          <p className="mt-2 font-mono text-xs text-text-muted">CNPJ {organizationRequired.document}</p>
          <p className="mt-3 text-sm text-text-secondary">Usuário inicial: {organizationRequired.name} · {organizationRequired.corporateEmail}</p>
          <div className="mt-3 flex flex-wrap gap-2">{organizationRequired.requestedToolIds.map(id => <span key={id} className="rounded-sm bg-surface px-2.5 py-1 text-xs font-semibold text-accent">{toolNames[id] || id}</span>)}</div>
        </div>
        <div className="flex justify-end gap-3">
          <Button variant="secondary" onClick={() => setOrganizationRequired(null)}>Cancelar</Button>
          <Button variant="primary" disabled={saving === organizationRequired.id} onClick={() => decide(organizationRequired.id, 'APPROVED', true)}>
            Confirmar cadastro e aprovar
          </Button>
        </div>
      </div>}
    </Modal>
  </div>;
};
