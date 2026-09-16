const SAFE_DEFAULTS = Object.freeze({
  intelligence: Object.freeze({
    enabled: false,
    ingestionEnabled: false,
    agentMode: 'DISABLED',
    requireHumanApproval: true,
    allowSensitivePersonalData: false,
    defaultRetentionClass: 'ANALYTICS_2Y',
    mappingPurposeId: 'process-mapping-v1',
  }),
  governance: Object.freeze({ auditLevel: 'ENHANCED', savingValidationRequired: true }),
});

const TAB_META = Object.freeze({
  overview: ['Visão geral', 'Governança central de identidade, acessos, segurança e parâmetros.'],
  users: ['Usuários', 'Ciclo de vida de identidades e privilégios da organização ativa.'],
  access: ['Acessos', 'Concessões de ferramentas e entitlements da organização.'],
  parameters: ['Parâmetros', 'Configuração governada do E3I Intelligence.'],
  security: ['Segurança', 'Controles ativos e evolução de identidade empresarial.'],
  audit: ['Auditoria', 'Rastreabilidade das alterações administrativas.'],
});

const state = {
  organizationId: '', tools: [], users: [], toolFilter: '', userFilter: '', userStatus: '', userRole: '',
  busyToolId: '', busyUserId: '', settings: structuredClone(SAFE_DEFAULTS), settingsVersion: 0,
  settingsUpdatedAt: '', settingsAudit: [], adminEvents: [], settingsBusy: false,
};

const $ = (selector) => document.querySelector(selector);
const els = {
  organizationId: $('#organizationId'), settingsVersion: $('#settingsVersion'), pageTitle: $('#pageTitle'), pageSubtitle: $('#pageSubtitle'),
  globalStatus: $('#globalStatus'), tabs: [...document.querySelectorAll('[data-tab]')], panels: [...document.querySelectorAll('[data-panel]')],
  metricUsers: $('#metricUsers'), metricUsersHint: $('#metricUsersHint'), metricAdmins: $('#metricAdmins'), metricGranted: $('#metricGranted'),
  metricToolsHint: $('#metricToolsHint'), metricIntelligence: $('#metricIntelligence'), metricIntelligenceHint: $('#metricIntelligenceHint'),
  usersTableBody: $('#usersTableBody'), usersEmpty: $('#usersEmpty'), userSearchInput: $('#userSearchInput'), userStatusFilter: $('#userStatusFilter'), userRoleFilter: $('#userRoleFilter'),
  newUserButton: $('#newUserButton'), userDialog: $('#userDialog'), userForm: $('#userForm'), userDialogTitle: $('#userDialogTitle'), editingUserId: $('#editingUserId'),
  userName: $('#userName'), userEmail: $('#userEmail'), userEmailHint: $('#userEmailHint'), userRole: $('#userRole'), sendInviteRow: $('#sendInviteRow'), sendInvite: $('#sendInvite'),
  saveUser: $('#saveUser'), closeUserDialog: $('#closeUserDialog'), cancelUserDialog: $('#cancelUserDialog'),
  toolsGrid: $('#toolsGrid'), searchInput: $('#searchInput'), settingsForm: $('#settingsForm'), saveSettings: $('#saveSettings'), reloadSettings: $('#reloadSettings'),
  intelligenceEnabled: $('#intelligenceEnabled'), ingestionEnabled: $('#ingestionEnabled'), agentMode: $('#agentMode'), requireHumanApproval: $('#requireHumanApproval'),
  allowSensitivePersonalData: $('#allowSensitivePersonalData'), defaultRetentionClass: $('#defaultRetentionClass'), mappingPurposeId: $('#mappingPurposeId'),
  auditLevel: $('#auditLevel'), savingValidationRequired: $('#savingValidationRequired'), auditCount: $('#auditCount'), auditList: $('#auditList'), reloadAudit: $('#reloadAudit'),
  confirmDialog: $('#confirmDialog'), confirmTitle: $('#confirmTitle'), confirmMessage: $('#confirmMessage'),
};

function setStatus(message = '', tone = '') {
  els.globalStatus.textContent = message;
  els.globalStatus.className = `status-message${tone ? ` ${tone}` : ''}`;
}

function formatDate(value) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(date);
}

function endpoint(suffix) {
  if (!state.organizationId) throw new Error('Organização ativa não identificada.');
  return `/api/admin/organizations/${encodeURIComponent(state.organizationId)}${suffix}`;
}

async function readPayload(response) {
  const contentType = response.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) return {};
  return response.json().catch(() => ({}));
}

async function api(path, options = {}) {
  const response = await fetch(path, { credentials: 'same-origin', headers: { accept: 'application/json', ...(options.headers || {}) }, ...options });
  const payload = await readPayload(response);
  if (!response.ok) {
    const error = new Error(payload.error || payload.message || `HTTP ${response.status}`);
    error.status = response.status; error.code = payload.code || ''; error.payload = payload;
    throw error;
  }
  return payload;
}

function writeOptions(method, body) {
  return { method, headers: { 'content-type': 'application/json', 'x-e3i-admin-request': '1' }, body: JSON.stringify(body ?? {}) };
}

function badge(text, kind = 'neutral') {
  const element = document.createElement('span'); element.className = `badge ${kind}`; element.textContent = text; return element;
}
function button(text, className, handler, disabled = false) {
  const element = document.createElement('button'); element.type = 'button'; element.className = `btn btn-small ${className}`; element.textContent = text; element.disabled = disabled; element.addEventListener('click', handler); return element;
}
function toolLabel(tool) { return tool.name || tool.title || tool.label || tool.id || 'Ferramenta'; }
function toolDescription(tool) { return tool.description || tool.summary || 'Ferramenta disponível no catálogo do Portal E3I.'; }
function userRoleLabel(role) { return role === 'E3I_ADMIN' ? 'Administrador' : 'Operador'; }

function updateMetrics() {
  const activeUsers = state.users.filter((user) => user.status === 'ACTIVE').length;
  const admins = state.users.filter((user) => user.status === 'ACTIVE' && user.role === 'E3I_ADMIN').length;
  const granted = state.tools.filter((tool) => Boolean(tool.granted)).length;
  els.metricUsers.textContent = String(activeUsers); els.metricUsersHint.textContent = `${state.users.length} cadastrados`;
  els.metricAdmins.textContent = String(admins); els.metricGranted.textContent = String(granted); els.metricToolsHint.textContent = `${state.tools.length} ferramentas`;
  els.metricIntelligence.textContent = state.settings.intelligence.enabled ? 'Ativo' : 'Desligado';
  els.metricIntelligenceHint.textContent = state.settings.intelligence.ingestionEnabled ? 'ingestão habilitada' : 'ingestão desligada';
  els.settingsVersion.textContent = `Configuração v${state.settingsVersion}`;
}

function switchTab(tabName) {
  if (!TAB_META[tabName]) return;
  els.tabs.forEach((tab) => { const active = tab.dataset.tab === tabName; tab.classList.toggle('is-active', active); tab.setAttribute('aria-selected', active ? 'true' : 'false'); });
  els.panels.forEach((panel) => { panel.hidden = panel.dataset.panel !== tabName; });
  [els.pageTitle.textContent, els.pageSubtitle.textContent] = TAB_META[tabName];
}

function confirmAction({ title, message, danger = false }) {
  if (!els.confirmDialog?.showModal) return Promise.resolve(window.confirm(message));
  els.confirmTitle.textContent = title; els.confirmMessage.textContent = message;
  const confirmButton = els.confirmDialog.querySelector('button[value="confirm"]');
  confirmButton.className = `btn ${danger ? 'btn-danger' : 'btn-primary'}`;
  els.confirmDialog.showModal();
  return new Promise((resolve) => els.confirmDialog.addEventListener('close', () => resolve(els.confirmDialog.returnValue === 'confirm'), { once: true }));
}

function renderUsers() {
  updateMetrics(); els.usersTableBody.replaceChildren();
  const query = state.userFilter.trim().toLocaleLowerCase('pt-BR');
  const visible = state.users.filter((user) => {
    if (state.userStatus && user.status !== state.userStatus) return false;
    if (state.userRole && user.role !== state.userRole) return false;
    return !query || [user.name, user.email].some((value) => String(value || '').toLocaleLowerCase('pt-BR').includes(query));
  });
  els.usersEmpty.hidden = visible.length !== 0;
  visible.forEach((user) => {
    const row = document.createElement('tr');
    const identityCell = document.createElement('td'); const identity = document.createElement('div'); identity.className = 'user-identity';
    const name = document.createElement('strong'); name.textContent = user.name || 'Sem nome'; const email = document.createElement('small'); email.textContent = user.email || '—'; identity.append(name, email); identityCell.append(identity);
    const roleCell = document.createElement('td'); roleCell.append(badge(userRoleLabel(user.role), user.role === 'E3I_ADMIN' ? 'admin' : 'neutral'));
    const statusCell = document.createElement('td'); statusCell.append(badge(user.status === 'ACTIVE' ? 'Ativo' : 'Suspenso', user.status === 'ACTIVE' ? 'active' : 'disabled'));
    const securityCell = document.createElement('td'); securityCell.append(badge(user.mustChangePassword ? 'Primeiro acesso pendente' : 'Senha definida', user.mustChangePassword ? 'pending' : 'active'));
    const sessionCell = document.createElement('td'); sessionCell.textContent = String(user.activeSessions ?? 0);
    const actionsCell = document.createElement('td'); actionsCell.className = 'actions-column'; const actions = document.createElement('div'); actions.className = 'row-actions';
    const busy = state.busyUserId === user.id;
    actions.append(button('Editar', 'btn-secondary', () => openUserDialog(user), busy));
    actions.append(button('Sessões', 'btn-secondary', () => revokeSessions(user), busy || user.isCurrentActor));
    actions.append(button('Redefinir', 'btn-secondary', () => requireFirstLogin(user), busy || user.isCurrentActor || user.status !== 'ACTIVE'));
    if (user.status === 'ACTIVE') actions.append(button('Suspender', 'btn-revoke', () => changeUserStatus(user, 'DISABLED'), busy || user.isCurrentActor));
    else actions.append(button('Reativar', 'btn-primary', () => changeUserStatus(user, 'ACTIVE'), busy));
    actionsCell.append(actions); row.append(identityCell, roleCell, statusCell, securityCell, sessionCell, actionsCell); els.usersTableBody.append(row);
  });
}

function openUserDialog(user = null) {
  const editing = Boolean(user);
  els.userDialogTitle.textContent = editing ? 'Editar usuário' : 'Novo usuário'; els.editingUserId.value = user?.id || '';
  els.userName.value = user?.name || ''; els.userEmail.value = user?.email || ''; els.userEmail.disabled = editing;
  els.userEmailHint.textContent = editing ? 'E-mail é a chave de identidade e não pode ser alterado aqui.' : 'O e-mail será usado como identidade de acesso.';
  els.userRole.value = user?.role === 'E3I_ADMIN' ? 'E3I_ADMIN' : 'OPERATOR'; els.sendInviteRow.hidden = editing; els.sendInvite.checked = true;
  els.saveUser.textContent = editing ? 'Salvar alterações' : 'Criar usuário'; els.userDialog.showModal(); setTimeout(() => els.userName.focus(), 0);
}
function closeUserDialog() { if (els.userDialog.open) els.userDialog.close(); }

async function saveUser(event) {
  event.preventDefault();
  const id = els.editingUserId.value; const name = els.userName.value.trim(); const email = els.userEmail.value.trim().toLowerCase(); const role = els.userRole.value;
  if (name.length < 2) return setStatus('Informe um nome válido para o usuário.', 'error');
  if (!id && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return setStatus('Informe um e-mail válido.', 'error');
  els.saveUser.disabled = true;
  try {
    let payload = {};
    if (id) payload = await api(endpoint(`/users/${encodeURIComponent(id)}`), writeOptions('PATCH', { name, role }));
    else payload = await api(endpoint('/users'), writeOptions('POST', { name, email, role, sendInvite: els.sendInvite.checked }));
    closeUserDialog(); await Promise.all([loadUsers(), loadAdminEvents()]);
    if (id) setStatus('Usuário atualizado com sucesso.', 'success');
    else if (payload.inviteDelivery === 'FAILED') setStatus('Usuário criado, mas o e-mail de primeiro acesso não pôde ser enviado. Use “Redefinir” para solicitar um novo código.', 'warning');
    else if (payload.inviteDelivery === 'NOT_REQUESTED') setStatus('Usuário criado. O primeiro acesso ainda precisa ser solicitado.', 'success');
    else setStatus('Usuário criado com primeiro acesso seguro.', 'success');
  } catch (error) { setStatus(error.message, 'error'); } finally { els.saveUser.disabled = false; }
}

async function changeUserStatus(user, status) {
  const disabling = status === 'DISABLED';
  if (!(await confirmAction({ title: disabling ? 'Suspender usuário?' : 'Reativar usuário?', message: disabling ? `O acesso de ${user.name} será suspenso e suas sessões serão revogadas.` : `O acesso de ${user.name} será reativado.`, danger: disabling }))) return;
  state.busyUserId = user.id; renderUsers();
  try { await api(endpoint(`/users/${encodeURIComponent(user.id)}/status`), writeOptions('POST', { status })); await Promise.all([loadUsers(), loadAdminEvents()]); setStatus(disabling ? 'Usuário suspenso.' : 'Usuário reativado.', 'success'); }
  catch (error) { setStatus(error.message, 'error'); } finally { state.busyUserId = ''; renderUsers(); }
}
async function revokeSessions(user) {
  if (!(await confirmAction({ title: 'Revogar sessões?', message: `Todas as sessões ativas de ${user.name} serão encerradas.`, danger: true }))) return;
  state.busyUserId = user.id; renderUsers();
  try { const payload = await api(endpoint(`/users/${encodeURIComponent(user.id)}/revoke-sessions`), writeOptions('POST', {})); await Promise.all([loadUsers(), loadAdminEvents()]); setStatus(`${payload.revokedSessions ?? 0} sessão(ões) revogada(s).`, 'success'); }
  catch (error) { setStatus(error.message, 'error'); } finally { state.busyUserId = ''; renderUsers(); }
}
async function requireFirstLogin(user) {
  if (!(await confirmAction({ title: 'Exigir nova definição de senha?', message: `${user.name} terá as sessões revogadas e precisará concluir novamente o fluxo seguro por código de e-mail.`, danger: true }))) return;
  state.busyUserId = user.id; renderUsers();
  try {
    const payload = await api(endpoint(`/users/${encodeURIComponent(user.id)}/require-first-login`), writeOptions('POST', { sendCode: true }));
    await Promise.all([loadUsers(), loadAdminEvents()]);
    if (payload.delivery === 'FAILED') setStatus('Novo primeiro acesso exigido, mas o código não pôde ser enviado. Tente novamente após verificar o serviço de e-mail.', 'warning');
    else setStatus('Novo primeiro acesso exigido. O envio do código foi solicitado.', 'success');
  } catch (error) { setStatus(error.message, 'error'); } finally { state.busyUserId = ''; renderUsers(); }
}

function renderTools() {
  updateMetrics(); els.toolsGrid.replaceChildren(); const query = state.toolFilter.trim().toLocaleLowerCase('pt-BR');
  const visible = state.tools.filter((tool) => !query || [toolLabel(tool), tool.id, toolDescription(tool)].filter(Boolean).some((value) => String(value).toLocaleLowerCase('pt-BR').includes(query)));
  if (!visible.length) { const empty = document.createElement('div'); empty.className = 'empty-state'; empty.textContent = state.tools.length ? 'Nenhuma ferramenta corresponde à busca.' : 'Nenhuma ferramenta disponível.'; els.toolsGrid.append(empty); return; }
  visible.forEach((tool) => {
    const card = document.createElement('article'); card.className = `tool-card${tool.granted ? ' is-granted' : ''}`;
    const content = document.createElement('div'); const head = document.createElement('div'); head.className = 'tool-head'; const identity = document.createElement('div');
    const title = document.createElement('h3'); title.className = 'tool-name'; title.textContent = toolLabel(tool); const id = document.createElement('code'); id.className = 'tool-id'; id.textContent = tool.id || 'sem-identificador'; identity.append(title, id); head.append(identity, badge(tool.granted ? 'Liberado' : 'Bloqueado', tool.granted ? 'granted' : 'blocked'));
    const description = document.createElement('p'); description.className = 'tool-description'; description.textContent = toolDescription(tool); content.append(head, description);
    const footer = document.createElement('div'); footer.className = 'tool-footer'; const copy = document.createElement('span'); copy.textContent = tool.granted ? 'Organização autorizada a abrir a ferramenta.' : 'Ferramenta não concedida à organização.';
    const action = document.createElement('button'); action.type = 'button'; action.className = `btn ${tool.granted ? 'btn-revoke' : 'btn-primary'}`; action.textContent = state.busyToolId === tool.id ? 'Salvando…' : (tool.granted ? 'Revogar acesso' : 'Liberar acesso'); action.disabled = Boolean(state.busyToolId); action.addEventListener('click', () => handleAccessChange(tool)); footer.append(copy, action); card.append(content, footer); els.toolsGrid.append(card);
  });
}
async function handleAccessChange(tool) {
  if (!state.organizationId || !tool.id || state.busyToolId) return;
  if (tool.granted && !(await confirmAction({ title: 'Revogar acesso?', message: `A organização deixará de ter acesso a “${toolLabel(tool)}”.`, danger: true }))) return;
  state.busyToolId = tool.id; renderTools();
  try { await api(endpoint(`/client-tools/${encodeURIComponent(tool.id)}`), { method: tool.granted ? 'DELETE' : 'PUT' }); tool.granted = !tool.granted; setStatus(tool.granted ? 'Acesso liberado.' : 'Acesso revogado.', 'success'); }
  catch (error) { setStatus(error.message, 'error'); } finally { state.busyToolId = ''; renderTools(); }
}

function normalizeSettings(candidate = {}) {
  const intelligence = candidate.intelligence || {}, governance = candidate.governance || {};
  return { intelligence: { enabled: intelligence.enabled === true, ingestionEnabled: intelligence.ingestionEnabled === true, agentMode: intelligence.agentMode === 'READ_ONLY' ? 'READ_ONLY' : 'DISABLED', requireHumanApproval: intelligence.requireHumanApproval !== false, allowSensitivePersonalData: intelligence.allowSensitivePersonalData === true, defaultRetentionClass: String(intelligence.defaultRetentionClass || SAFE_DEFAULTS.intelligence.defaultRetentionClass), mappingPurposeId: String(intelligence.mappingPurposeId || SAFE_DEFAULTS.intelligence.mappingPurposeId) }, governance: { auditLevel: governance.auditLevel === 'STANDARD' ? 'STANDARD' : 'ENHANCED', savingValidationRequired: governance.savingValidationRequired !== false } };
}
function renderSettings() {
  const { intelligence, governance } = state.settings; els.intelligenceEnabled.checked = intelligence.enabled; els.ingestionEnabled.checked = intelligence.ingestionEnabled; els.agentMode.value = intelligence.agentMode; els.requireHumanApproval.checked = intelligence.requireHumanApproval; els.allowSensitivePersonalData.checked = intelligence.allowSensitivePersonalData; els.defaultRetentionClass.value = intelligence.defaultRetentionClass; els.mappingPurposeId.value = intelligence.mappingPurposeId; els.auditLevel.value = governance.auditLevel; els.savingValidationRequired.checked = governance.savingValidationRequired; els.saveSettings.disabled = state.settingsBusy; els.reloadSettings.disabled = state.settingsBusy; updateMetrics();
}
function collectSettings() {
  const purpose = els.mappingPurposeId.value.trim(); if (!purpose || purpose.length > 120 || /[@]|\d{3}\.\d{3}\.\d{3}/.test(purpose)) throw new Error('Use um identificador de finalidade válido, sem dado pessoal.');
  return { intelligence: { enabled: els.intelligenceEnabled.checked, ingestionEnabled: els.ingestionEnabled.checked, agentMode: els.agentMode.value, requireHumanApproval: els.requireHumanApproval.checked, allowSensitivePersonalData: els.allowSensitivePersonalData.checked, defaultRetentionClass: els.defaultRetentionClass.value, mappingPurposeId: purpose }, governance: { auditLevel: els.auditLevel.value, savingValidationRequired: els.savingValidationRequired.checked } };
}
async function saveSettings() {
  let settings; try { settings = collectSettings(); } catch (error) { return setStatus(error.message, 'error'); }
  if (settings.intelligence.allowSensitivePersonalData && !(await confirmAction({ title: 'Permitir dados sensíveis?', message: 'Esta alteração amplia a categoria de dados autorizada. Confirme apenas se houver finalidade, base legal e controles aprovados.', danger: true }))) return;
  state.settingsBusy = true; renderSettings();
  try { const payload = await api(endpoint('/central-settings'), writeOptions('PUT', { expectedVersion: state.settingsVersion, settings })); applySettingsPayload(payload); renderAudit(); setStatus('Parâmetros salvos.', 'success'); }
  catch (error) { if (error.status === 409) await loadSettings(); setStatus(error.status === 409 ? 'Configuração alterada por outra sessão. Dados recarregados; revise antes de salvar.' : error.message, 'error'); }
  finally { state.settingsBusy = false; renderSettings(); }
}
function applySettingsPayload(payload) { state.settings = normalizeSettings(payload.settings); state.settingsVersion = Number.isInteger(payload.version) ? payload.version : 0; state.settingsUpdatedAt = payload.updatedAt || ''; state.settingsAudit = Array.isArray(payload.audit) ? payload.audit : []; renderSettings(); }

function renderAudit() {
  els.auditList.replaceChildren();
  const settingsEvents = state.settingsAudit.map((event) => ({ type: 'settings', action: 'Parâmetros atualizados', detail: Array.isArray(event.changedKeys) ? event.changedKeys.join(', ') : 'configuração governada', actorId: event.actorId, occurredAt: event.occurredAt }));
  const records = [...state.adminEvents, ...settingsEvents].sort((a, b) => String(b.occurredAt || '').localeCompare(String(a.occurredAt || ''))).slice(0, 100);
  els.auditCount.textContent = `${records.length} ${records.length === 1 ? 'registro' : 'registros'}`;
  if (!records.length) { const empty = document.createElement('div'); empty.className = 'empty-state'; empty.textContent = 'Ainda não há eventos administrativos para esta organização.'; els.auditList.append(empty); return; }
  records.forEach((record) => { const item = document.createElement('article'); item.className = 'audit-item'; const text = document.createElement('div'); const title = document.createElement('strong'); title.textContent = record.label || record.action || 'Evento administrativo'; const detail = document.createElement('small'); detail.textContent = `${record.detail || 'metadados administrativos'} · ator ${record.actorId || 'não identificado'}`; text.append(title, detail); const time = document.createElement('time'); time.dateTime = record.occurredAt || ''; time.textContent = formatDate(record.occurredAt); item.append(text, time); els.auditList.append(item); });
}

async function loadTools() { const payload = await api('/api/client-tools'); state.organizationId = payload.organizationId || ''; state.tools = Array.isArray(payload.tools) ? payload.tools : []; els.organizationId.textContent = state.organizationId || 'Não identificada'; if (!state.organizationId) throw new Error('O Portal não informou a organização ativa.'); renderTools(); }
async function loadUsers() { const payload = await api(endpoint('/users')); state.users = Array.isArray(payload.users) ? payload.users : []; renderUsers(); }
async function loadSettings() { state.settingsBusy = true; renderSettings(); try { applySettingsPayload(await api(endpoint('/central-settings'))); } finally { state.settingsBusy = false; renderSettings(); } }
async function loadAdminEvents() { const payload = await api(endpoint('/admin-events')); state.adminEvents = Array.isArray(payload.events) ? payload.events : []; renderAudit(); }

async function boot() {
  setStatus('Carregando console administrativo…');
  try { await loadTools(); await Promise.all([loadUsers(), loadSettings(), loadAdminEvents()]); setStatus(''); }
  catch (error) { if (error.status === 401) setStatus('Sua sessão expirou. Entre novamente no Portal E3I.', 'error'); else if (error.status === 403) setStatus('Esta área é exclusiva para administradores E3I.', 'error'); else setStatus(`Não foi possível carregar o console: ${error.message}`, 'error'); }
}

els.tabs.forEach((tab) => tab.addEventListener('click', () => switchTab(tab.dataset.tab)));
document.querySelectorAll('[data-open-tab]').forEach((buttonEl) => buttonEl.addEventListener('click', () => switchTab(buttonEl.dataset.openTab)));
els.userSearchInput.addEventListener('input', (event) => { state.userFilter = event.target.value || ''; renderUsers(); });
els.userStatusFilter.addEventListener('change', (event) => { state.userStatus = event.target.value || ''; renderUsers(); });
els.userRoleFilter.addEventListener('change', (event) => { state.userRole = event.target.value || ''; renderUsers(); });
els.searchInput.addEventListener('input', (event) => { state.toolFilter = event.target.value || ''; renderTools(); });
els.newUserButton.addEventListener('click', () => openUserDialog()); els.userForm.addEventListener('submit', saveUser); els.closeUserDialog.addEventListener('click', closeUserDialog); els.cancelUserDialog.addEventListener('click', closeUserDialog);
els.saveSettings.addEventListener('click', saveSettings); els.reloadSettings.addEventListener('click', async () => { try { await loadSettings(); renderAudit(); setStatus('Parâmetros recarregados.', 'success'); } catch (error) { setStatus(error.message, 'error'); } });
els.reloadAudit.addEventListener('click', async () => { try { await Promise.all([loadSettings(), loadAdminEvents()]); setStatus('Auditoria atualizada.', 'success'); } catch (error) { setStatus(error.message, 'error'); } });

boot();
