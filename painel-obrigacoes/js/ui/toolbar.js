import {
  STATE, isAdmin, isManager, isSuperUser, canAccessModule, activeOccurrences,
  competenceForOccurrence, competenceKey, competenceLabel,
} from '../state.js';
import { CATEGORIES, ADMINISTRATIVE_MODULES } from '../constants.js';
import { escapeHtml } from '../dateUtils.js';
import { validationBadgeCount } from './validationQueue.js';
import { hasModuleGrant } from '../modules/registry.js';

function distinctResponsibles() {
  const set = new Set();
  STATE.obligations.forEach((o) => { if (o.responsible) set.add(o.responsible); });
  return Array.from(set).sort();
}

function showValidationTab() {
  if (isAdmin()) return true;
  if (validationBadgeCount() > 0) return true;
  return STATE.obligations.some((o) => o.validator_id && o.validator_id === STATE.session?.id);
}

function ddHtml(key, allLabel, options, selected) {
  let selLabel = allLabel;
  if (selected !== 'all') {
    const found = options.find((o) => o.value === selected);
    if (found) selLabel = found.label;
  }
  const items = `<button type="button" class="dd-item ${selected === 'all' ? 'active' : ''}" data-action="dd-select" data-dd="${key}" data-value="all" role="option" aria-selected="${selected === 'all'}">${escapeHtml(allLabel)}</button>`
    + options.map((o) => `<button type="button" class="dd-item ${selected === o.value ? 'active' : ''}" data-action="dd-select" data-dd="${key}" data-value="${escapeHtml(o.value)}" role="option" aria-selected="${selected === o.value}">${escapeHtml(o.label)}</button>`).join('');
  return `<div class="dd" data-dd-root="${key}">`
    + `<button type="button" class="dd-btn" data-action="dd-toggle" data-dd="${key}" aria-haspopup="listbox" aria-expanded="false"><span class="dd-label">${escapeHtml(selLabel)}</span><span class="dd-caret" aria-hidden="true">▾</span></button>`
    + `<div class="dd-panel hidden" data-dd-panel="${key}" role="listbox" aria-label="${escapeHtml(allLabel)}">${items}</div>`
    + '</div>';
}

function selectFilterHtml({ action, key, allLabel, options, selected }) {
  const value = selected || 'all';
  const dataKey = action === 'module-filter' ? '' : ` data-filter="${escapeHtml(key)}"`;
  return `<select class="dd-btn filter-select" data-action="${action}"${dataKey} aria-label="${escapeHtml(allLabel)}">`
    + `<option value="all" ${value === 'all' ? 'selected' : ''}>${escapeHtml(allLabel)}</option>`
    + options.map((option) => `<option value="${escapeHtml(option.value)}" ${value === option.value ? 'selected' : ''}>${escapeHtml(option.label)}</option>`).join('')
    + '</select>';
}

function competenceOptions() {
  const byId = new Map(STATE.obligations.map((ob) => [ob.id, ob]));
  const periods = new Map();

  activeOccurrences().forEach(({ competence }) => {
    const key = competenceKey(competence);
    if (key) periods.set(key, competenceLabel(competence));
  });

  STATE.completions.forEach((completion) => {
    const obligation = byId.get(completion.obligation_id);
    if (!obligation) return;
    const competence = competenceForOccurrence(obligation, completion.occurrence_date);
    const key = competenceKey(competence);
    if (key) periods.set(key, competenceLabel(competence));
  });

  return Array.from(periods.entries())
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([value, label]) => ({ value, label }));
}

export function renderToolbar() {
  const resp = distinctResponsibles();
  const empresaOptions = STATE.companies.map((c) => ({ value: c.id, label: c.name }));
  const mineCount = STATE.obligations.filter((o) => o.responsible_id === STATE.session?.id).length;
  const valCount = validationBadgeCount();
  const statusOptions = [
    { value: 'red', label: 'Atrasadas' },
    { value: 'today', label: 'Vence hoje' },
    { value: 'amber', label: 'Vencem em breve' },
    { value: 'green', label: 'No prazo' },
    { value: 'muted', label: 'Sem pendência próxima' },
  ];
  const receiptOptions = [{ value: 'missing', label: 'Sem comprovante' }];
  const moduleOptions = ADMINISTRATIVE_MODULES
    .filter((module) => canAccessModule(module.key))
    .map((module) => ({ value: module.key, label: module.label }));
  const activeModuleInfo = STATE.activeModule === 'all'
    ? null
    : ADMINISTRATIVE_MODULES.find((module) => module.key === STATE.activeModule && canAccessModule(module.key));
  const moduleContextLabel = activeModuleInfo?.label || 'Todos os módulos';
  const moduleContextColor = activeModuleInfo?.color || '#5C6672';
  const periodOptions = competenceOptions();

  const activeFilterCount = Object.values(STATE.filters)
    .filter((value) => (value ?? 'all') !== 'all').length
    + (STATE.activeModule !== 'all' ? 1 : 0);
  const tab = (view, label) => `<button class="tab-btn ${STATE.view === view ? 'active' : ''}" data-action="tab" data-tab="${view}"${STATE.view === view ? ' aria-current="page"' : ''}>${label}</button>`;

  let html = '<section class="toolbar" aria-label="Navegação e filtros">';
  html += '<nav class="tabs" aria-label="Áreas do painel">';
  if (hasModuleGrant(STATE.profile, 'obrigacoes')) {
    html += tab('board', 'Atividades');
    html += '<div class="module-tabs" aria-label="Módulo em uso">'
      + `<span class="module-tab active" style="--module-color:${escapeHtml(moduleContextColor)};cursor:default" aria-label="Módulo selecionado: ${escapeHtml(moduleContextLabel)}">Módulo: ${escapeHtml(moduleContextLabel)}</span>`
      + '</div>';
    if (!isManager()) html += tab('mine', `Minhas atividades${mineCount ? ` (${mineCount})` : ''}`);
  }

  if (showValidationTab() && hasModuleGrant(STATE.profile, 'validacoes')) {
    const selo = valCount
      ? ` <span class="tab-badge${STATE.validation?.rejected ? ' tab-badge-erro' : ''}">${valCount}</span>`
      : '';
    html += tab('validacoes', `Validações${selo}`);
  }

  if (isManager()) {
    if (hasModuleGrant(STATE.profile, 'administracao')) html += tab('manage', 'Gerenciar');
    if (hasModuleGrant(STATE.profile, 'relatorios')) html += tab('reports', 'Relatórios');
    if (hasModuleGrant(STATE.profile, 'dashboard')) html += tab('dashboard', 'Central de Gestão');
  }
  if (isSuperUser()) html += tab('system-admin', 'Administração do sistema');
  html += '</nav>';

  html += '<div class="filters"><span class="filters-label">Filtrar</span>';
  if (hasModuleGrant(STATE.profile, 'obrigacoes')) {
    html += selectFilterHtml({
      action: 'module-filter', key: 'module', allLabel: 'Todos os módulos', options: moduleOptions, selected: STATE.activeModule,
    });
  }
  html += ddHtml('empresa', 'Todas as empresas', empresaOptions, STATE.filters.empresa || 'all');
  html += ddHtml('category', 'Categorias de obrigação', CATEGORIES.map((c) => ({ value: c.key, label: c.label })), STATE.filters.category || 'all');
  html += ddHtml('responsible', 'Todos os responsáveis', resp.map((r) => ({ value: r, label: r })), STATE.filters.responsible || 'all');
  html += ddHtml('status', 'Todos os status', statusOptions, STATE.filters.status || 'all');
  html += ddHtml('receipt', 'Com ou sem comprovante', receiptOptions, STATE.filters.receipt || 'all');
  html += selectFilterHtml({
    action: 'filter-select', key: 'competence', allLabel: 'Todas as competências', options: periodOptions, selected: STATE.filters.competence || 'all',
  });
  html += `<button type="button" class="clear-filters" data-action="clear-filters" aria-label="Remover todos os filtros" ${activeFilterCount ? '' : 'disabled'}>Remover filtros${activeFilterCount ? ` <span>${activeFilterCount}</span>` : ''}</button>`;
  if (hasModuleGrant(STATE.profile, 'obrigacoes')) html += '<button class="btn-primary" data-action="new">+ Nova atividade</button>';
  html += '</div></section>';
  return html;
}
