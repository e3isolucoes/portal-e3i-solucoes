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
  governance: Object.freeze({
    auditLevel: 'ENHANCED',
    savingValidationRequired: true,
  }),
});

const state = {
  organizationId: '',
  tools: [],
  filter: '',
  busyToolId: '',
  settings: structuredClone(SAFE_DEFAULTS),
  settingsVersion: 0,
  settingsUpdatedAt: '',
  audit: [],
  settingsBusy: false,
};

const els = {
  organizationId: document.querySelector('#organizationId'),
  settingsVersion: document.querySelector('#settingsVersion'),
  metricTotal: document.querySelector('#metricTotal'),
  metricGranted: document.querySelector('#metricGranted'),
  metricIntelligence: document.querySelector('#metricIntelligence'),
  metricIntelligenceHint: document.querySelector('#metricIntelligenceHint'),
  metricUpdated: document.querySelector('#metricUpdated'),
  globalStatus: document.querySelector('#globalStatus'),
  toolsGrid: document.querySelector('#toolsGrid'),
  searchInput: document.querySelector('#searchInput'),
  tabs: [...document.querySelectorAll('[data-tab]')],
  panels: [...document.querySelectorAll('[data-panel]')],
  settingsForm: document.querySelector('#settingsForm'),
  saveSettings: document.querySelector('#saveSettings'),
  reloadSettings: document.querySelector('#reloadSettings'),
  intelligenceEnabled: document.querySelector('#intelligenceEnabled'),
  ingestionEnabled: document.querySelector('#ingestionEnabled'),
  agentMode: document.querySelector('#agentMode'),
  requireHumanApproval: document.querySelector('#requireHumanApproval'),
  allowSensitivePersonalData: document.querySelector('#allowSensitivePersonalData'),
  defaultRetentionClass: document.querySelector('#defaultRetentionClass'),
  mappingPurposeId: document.querySelector('#mappingPurposeId'),
  auditLevel: document.querySelector('#auditLevel'),
  savingValidationRequired: document.querySelector('#savingValidationRequired'),
  auditCount: document.querySelector('#auditCount'),
  auditList: document.querySelector('#auditList'),
  confirmDialog: document.querySelector('#confirmDialog'),
  confirmTitle: document.querySelector('#confirmTitle'),
  confirmMessage: document.querySelector('#confirmMessage'),
};

function setStatus(message = '', tone = '') {
  els.globalStatus.textContent = message;
  els.globalStatus.className = `status-message${tone ? ` ${tone}` : ''}`;
}

function formatDate(value) {
  if (!value) return 'Nunca';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Indisponível';
  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(date);
}

function toolLabel(tool) {
  return tool.name || tool.title || tool.label || tool.id || 'Ferramenta';
}

function toolDescription(tool) {
  return tool.description || tool.summary || 'Ferramenta disponível no catálogo do Portal E3I.';
}

function settingsEndpoint() {
  if (!state.organizationId) throw new Error('Organização ativa não identificada');
  return `/api/admin/organizations/${encodeURIComponent(state.organizationId)}/central-settings`;
}

async function readPayload(response) {
  const contentType = response.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) return {};
  return response.json().catch(() => ({}));
}

async function api(path, options = {}) {
  const response = await fetch(path, {
    credentials: 'same-origin',
    headers: { accept: 'application/json', ...(options.headers || {}) },
    ...options,
  });
  const payload = await readPayload(response);
  if (!response.ok) {
    const error = new Error(payload.error || payload.message || `HTTP ${response.status}`);
    error.status = response.status;
    error.code = payload.code || '';
    error.payload = payload;
    throw error;
  }
  return payload;
}

function updateMetrics() {
  const total = state.tools.length;
  const granted = state.tools.filter((tool) => Boolean(tool.granted)).length;
  els.metricTotal.textContent = String(total);
  els.metricGranted.textContent = String(granted);
  els.metricIntelligence.textContent = state.settings.intelligence.enabled ? 'Ativo' : 'Desligado';
  els.metricIntelligenceHint.textContent = state.settings.intelligence.ingestionEnabled
    ? 'ingestão habilitada'
    : 'ingestão desligada';
  els.metricUpdated.textContent = state.settingsUpdatedAt ? formatDate(state.settingsUpdatedAt) : 'Nunca';
  els.settingsVersion.textContent = `Configuração v${state.settingsVersion}`;
}

function makeBadge(granted) {
  const badge = document.createElement('span');
  badge.className = `badge ${granted ? 'granted' : 'blocked'}`;
  badge.textContent = granted ? 'Acesso liberado' : 'Acesso bloqueado';
  return badge;
}

function makeAccessButton(tool) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = `btn ${tool.granted ? 'btn-revoke' : 'btn-primary'}`;
  button.textContent = state.busyToolId === tool.id
    ? 'Salvando…'
    : (tool.granted ? 'Revogar acesso' : 'Liberar acesso');
  button.disabled = Boolean(state.busyToolId);
  button.addEventListener('click', () => handleAccessChange(tool));
  return button;
}

function renderTools() {
  updateMetrics();
  els.toolsGrid.replaceChildren();
  els.toolsGrid.setAttribute('aria-busy', state.busyToolId ? 'true' : 'false');

  const query = state.filter.trim().toLocaleLowerCase('pt-BR');
  const visible = state.tools.filter((tool) => {
    if (!query) return true;
    return [toolLabel(tool), tool.id, toolDescription(tool)]
      .filter(Boolean)
      .some((value) => String(value).toLocaleLowerCase('pt-BR').includes(query));
  });

  if (!visible.length) {
    const empty = document.createElement('div');
    empty.className = 'empty-state';
    empty.textContent = state.tools.length
      ? 'Nenhuma ferramenta corresponde à busca.'
      : 'Nenhuma ferramenta está disponível para este contexto.';
    els.toolsGrid.append(empty);
    return;
  }

  visible.forEach((tool) => {
    const card = document.createElement('article');
    card.className = `tool-card${tool.granted ? ' is-granted' : ''}`;

    const content = document.createElement('div');
    const head = document.createElement('div');
    head.className = 'tool-head';

    const identity = document.createElement('div');
    const title = document.createElement('h3');
    title.className = 'tool-name';
    title.textContent = toolLabel(tool);
    const id = document.createElement('code');
    id.className = 'tool-id';
    id.textContent = tool.id || 'sem-identificador';
    identity.append(title, id);
    head.append(identity, makeBadge(Boolean(tool.granted)));

    const description = document.createElement('p');
    description.className = 'tool-description';
    description.textContent = toolDescription(tool);
    content.append(head, description);

    const footer = document.createElement('div');
    footer.className = 'tool-footer';
    const accessCopy = document.createElement('span');
    accessCopy.textContent = tool.granted
      ? 'Usuários desta organização podem abrir a ferramenta.'
      : 'A ferramenta não aparece para usuários sem concessão.';
    footer.append(accessCopy, makeAccessButton(tool));

    card.append(content, footer);
    els.toolsGrid.append(card);
  });
}

function normalizeSettings(payload) {
  const candidate = payload && typeof payload === 'object' ? payload : {};
  const intelligence = candidate.intelligence && typeof candidate.intelligence === 'object'
    ? candidate.intelligence
    : {};
  const governance = candidate.governance && typeof candidate.governance === 'object'
    ? candidate.governance
    : {};

  return {
    intelligence: {
      enabled: intelligence.enabled === true,
      ingestionEnabled: intelligence.ingestionEnabled === true,
      agentMode: intelligence.agentMode === 'READ_ONLY' ? 'READ_ONLY' : 'DISABLED',
      requireHumanApproval: intelligence.requireHumanApproval !== false,
      allowSensitivePersonalData: intelligence.allowSensitivePersonalData === true,
      defaultRetentionClass: String(intelligence.defaultRetentionClass || SAFE_DEFAULTS.intelligence.defaultRetentionClass),
      mappingPurposeId: String(intelligence.mappingPurposeId || SAFE_DEFAULTS.intelligence.mappingPurposeId),
    },
    governance: {
      auditLevel: governance.auditLevel === 'STANDARD' ? 'STANDARD' : 'ENHANCED',
      savingValidationRequired: governance.savingValidationRequired !== false,
    },
  };
}

function renderSettings() {
  const { intelligence, governance } = state.settings;
  els.intelligenceEnabled.checked = intelligence.enabled;
  els.ingestionEnabled.checked = intelligence.ingestionEnabled;
  els.agentMode.value = intelligence.agentMode;
  els.requireHumanApproval.checked = intelligence.requireHumanApproval;
  els.allowSensitivePersonalData.checked = intelligence.allowSensitivePersonalData;
  els.defaultRetentionClass.value = intelligence.defaultRetentionClass;
  els.mappingPurposeId.value = intelligence.mappingPurposeId;
  els.auditLevel.value = governance.auditLevel;
  els.savingValidationRequired.checked = governance.savingValidationRequired;
  els.saveSettings.disabled = state.settingsBusy;
  els.reloadSettings.disabled = state.settingsBusy;
  updateMetrics();
}

function collectSettings() {
  const mappingPurposeId = els.mappingPurposeId.value.trim();
  if (!mappingPurposeId) throw new Error('Informe a finalidade padrão de mapeamento.');
  if (mappingPurposeId.length > 120) throw new Error('A finalidade padrão excede 120 caracteres.');
  if (/[@]|\d{3}\.\d{3}\.\d{3}/.test(mappingPurposeId)) {
    throw new Error('Use apenas um identificador de finalidade, sem e-mail ou CPF.');
  }

  return {
    intelligence: {
      enabled: els.intelligenceEnabled.checked,
      ingestionEnabled: els.ingestionEnabled.checked,
      agentMode: els.agentMode.value,
      requireHumanApproval: els.requireHumanApproval.checked,
      allowSensitivePersonalData: els.allowSensitivePersonalData.checked,
      defaultRetentionClass: els.defaultRetentionClass.value,
      mappingPurposeId,
    },
    governance: {
      auditLevel: els.auditLevel.value,
      savingValidationRequired: els.savingValidationRequired.checked,
    },
  };
}

function renderAudit() {
  els.auditList.replaceChildren();
  const records = Array.isArray(state.audit) ? state.audit : [];
  els.auditCount.textContent = `${records.length} ${records.length === 1 ? 'registro' : 'registros'}`;

  if (!records.length) {
    const empty = document.createElement('div');
    empty.className = 'empty-state';
    empty.textContent = 'Ainda não há alterações de parametrização registradas para esta organização.';
    els.auditList.append(empty);
    return;
  }

  records.slice().reverse().forEach((record) => {
    const item = document.createElement('article');
    item.className = 'audit-item';
    const text = document.createElement('div');
    const title = document.createElement('strong');
    title.textContent = `Configuração atualizada para v${record.version ?? '—'}`;
    const detail = document.createElement('small');
    const keys = Array.isArray(record.changedKeys) ? record.changedKeys.join(', ') : 'parâmetros governados';
    detail.textContent = `${keys} · ator ${record.actorId || 'não identificado'}`;
    text.append(title, detail);
    const time = document.createElement('time');
    time.dateTime = record.occurredAt || '';
    time.textContent = formatDate(record.occurredAt);
    item.append(text, time);
    els.auditList.append(item);
  });
}

function switchTab(tabName) {
  els.tabs.forEach((tab) => {
    const active = tab.dataset.tab === tabName;
    tab.classList.toggle('is-active', active);
    tab.setAttribute('aria-selected', active ? 'true' : 'false');
  });
  els.panels.forEach((panel) => {
    panel.hidden = panel.dataset.panel !== tabName;
  });
}

function confirmAction({ title, message, danger = false }) {
  if (!els.confirmDialog?.showModal) return Promise.resolve(window.confirm(message));
  els.confirmTitle.textContent = title;
  els.confirmMessage.textContent = message;
  const confirmButton = els.confirmDialog.querySelector('button[value="confirm"]');
  confirmButton.className = `btn ${danger ? 'btn-danger' : 'btn-primary'}`;
  els.confirmDialog.showModal();
  return new Promise((resolve) => {
    els.confirmDialog.addEventListener('close', () => resolve(els.confirmDialog.returnValue === 'confirm'), { once: true });
  });
}

async function handleAccessChange(tool) {
  if (!state.organizationId || !tool.id || state.busyToolId) return;
  if (tool.granted) {
    const confirmed = await confirmAction({
      title: 'Revogar acesso?',
      message: `A organização ativa deixará de ter acesso a “${toolLabel(tool)}”.`,
      danger: true,
    });
    if (!confirmed) return;
  }

  state.busyToolId = tool.id;
  setStatus(tool.granted ? 'Revogando acesso…' : 'Liberando acesso…');
  renderTools();

  const path = `/api/admin/organizations/${encodeURIComponent(state.organizationId)}/client-tools/${encodeURIComponent(tool.id)}`;
  try {
    await api(path, { method: tool.granted ? 'DELETE' : 'PUT' });
    tool.granted = !tool.granted;
    setStatus(
      tool.granted
        ? `Acesso a “${toolLabel(tool)}” liberado com sucesso.`
        : `Acesso a “${toolLabel(tool)}” revogado com sucesso.`,
      'success',
    );
  } catch (error) {
    if (error.status === 403) {
      setStatus('Somente a administração E3I pode alterar os acessos.', 'error');
    } else if (error.status === 401) {
      setStatus('Sua sessão expirou. Entre novamente no Portal E3I.', 'error');
    } else {
      setStatus(`Não foi possível alterar o acesso: ${error.message}`, 'error');
    }
  } finally {
    state.busyToolId = '';
    renderTools();
  }
}

async function loadTools() {
  els.toolsGrid.setAttribute('aria-busy', 'true');
  const payload = await api('/api/client-tools');
  state.organizationId = payload.organizationId || '';
  state.tools = Array.isArray(payload.tools) ? payload.tools : [];
  els.organizationId.textContent = state.organizationId || 'Não identificada';
  renderTools();
  els.toolsGrid.setAttribute('aria-busy', 'false');
  if (!state.organizationId) throw new Error('O Portal não informou a organização ativa.');
}

async function loadSettings({ announce = false } = {}) {
  if (!state.organizationId) return;
  state.settingsBusy = true;
  renderSettings();
  if (announce) setStatus('Recarregando parâmetros…');
  try {
    const payload = await api(settingsEndpoint());
    state.settings = normalizeSettings(payload.settings);
    state.settingsVersion = Number.isInteger(payload.version) ? payload.version : 0;
    state.settingsUpdatedAt = payload.updatedAt || '';
    state.audit = Array.isArray(payload.audit) ? payload.audit : [];
    renderSettings();
    renderAudit();
    if (announce) setStatus('Parâmetros recarregados.', 'success');
  } catch (error) {
    if (error.status === 403) {
      setStatus('Esta tela de parametrização é exclusiva para administradores E3I.', 'error');
    } else if (error.status === 401) {
      setStatus('Sua sessão expirou. Entre novamente no Portal E3I.', 'error');
    } else {
      setStatus(`Não foi possível carregar os parâmetros: ${error.message}`, 'error');
    }
    throw error;
  } finally {
    state.settingsBusy = false;
    renderSettings();
  }
}

async function saveSettings() {
  if (state.settingsBusy || !state.organizationId) return;
  let next;
  try {
    next = collectSettings();
  } catch (error) {
    setStatus(error.message, 'error');
    return;
  }

  if (next.intelligence.allowSensitivePersonalData && !state.settings.intelligence.allowSensitivePersonalData) {
    const confirmed = await confirmAction({
      title: 'Permitir dados sensíveis?',
      message: 'Esta alteração amplia a classificação de dados admitida. Confirme somente se existe governança, finalidade e base legal aprovadas.',
      danger: true,
    });
    if (!confirmed) {
      renderSettings();
      return;
    }
  }

  state.settingsBusy = true;
  renderSettings();
  setStatus('Salvando parâmetros com controle de versão…');
  try {
    const payload = await api(settingsEndpoint(), {
      method: 'PUT',
      headers: {
        'content-type': 'application/json',
        'x-e3i-admin-request': '1',
      },
      body: JSON.stringify({ expectedVersion: state.settingsVersion, settings: next }),
    });
    state.settings = normalizeSettings(payload.settings);
    state.settingsVersion = Number.isInteger(payload.version) ? payload.version : state.settingsVersion + 1;
    state.settingsUpdatedAt = payload.updatedAt || new Date().toISOString();
    state.audit = Array.isArray(payload.audit) ? payload.audit : state.audit;
    renderAudit();
    setStatus('Parâmetros salvos com sucesso. As ferramentas atuais permanecem inalteradas.', 'success');
  } catch (error) {
    if (error.status === 409) {
      setStatus('A configuração foi alterada em outra sessão. Recarregue antes de salvar novamente.', 'warning');
    } else if (error.status === 403) {
      setStatus('A alteração foi bloqueada pela política de administração do Portal.', 'error');
    } else {
      setStatus(`Não foi possível salvar os parâmetros: ${error.message}`, 'error');
    }
  } finally {
    state.settingsBusy = false;
    renderSettings();
  }
}

async function bootstrap() {
  setStatus('Carregando administração central…');
  try {
    await loadTools();
    await loadSettings();
    setStatus('');
  } catch (error) {
    if (error.status === 401) {
      setStatus('Sua sessão expirou. Volte ao Portal E3I e entre novamente.', 'error');
    } else if (!els.globalStatus.textContent) {
      setStatus(`Não foi possível iniciar a administração central: ${error.message}`, 'error');
    }
  }
}

els.tabs.forEach((tab) => tab.addEventListener('click', () => switchTab(tab.dataset.tab)));
els.searchInput.addEventListener('input', (event) => {
  state.filter = event.target.value || '';
  renderTools();
});
els.saveSettings.addEventListener('click', saveSettings);
els.reloadSettings.addEventListener('click', () => loadSettings({ announce: true }).catch(() => {}));

bootstrap();
