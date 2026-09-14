(() => {
  const nativeFetch = window.fetch.bind(window);
  let currentEmail = '';
  let modal = null;

  function ensureModal() {
    if (modal) return modal;
    const wrapper = document.createElement('div');
    wrapper.id = 'e3i-first-login-modal';
    wrapper.className = 'e3i-first-login-backdrop';
    wrapper.hidden = true;
    wrapper.innerHTML = `
      <section class="e3i-first-login-card" role="dialog" aria-modal="true" aria-labelledby="e3i-first-login-title">
        <div class="e3i-first-login-brand">E3I SOLUÇÕES</div>
        <h2 id="e3i-first-login-title">Defina uma nova senha</h2>
        <p class="e3i-first-login-intro">Por segurança, contas migradas precisam criar uma nova senha no primeiro acesso. Um código foi enviado para <strong data-e3i-first-login-email></strong>.</p>
        <form data-e3i-first-login-form>
          <label>
            Código recebido por e-mail
            <input data-e3i-code type="text" inputmode="numeric" autocomplete="one-time-code" maxlength="6" pattern="[0-9]{6}" required>
          </label>
          <label>
            Nova senha
            <input data-e3i-password type="password" autocomplete="new-password" minlength="12" maxlength="128" required>
          </label>
          <label>
            Confirme a nova senha
            <input data-e3i-confirm type="password" autocomplete="new-password" minlength="12" maxlength="128" required>
          </label>
          <div class="e3i-password-policy" aria-live="polite">
            Use 12 ou mais caracteres, com maiúscula, minúscula, número e símbolo. Não use o nome do e-mail.
          </div>
          <div class="e3i-first-login-error" data-e3i-error role="alert"></div>
          <div class="e3i-first-login-actions">
            <button type="button" class="e3i-link-button" data-e3i-resend>Reenviar código</button>
            <button type="submit" class="e3i-primary-button">Salvar nova senha</button>
          </div>
        </form>
      </section>`;
    document.body.appendChild(wrapper);
    modal = wrapper;

    const form = wrapper.querySelector('[data-e3i-first-login-form]');
    const resend = wrapper.querySelector('[data-e3i-resend]');
    const errorBox = wrapper.querySelector('[data-e3i-error]');

    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      errorBox.textContent = '';
      const code = wrapper.querySelector('[data-e3i-code]').value.trim();
      const newPassword = wrapper.querySelector('[data-e3i-password]').value;
      const confirmPassword = wrapper.querySelector('[data-e3i-confirm]').value;
      if (newPassword !== confirmPassword) {
        errorBox.textContent = 'As duas senhas precisam ser iguais.';
        return;
      }

      const submit = form.querySelector('button[type="submit"]');
      submit.disabled = true;
      try {
        const response = await nativeFetch('/api/auth/first-login/complete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: currentEmail, code, newPassword }),
        });
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) {
          errorBox.textContent = payload.error || 'Não foi possível alterar a senha.';
          return;
        }
        wrapper.hidden = true;
        window.alert('Senha atualizada com sucesso. Entre novamente usando a nova senha.');
        const passwordInput = document.querySelector('input[type="password"]');
        if (passwordInput) {
          passwordInput.value = '';
          passwordInput.focus();
        }
      } catch {
        errorBox.textContent = 'Falha de comunicação. Tente novamente.';
      } finally {
        submit.disabled = false;
      }
    });

    resend.addEventListener('click', async () => {
      errorBox.textContent = '';
      resend.disabled = true;
      try {
        await nativeFetch('/api/auth/first-login/resend', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: currentEmail }),
        });
        errorBox.textContent = 'Se permitido pelo limite de segurança, um novo código foi enviado.';
      } catch {
        errorBox.textContent = 'Não foi possível solicitar outro código agora.';
      } finally {
        setTimeout(() => { resend.disabled = false; }, 3000);
      }
    });

    return wrapper;
  }

  function openFirstLogin(email) {
    currentEmail = String(email || '').trim().toLowerCase();
    const wrapper = ensureModal();
    wrapper.querySelector('[data-e3i-first-login-email]').textContent = currentEmail;
    wrapper.querySelector('[data-e3i-code]').value = '';
    wrapper.querySelector('[data-e3i-password]').value = '';
    wrapper.querySelector('[data-e3i-confirm]').value = '';
    wrapper.querySelector('[data-e3i-error]').textContent = '';
    wrapper.hidden = false;
    setTimeout(() => wrapper.querySelector('[data-e3i-code]').focus(), 0);
  }

  window.fetch = async (...args) => {
    const response = await nativeFetch(...args);
    try {
      const request = args[0];
      const url = typeof request === 'string' ? request : request?.url || '';
      if (url.includes('/api/auth/login') && response.status === 428) {
        const payload = await response.clone().json();
        if (payload?.code === 'PASSWORD_CHANGE_REQUIRED' && payload?.email) {
          queueMicrotask(() => openFirstLogin(payload.email));
        }
      }
    } catch {
      // A autenticação principal continua recebendo a resposta original.
    }
    return response;
  };
})();
