import { supabase } from '../supabaseClient.js';
import { withCurrentWorkspace } from './workspaceContext.js';
import { awsData, isAwsDataBackend } from './awsDataClient.js';

function withInteractiveCompetence(rule) {
  if (!isAwsDataBackend() || typeof document === 'undefined') return rule;
  const field = document.getElementById('rCompetenceOffset');
  if (!field) return rule;
  const parsed = Number.parseInt(field.value, 10);
  const competenceOffset = Number.isInteger(parsed) ? Math.max(0, Math.min(36, parsed)) : 0;
  return { ...rule, competence_offset_months: competenceOffset };
}

export async function fetchObligationRules() {
  if (isAwsDataBackend()) return (await awsData.list('obligation_rules')).sort((a, b) => (a.name || '').localeCompare(b.name || '', 'pt-BR'));
  const { data, error } = await supabase.from('obligation_rules').select('*').order('name');
  if (error) throw error;
  return data;
}

export async function createObligationRule(rule) {
  const payload = withInteractiveCompetence(rule);
  if (isAwsDataBackend()) return awsData.create('obligation_rules', payload);
  const { data, error } = await supabase.from('obligation_rules').insert(withCurrentWorkspace(payload)).select().single();
  if (error) throw error;
  return data;
}

export async function updateObligationRule(id, patch) {
  const payload = withInteractiveCompetence(patch);
  if (isAwsDataBackend()) return awsData.update('obligation_rules', id, payload);
  const { data, error } = await supabase.from('obligation_rules').update(payload).eq('id', id).select().single();
  if (error) throw error;
  return data;
}

export async function deleteObligationRule(id) {
  if (isAwsDataBackend()) return awsData.remove('obligation_rules', id);
  const { error } = await supabase.from('obligation_rules').delete().eq('id', id);
  if (error) throw error;
}
