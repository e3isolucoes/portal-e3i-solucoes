import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Modal, Field, Input, Button, useToast } from './ui';
import { Lock, Mail, User, Building, ShieldCheck, CheckCircle2, AlertCircle } from 'lucide-react';
import { getErrorMessage } from '../utils';

export const AuthModal: React.FC = () => {
  const { authModalOpen, setAuthModalOpen, authMode, setAuthMode, login, register } = useAuth();
  const { showToast } = useToast();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [document, setDocument] = useState('');
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
        await register(name, email, companyName, document, password);
        showToast('Empresa e usuário criados com sucesso!', 'success');
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
      ? 'Cadastrar Nova Empresa'
      : 'Recuperar Acesso';

  const description =
    authMode === 'login'
      ? 'Entre com suas credenciais corporativas E3I'
      : authMode === 'register'
      ? 'Inicie sua jornada na E³I Processos Inteligentes'
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

          {authMode !== 'forgot' && (
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

          <div className="pt-2">
            <Button
              variant="gold"
              size="lg"
              className="w-full justify-center"
              loading={loading}
            >
              {authMode === 'login' && 'Entrar na Plataforma'}
              {authMode === 'register' && 'Criar Organização & Conta'}
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
                  Criar Nova Empresa
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
