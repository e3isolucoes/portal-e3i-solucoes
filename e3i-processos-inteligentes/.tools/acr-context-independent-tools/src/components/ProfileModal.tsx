import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Modal, Field, Input, Button, useToast } from './ui';
import { User, Mail, ShieldCheck, KeyRound, UserCog, CheckCircle2, AlertCircle } from 'lucide-react';
import { getErrorMessage } from '../utils';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ProfileModal: React.FC<ProfileModalProps> = ({ isOpen, onClose }) => {
  const { user, updateUser, token } = useAuth();
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<'profile' | 'password'>('profile');
  
  // Profile state
  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [avatarUrl, setAvatarUrl] = useState(user?.avatarUrl || user?.avatar || '');
  
  // Password state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen || !user) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    setLoading(true);

    try {
      const res = await fetch('/api/users/profile', {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ userId: user.id, name, email, avatarUrl }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(getErrorMessage(data, 'Erro ao atualizar perfil.'));
      }
      setSuccessMsg('Perfil atualizado e persistido com sucesso!');
      showToast('Perfil atualizado com sucesso!', 'success');
      updateUser({ name, email, avatarUrl });
      setTimeout(() => {
        onClose();
      }, 1000);
    } catch (err: any) {
      setErrorMsg(err.message || 'Erro ao salvar alterações.');
      showToast(err.message || 'Erro ao salvar alterações.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (newPassword !== confirmPassword) {
      setErrorMsg('A nova senha e a confirmação não coincidem.');
      showToast('A nova senha e a confirmação não coincidem.', 'error');
      return;
    }

    if (newPassword.length < 8) {
      setErrorMsg('A nova senha deve ter pelo menos 8 caracteres.');
      showToast('A nova senha deve ter pelo menos 8 caracteres.', 'error');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/users/password', {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(getErrorMessage(data, 'Erro ao alterar senha.'));
      }
      setSuccessMsg('Senha alterada com sucesso! Suas credenciais foram atualizadas.');
      showToast('Senha alterada com sucesso!', 'success');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (err: any) {
      setErrorMsg(err.message || 'Erro ao alterar senha.');
      showToast(err.message || 'Erro ao alterar senha.', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Configurações de Conta"
      description="Gerencie seu perfil e segurança corporativa"
      maxWidth="md"
    >
      <div className="space-y-6">
        
        {/* Header Avatar / Info */}
        <div className="flex items-center space-x-3 pb-4 border-b border-border-subtle">
          {avatarUrl ? (
            <img src={avatarUrl} alt="Avatar" className="w-12 h-12 rounded-xl object-cover border border-gold" />
          ) : (
            <div className="w-12 h-12 rounded-xl bg-accent/20 border border-accent/40 flex items-center justify-center text-accent font-bold">
              {name ? name.substring(0, 2).toUpperCase() : 'E3'}
            </div>
          )}
          <div>
            <h4 className="text-sm font-bold text-text-primary">{name || user.name}</h4>
            <p className="text-xs text-text-secondary">{email || user.email} • <span className="text-gold font-semibold">{user.role}</span></p>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex rounded-xl bg-surface-raised p-1 border border-border-subtle">
          <button
            type="button"
            onClick={() => { setActiveTab('profile'); setErrorMsg(''); setSuccessMsg(''); }}
            className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center space-x-2 ${
              activeTab === 'profile'
                ? 'bg-accent text-white shadow-md'
                : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            <UserCog className="w-3.5 h-3.5" />
            <span>Meu Perfil</span>
          </button>
          <button
            type="button"
            onClick={() => { setActiveTab('password'); setErrorMsg(''); setSuccessMsg(''); }}
            className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center space-x-2 ${
              activeTab === 'password'
                ? 'bg-accent text-white shadow-md'
                : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            <KeyRound className="w-3.5 h-3.5" />
            <span>Segurança & Senha</span>
          </button>
        </div>

        {errorMsg && (
          <div className="p-3 rounded-xl bg-danger/10 border border-danger/30 flex items-center space-x-2 text-xs text-danger">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="p-3 rounded-xl bg-success/10 border border-success/30 flex items-center space-x-2 text-xs text-success">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {activeTab === 'profile' ? (
          <form onSubmit={handleUpdateProfile} className="space-y-4">
            <Field label="Foto / Imagem do Usuário">
              <div className="space-y-2">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="w-full text-xs text-text-secondary file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-accent file:text-white hover:file:brightness-110 file:cursor-pointer bg-canvas border border-border-subtle rounded-xl"
                />
                <Input
                  type="text"
                  value={avatarUrl}
                  onChange={(e) => setAvatarUrl(e.target.value)}
                  placeholder="Ou informe a URL da imagem (https://...)"
                />
              </div>
            </Field>

            <Field label="Nome Completo">
              <Input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </Field>

            <Field label="E-mail Corporativo">
              <Input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </Field>

            <div className="pt-2">
              <Button variant="gold" size="md" className="w-full justify-center" loading={loading}>
                Salvar Alterações do Perfil
              </Button>
            </div>
          </form>
        ) : (
          <form onSubmit={handleChangePassword} className="space-y-4">
            <Field label="Senha Atual">
              <Input
                type="password"
                required
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="••••••••"
              />
            </Field>

            <Field label="Nova Senha">
              <Input
                type="password"
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Mínimo 4 caracteres"
              />
            </Field>

            <Field label="Confirmar Nova Senha">
              <Input
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Repita a nova senha"
              />
            </Field>

            <div className="pt-2">
              <Button variant="gold" size="md" className="w-full justify-center" loading={loading}>
                Atualizar Senha com Segurança
              </Button>
            </div>
          </form>
        )}

      </div>
    </Modal>
  );
};
