import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Modal, Field, Input, Button, useToast } from './ui';
import { Lock, Mail, User, Building, ShieldCheck, CheckCircle2, AlertCircle, Briefcase, Phone } from 'lucide-react';
import { getErrorMessage } from '../utils';

export const AuthModal: React.FC = () => {
  const { authModalOpen, setAuthModalOpen, authMode, setAuthMode, login } = useAuth();
  const { showToast } = useToast();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [document, setDocument] = useState('');
  const [phone, setPhone] = useState('');
  const [jobTitle, setJobTitle] = useState('');
  const [reason, setReason] = useState('');
  const [requestedToolIds, setRequestedToolIds] = useState<string[]>([]);
  const [privacyAccepted, setPrivacyAccepted] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [resetLink, setResetLink] = useState('');
  const [loading, setLoading] = useState(false);

  const [resetTokenInput, setResetTokenInput] = useState('');
  const [newResetPassword, setNewResetPassword] = useState('');
  const [resetSuccessMsg, setResetSuccessMsg] = useState('');

  // Refs for controlled component focus management
  const nameInputRef = useRef<HTMLInputElement>(null);
  const companyInputRef = useRef<HTMLInputElement>(null);
  const documentInputRef = useRef<HTMLInputElement>(null);
  const emailInputRef = useRef<HTMLInputElement>(null);
  const passwordInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (authModalOpen) {
      const timer = setTimeout(() => {
        const active = typeof window !== 'undefined' ? window.document.activeElement : null;
        if (active && ['INPUT', 'TEXTAREA', 'SELECT'].includes(active.tagName)) {
          return;
        }
        if (authMode === 'register') {
          nameInputRef.current?.focus();
        } else {
          emailInputRef.current?.focus();
        }
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [authModalOpen, authMode]);

  useEffect(() => {
    const token = new URLSearchParams(window.location.search).get('resetToken');
    if (token) {
      setResetTokenInput(token);
      setAuthMode('forgot');
      setAuthModalOpen(true);
    }
  }, [setAuthModalOpen, setAuthMode]);

  if (!authModalOpen) return null;

  const handleResetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setResetSuccessMsg('');
    setLoading(true);

    try {
      const tokenMatch = resetLink.match(/token=([^&]+)/);
      const tokenToUse = resetTokenInput || (tokenMatch ? tokenMatch[1] : '');
      if (!tokenToUse) {
        throw new Error('Informe ou gere o token de redefinição.');
      }

      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: tokenToUse, newPassword: newResetPassword }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(getErrorMessage(data, 'Erro ao redefinir senha.'));
      }
      setResetSuccessMsg(data.message);
      showToast('Senha redefinida com sucesso!', 'success');
      setTimeout(() => {
        setAuthMode('login');
        setResetLink('');
        setSuccessMsg('');
        window.history.replaceState({}, '', window.location.pathname);
      }, 2000);
    } catch (err: any) {
      setError(err.message || 'Erro ao redefinir senha.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');
    setResetLink('');
    setLoading(true);

    try {
      if (authMode === 'login') {
        await login(email, password);
        showToast('Login realizado com sucesso!', 'success');
      } else if (authMode === 'register') {
        if (!privacyAccepted) throw new Error('Confirme a autorização para análise dos dados informados.');
        const res = await fetch('/api/access-requests', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, corporateEmail: email, phone, jobTitle, companyName, document, reason, requestedToolIds, privacyAccepted })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(getErrorMessage(data, 'Não foi possível registrar a solicitação.'));
        setSuccessMsg(data.message);
        showToast('Solicitação enviada para análise.', 'success');
        setName('');
        setCompanyName('');
        setDocument('');
        setEmail('');
        setPhone('');
        setJobTitle('');
        setReason('');
        setRequestedToolIds([]);
        setPrivacyAccepted(false);
      } else if (authMode === 'forgot') {
        const res = await fetch('/api/auth/forgot-password', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email }),
        });
        const data = await res.json();
        if (res.ok) {
          setSuccessMsg(data.message);
          showToast(data.deliveryAvailable ? 'Solicitação enviada com segurança.' : 'Solicitação registrada.', 'info');
        } else {
          throw new Error(getErrorMessage(data, 'Erro ao solicitar recuperação de senha.'));
        }
      }
    } catch (err: any) {
      setError(err.message || 'Ocorreu um erro ao processar a solicitação.');
      showToast(err.message || 'Erro na operação.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const title =
    authMode === 'login'
      ? 'Acessar Plataforma'
      : authMode === 'register'
      ? 'Solicitar acesso'
      : 'Recuperar Acesso';

  const description =
    authMode === 'login'
      ? 'Entre com suas credenciais corporativas E3I'
      : authMode === 'register'
      ? 'Informe os dados para validação e concessão pela equipe E3I'
      : 'Enviaremos instruções seguras para redefinição';

  return (
    <Modal
      isOpen={authModalOpen}
      onClose={() => setAuthModalOpen(false)}
      title={title}
      description={description}
      maxWidth="md"
    >
      <div className="space-y-6">
        
        {/* Error alert */}
        {error && (
          <div className="p-3 rounded-xl bg-danger/10 border border-danger/30 flex items-center space-x-2 text-xs text-danger">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Success / Forgot message */}
        {successMsg && !resetTokenInput && (
          <div className="p-4 rounded-xl bg-success/10 border border-success/30 space-y-3 text-xs text-success">
            <div className="flex items-center space-x-2">
              <CheckCircle2 className="w-5 h-5 shrink-0 text-success" />
              <span>{successMsg}</span>
            </div>
            {resetLink && (
              <div className="p-3 rounded-xl bg-canvas border border-success/40 space-y-3">
                <div>
                  <div className="font-bold text-gold mb-1">Link Gerado (Simulador de E-mail):</div>
                  <div className="text-[11px] text-text-primary break-all bg-surface-raised p-2 rounded border border-border-subtle">{resetLink}</div>
                  <Button
                    variant="primary"
                    size="sm"
                    className="mt-2"
                    onClick={() => {
                      navigator.clipboard.writeText(resetLink);
                      showToast('Link copiado para a área de transferência!', 'success');
                    }}
                  >
                    Copiar Link de Recuperação
                  </Button>
                </div>

                <div className="border-t border-border-subtle pt-3">
                  <div className="font-bold text-text-primary mb-2">Testar Redefinição de Senha Instantânea:</div>
                  <form onSubmit={handleResetSubmit} className="space-y-3">
                    <Field label="Nova Senha">
                      <Input
                        type="password"
                        required
                        placeholder="Mínimo 4 caracteres"
                        value={newResetPassword}
                        onChange={(e) => setNewResetPassword(e.target.value)}
                      />
                    </Field>
                    <Button variant="gold" size="md" className="w-full justify-center" loading={loading}>
                      Confirmar Nova Senha
                    </Button>
                  </form>
                  {resetSuccessMsg && (
                    <div className="mt-2 p-2 rounded bg-success/20 text-success text-[11px] font-semibold text-center">
                      {resetSuccessMsg}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Form */}
        {resetTokenInput ? <form onSubmit={handleResetSubmit} className="space-y-4">
          <Field label="Nova senha" required><div className="relative"><Lock className="absolute left-3.5 top-3 w-4 h-4 text-gold" /><Input type="password" minLength={8} required value={newResetPassword} onChange={e => setNewResetPassword(e.target.value)} placeholder="Mínimo de 8 caracteres" className="pl-10" /></div></Field>
          <Button variant="gold" size="lg" className="w-full justify-center" loading={loading}>Redefinir senha</Button>
          {resetSuccessMsg && <div className="p-3 rounded-xl bg-success/10 border border-success/30 text-xs text-success">{resetSuccessMsg}</div>}
        </form> : <form onSubmit={handleSubmit} className="space-y-4">
          
          {authMode === 'register' && (
            <>
              <Field label="Seu Nome Completo" required>
                <div className="relative">
                  <User className="absolute left-3.5 top-3 w-4 h-4 text-gold" />
                  <Input
                    ref={nameInputRef}
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Ex: Carlos Eduardo"
                    className="pl-10"
                  />
                </div>
              </Field>

              <Field label="Nome da Empresa (Razão Social)" required>
                <div className="relative">
                  <Building className="absolute left-3.5 top-3 w-4 h-4 text-gold" />
                  <Input
                    ref={companyInputRef}
                    type="text"
                    required
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    placeholder="Ex: E³I Soluções S/A"
                    className="pl-10"
                  />
                </div>
              </Field>

              <Field label="CNPJ" required>
                <div className="relative">
                  <ShieldCheck className="absolute left-3.5 top-3 w-4 h-4 text-gold" />
                  <Input
                    ref={documentInputRef}
                    type="text"
                    required
                    value={document}
                    onChange={(e) => setDocument(e.target.value)}
                    placeholder="00.000.000/0001-00"
                    className="pl-10"
                  />
                </div>
              </Field>

              <Field label="Cargo ou Função" required>
                <div className="relative"><Briefcase className="absolute left-3.5 top-3 w-4 h-4 text-gold" /><Input type="text" required value={jobTitle} onChange={e => setJobTitle(e.target.value)} placeholder="Ex: Gerente de Controladoria" className="pl-10" /></div>
              </Field>

              <Field label="Telefone Corporativo" required>
                <div className="relative"><Phone className="absolute left-3.5 top-3 w-4 h-4 text-gold" /><Input type="tel" required value={phone} onChange={e => setPhone(e.target.value)} placeholder="(16) 99999-9999" className="pl-10" /></div>
              </Field>
            </>
          )}

          <Field label="E-mail Corporativo" required>
            <div className="relative">
              <Mail className="absolute left-3.5 top-3 w-4 h-4 text-gold" />
              <Input
                ref={emailInputRef}
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="voce@suaempresa.com.br"
                className="pl-10"
              />
            </div>
          </Field>

          {authMode === 'login' && (
            <Field label="Senha" required>
              <div className="relative">
                <Lock className="absolute left-3.5 top-3 w-4 h-4 text-gold" />
                <Input
                  ref={passwordInputRef}
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="pl-10"
                />
              </div>
            </Field>
          )}

          {authMode === 'register' && (
            <>
              <fieldset className="rounded border border-border-subtle bg-surface-raised p-4">
                <legend className="px-1 text-xs font-bold uppercase tracking-wider text-text-secondary">Ferramentas solicitadas</legend>
                <div className="mt-2 space-y-3">
                  {[
                    ['processos-inteligentes', 'E3I Processos Inteligentes'],
                    ['gestao-compras', 'Gestão de Compras'],
                    ['painel-obrigacoes', 'Painel de Obrigações']
                  ].map(([id, label]) => <label key={id} className="flex min-h-11 cursor-pointer items-center gap-3 text-sm"><input type="checkbox" checked={requestedToolIds.includes(id)} onChange={e => setRequestedToolIds(current => e.target.checked ? [...current, id] : current.filter(item => item !== id))} className="h-4 w-4 accent-[#17395C]" /><span>{label}</span></label>)}
                </div>
              </fieldset>
              <Field label="Motivo da solicitação">
                <textarea value={reason} onChange={e => setReason(e.target.value)} maxLength={1000} rows={3} placeholder="Descreva brevemente a necessidade da empresa." className="w-full rounded-sm border border-border-subtle bg-surface px-3 py-2.5 text-sm text-text-primary outline-none focus:border-accent" />
              </Field>
              <label className="flex items-start gap-3 text-xs leading-5 text-text-secondary"><input type="checkbox" checked={privacyAccepted} onChange={e => setPrivacyAccepted(e.target.checked)} className="mt-1 h-4 w-4 accent-[#17395C]" required /><span>Autorizo a E3I a utilizar estes dados exclusivamente para validar esta solicitação de acesso, conforme a Política de Privacidade.</span></label>
            </>
          )}

          <div className="pt-2">
            <Button
              variant="gold"
              size="lg"
              className="w-full justify-center"
              loading={loading}
            >
              {authMode === 'login' && 'Entrar na Plataforma'}
              {authMode === 'register' && 'Enviar solicitação para análise'}
              {authMode === 'forgot' && 'Enviar Instruções de Recuperação'}
            </Button>
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-border-subtle text-xs text-text-secondary">
            {authMode === 'login' && (
              <>
                <button
                  type="button"
                  onClick={() => setAuthMode('forgot')}
                  className="hover:text-gold transition-colors"
                >
                  Esqueceu sua senha?
                </button>
                <button
                  type="button"
                  onClick={() => setAuthMode('register')}
                  className="hover:text-gold font-semibold transition-colors"
                >
                  Solicitar acesso
                </button>
              </>
            )}

            {authMode === 'register' && (
              <button
                type="button"
                onClick={() => setAuthMode('login')}
                className="w-full text-center hover:text-gold transition-colors"
              >
                Já possui uma conta? <span className="font-semibold underline">Faça login</span>
              </button>
            )}

            {authMode === 'forgot' && (
              <button
                type="button"
                onClick={() => setAuthMode('login')}
                className="w-full text-center hover:text-gold transition-colors"
              >
                Voltar para o Login
              </button>
            )}
          </div>

        </form>}
      </div>
    </Modal>
  );
};
