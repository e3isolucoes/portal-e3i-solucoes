const state = {
  organizationId: '',
  tools: [],
  filter: '',
  busyToolId: '',
};

const els = {
  organizationId: document.querySelector('#organizationId'),
  metricTotal: document.querySelector('#metricTotal'),
  metricGranted: document.querySelector('#metricGranted'),
  metricBlocked: document.querySelector('#metricBlocked'),
  statusMessage: document.querySelector('#statusMessage'),
  toolsGrid: document.querySelector('#toolsGrid'),
  searchInput: document.querySelector('#searchInput'),
  confirmDialog: document.querySelector('#confirmDialog'),
  confirmMessage: document.querySelector('#confirmMessage'),
};

function setStatus(message = '', tone = '') {
  els.statusMessage.textContent = message;
  els.statusMessage.className = `status-message${tone ? ` ${tone}` : ''}`;
}

function toolLabel(tool) {
  return tool.name || tool.title || tool.label || tool.id || 'Ferramenta';
}

function toolDescription(tool) {
  return tool.description || tool.summary || 'Ferramenta disponível no catálogo do Portal E3I.';
}

function updateMetrics() {
  const total = state.tools.length;
  const granted = state.tools.filter((tool) => Boolean(tool.granted)).length;
  els.metricTotal.textContent = String(total);
  els.metricGranted.textContent = String(granted);
  els.metricBlocked.textContent = String(Math.max(0, total - granted));
}

function makeBadge(granted) {
  const badge = document.createElement('span');
  badge.className = `badge ${granted ? 'granted' : 'blocked'}`;
  badge.textContent = granted ? 'Acesso liberado' : 'Acesso bloqueado';
  return badge;
}

function makeButton(tool) {
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
    footer.append(accessCopy, makeButton(tool));

    card.append(content, footer);
    els.toolsGrid.append(card);
  });
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
    throw error;
  }
  return payload;
}

async function loadTools() {
  els.toolsGrid.setAttribute('aria-busy', 'true');
  setStatus('Carregando catálogo e concessões…');
  try {
    const payload = await api('/api/client-tools');
    state.organizationId = payload.organizationId || '';
    state.tools = Array.isArray(payload.tools) ? payload.tools : [];
    els.organizationId.textContent = state.organizationId || 'Não identificada';
    setStatus('');
    renderTools();
  } catch (error) {
    console.error('Falha ao carregar ferramentas', error);
    els.organizationId.textContent = 'Indisponível';
    state.tools = [];
    renderTools();
    if (error.status === 401) {
      setStatus('Sua sessão expirou. Volte ao Portal E3I, entre novamente e reabra esta tela.', 'error');
    } else {
      setStatus(`Não foi possível carregar os acessos: ${error.message}`, 'error');
    }
  } finally {
    els.toolsGrid.setAttribute('aria-busy', 'false');
  }
}

function confirmRevoke(tool) {
  if (!els.confirmDialog?.showModal) {
    return Promise.resolve(window.confirm(`Revogar o acesso a “${toolLabel(tool)}”?`));
  }
  els.confirmMessage.textContent = `A organização ativa deixará de ter acesso a “${toolLabel(tool)}”.`;
  els.confirmDialog.showModal();
  return new Promise((resolve) => {
    els.confirmDialog.addEventListener('close', () => resolve(els.confirmDialog.returnValue === 'confirm'), { once: true });
  });
}

async function handleAccessChange(tool) {
  if (!state.organizationId || !tool.id || state.busyToolId) return;
  if (tool.granted && !(await confirmRevoke(tool))) return;

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
    console.error('Falha ao alterar acesso', error);
    if (error.status === 403) {
      setStatus('Somente a administração E3I pode alterar os acessos às ferramentas.', 'error');
    } else {
      setStatus(`Não foi possível alterar o acesso: ${error.message}`, 'error');
    }
  } finally {
    state.busyToolId = '';
    renderTools();
  }
}

els.searchInput.addEventListener('input', (event) => {
  state.filter = event.target.value || '';
  renderTools();
});

loadTools();
