import React, { useState } from 'react';
import { KeyRound, ShieldCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { getAuthHeaders, getErrorMessage } from '../utils';

export const RequiredPasswordChange: React.FC = () => {
  const { user, updateUser } = useAuth();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (!user?.mustChangePassword) return null;

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    if (newPassword.length < 8) return setError('A nova senha deve ter pelo menos 8 caracteres.');
    if (newPassword !== confirmation) return setError('A confirmação não corresponde à nova senha.');
    if (currentPassword === newPassword) return setError('Escolha uma senha diferente da senha temporária.');

    setLoading(true);
    try {
      const response = await fetch('/api/users/password', {
        method: 'PUT',
        headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
        credentials: 'include',
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(getErrorMessage(data, 'Não foi possível alterar a senha.'));
      updateUser({ mustChangePassword: false });
    } catch (err: any) {
      setError(err.message || 'Não foi possível alterar a senha.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] grid place-items-center bg-[#0E1A29]/95 px-4">
      <section className="w-full max-w-lg rounded-sm border border-[#CFD6C6] bg-[#FBFBF8] p-7 text-[#0E1A29] shadow-2xl md:p-9">
        <div className="mb-6 flex items-start gap-4">
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-sm bg-[#E6EAE0] text-[#17395C]"><ShieldCheck className="h-6 w-6" /></span>
          <div>
            <p className="font-mono text-xs font-semibold uppercase tracking-[0.18em] text-[#8F6A11]">Primeiro acesso</p>
            <h1 className="mt-1 font-display text-3xl font-semibold">Defina sua senha definitiva</h1>
            <p className="mt-2 text-sm leading-6 text-[#5C6672]">Por segurança, a senha temporária precisa ser substituída antes de liberar o painel administrativo.</p>
          </div>
        </div>
        <form onSubmit={submit} className="space-y-4">
          <label className="block text-sm font-semibold">Senha temporária<input autoFocus required type="password" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} className="mt-2 w-full rounded-sm border border-[#CFD6C6] bg-white px-4 py-3 outline-none focus:border-[#17395C]" /></label>
          <label className="block text-sm font-semibold">Nova senha<input required minLength={8} type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} className="mt-2 w-full rounded-sm border border-[#CFD6C6] bg-white px-4 py-3 outline-none focus:border-[#17395C]" /></label>
          <label className="block text-sm font-semibold">Confirmar nova senha<input required minLength={8} type="password" value={confirmation} onChange={e => setConfirmation(e.target.value)} className="mt-2 w-full rounded-sm border border-[#CFD6C6] bg-white px-4 py-3 outline-none focus:border-[#17395C]" /></label>
          {error && <p role="alert" className="rounded-sm border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
          <button disabled={loading} className="flex w-full items-center justify-center gap-2 rounded-sm bg-[#17395C] px-5 py-3 font-semibold text-white disabled:opacity-60"><KeyRound className="h-4 w-4" />{loading ? 'Atualizando…' : 'Alterar senha e acessar'}</button>
        </form>
      </section>
    </div>
  );
};
