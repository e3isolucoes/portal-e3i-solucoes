import { supabase } from '../supabaseClient.js';
import { withCurrentWorkspace, withCurrentWorkspaceMany } from './workspaceContext.js';
import { awsData, isAwsDataBackend } from './awsDataClient.js';

// O data.js mantém uma lista explícita de campos do payload por compatibilidade
// com o legado. A competência é uma configuração do formulário interativo e,
// enquanto essa camada continua explícita, enriquecemos a escrita aqui. Chamadas
// sem o modal aberto (importação, scripts e testes) permanecem inalteradas e
// usam o comportamento retrocompatível de competência no mesmo mês.
function withInteractiveCompetence(payload) {
  if (typeof document === 'undefined') return payload;
  const field = document.getElementById('fCompetenceOffset');
  if (!field) return payload;
  const parsed = Number.parseInt(field.value, 10);
  const competenceOffset = Number.isInteger(parsed) ? Math.max(0, Math.min(36, parsed)) : 0;
  return { ...payload, competence_offset_months: competenceOffset };
}

export async function fetchObligations() {
  if (isAwsDataBackend()) return (await awsData.list('obligations')).sort((a, b) => (a.name || '').localeCompare(b.name || '', 'pt-BR'));
  const { data, error } = await supabase.from('obligations').select('*').order('name');
  if (error) throw error;
  return data;
}

// `ob` já vem no formato de coluna do banco (day_of_month, due_date, etc.)
// — ver js/ui/modal.js, função formToObligationPayload.
export async function createObligation(ob) {
  const payload = withInteractiveCompetence(ob);
  if (isAwsDataBackend()) return awsData.create('obligations', payload);
  // A criação unitária é permitida a todo membro autenticado. Importações em
  // massa continuam usando a RPC restrita à Gestão.
  const { data, error } = await supabase
    .from('obligations')
    .insert(withCurrentWorkspace(payload))
    .select()
    .single();
  if (error) throw error;
  return data;
}

function isMissingImportRpc(error) {
  return error?.code === 'PGRST202'
    || (error?.code === '404' && /import_obligations/i.test(error?.message || ''));
}

// Instalações atualizadas usam a RPC, que valida o administrador e grava toda a
// planilha em uma transação SECURITY DEFINER. O site, porém, pode ser publicado
// antes de a migração SQL ser aplicada ao Supabase. Nesse caso específico fazemos
// um único INSERT (também atômico no PostgREST), protegido pela policy RLS de
// administrador. Assim a importação não fica inutilizada por uma RPC ausente e
// erros reais de permissão ou validação continuam sendo exibidos normalmente.
export async function createObligationsBulk(obs) {
  if (!obs.length) return [];
  if (isAwsDataBackend()) {
    throw new Error('Importação em lote ainda não está habilitada no backend AWS. Use o Supabase até a conclusão da transação em lote.');
  }
  const workspaceItems = withCurrentWorkspaceMany(obs);
  const rpcResult = await supabase.rpc('import_obligations', { p_items: workspaceItems });
  if (!rpcResult.error) return rpcResult.data || [];
  if (!isMissingImportRpc(rpcResult.error)) throw rpcResult.error;

  const { data, error } = await supabase.from('obligations').insert(workspaceItems).select();
  if (error) {
    // Preserve the first failure as context. A 42501 after a PGRST202 does
    // not prove that the current profile is not an admin: it usually means
    // that the site was deployed without the companion database migration.
    error.importRpcMissing = true;
    error.importRpcError = rpcResult.error;
    throw error;
  }
  return data || [];
}

export async function updateObligation(id, patch) {
  const payload = withInteractiveCompetence(patch);
  if (isAwsDataBackend()) return awsData.update('obligations', id, payload);
  const { data, error } = await supabase.from('obligations').update(payload).eq('id', id).select().single();
  if (error) throw error;
  return data;
}

// Apaga só a linha desta obrigação; as conclusões associadas somem junto
// por causa do "on delete cascade" definido no schema (não é preciso
// limpar nada manualmente no front-end).
export async function deleteObligation(id) {
  if (isAwsDataBackend()) return awsData.remove('obligations', id);
  const { error } = await supabase.from('obligations').delete().eq('id', id);
  if (error) throw error;
}
