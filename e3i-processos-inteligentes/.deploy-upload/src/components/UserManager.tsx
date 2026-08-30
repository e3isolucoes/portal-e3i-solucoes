import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { PageHeader, Card, Button, Input, Field, Modal, DataTable, Badge, Skeleton, ErrorState, EmptyState, useToast } from './ui';
import { User, ShieldCheck, Mail, Plus, UserCheck, UserX, AlertCircle, CheckCircle2, Search, Users as UsersIcon, Building } from 'lucide-react';
import { User as UserType } from '../types';

export const UserManager: React.FC = () => {
  const { user, tenant, updateUser, token } = useAuth();
  const { showToast } = useToast();
  const isAdmin = user?.role === 'ADMIN';
  const isManager = user?.role === 'MANAGER';
  const canManage = isAdmin || isManager;

  const [users, setUsers] = useState<UserType[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorState, setErrorState] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');
  
  // Modal state for create user
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newRole, setNewRole] = useState<'E3I_ADMIN' | 'ADMIN' | 'MANAGER' | 'OPERATOR' | 'AUDITOR'>('OPERATOR');
  
  // Modal state for edit user
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserType | null>(null);
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editRole, setEditRole] = useState<'E3I_ADMIN' | 'ADMIN' | 'MANAGER' | 'OPERATOR' | 'AUDITOR'>('OPERATOR');
  const [editStatus, setEditStatus] = useState<'ACTIVE' | 'INACTIVE' | 'PENDING'>('ACTIVE');
  const [editAvatarUrl, setEditAvatarUrl] = useState('');

  // Modal state for invite user
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [inviteName, setInviteName] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'E3I_ADMIN' | 'ADMIN' | 'MANAGER' | 'OPERATOR' | 'AUDITOR'>('OPERATOR');
  const [inviteLink, setInviteLink] = useState('');

  const [submitting, setSubmitting] = useState(false);

  const fetchUsers = async () => {
    setLoading(true);
    setErrorState(false);
    try {
      const res = await fetch('/api/users', {
        headers: {
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        }
      });
      const data = await res.json();
      if (Array.isArray(data)) {
        const filtered = isAdmin
          ? data
          : data.filter((u: UserType) => u.tenantId === user?.tenantId);
        setUsers(filtered);
      } else {
        throw new Error('Formato inválido de dados');
      }
    } catch (err) {
      console.error('Erro ao buscar usuários:', err);
      setErrorState(true);
      showToast('Erro ao carregar usuários.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [token]);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !newEmail.trim()) {
      showToast('Por favor, preencha o nome e o e-mail do usuário.', 'error');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          name: newName,
          email: newEmail,
          role: newRole,
          tenantId: tenant?.id || 'tenant-1',
          status: 'ACTIVE',
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Erro ao criar usuário');
      }

      showToast(`Usuário ${newName} cadastrado com sucesso!`, 'success');
      setNewName('');
      setNewEmail('');
      setNewRole('OPERATOR');
      setIsModalOpen(false);
      fetchUsers();
    } catch (err: any) {
      showToast(err.message || 'Erro ao cadastrar usuário.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenEdit = (u: UserType) => {
    setEditingUser(u);
    setEditName(u.name || '');
    setEditEmail(u.email || '');
    setEditRole(u.role || 'OPERATOR');
    setEditStatus(u.status || 'ACTIVE');
    setEditAvatarUrl(u.avatarUrl || u.avatar || '');
    setIsEditModalOpen(true);
  };

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    setSubmitting(true);

    try {
      const res = await fetch(`/api/users/${editingUser.id}`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          name: editName,
          email: editEmail,
          role: editRole,
          status: editStatus,
          avatarUrl: editAvatarUrl,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Erro ao atualizar usuário');
      }
      showToast(`Perfil de acesso de ${editName} atualizado com sucesso!`, 'success');
      if (user && user.id === editingUser.id) {
        updateUser({ name: editName, email: editEmail, role: editRole, status: editStatus, avatarUrl: editAvatarUrl });
      }
      setIsEditModalOpen(false);
      fetchUsers();
    } catch (err: any) {
      showToast(err.message || 'Erro ao atualizar usuário.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleStatus = async (u: UserType) => {
    const nextStatus = u.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    try {
      const res = await fetch(`/api/users/${u.id}/status`, {
        method: 'PATCH',
        headers: { 
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ status: nextStatus }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Erro ao alterar status do usuário');
      }
      showToast(`Acesso do usuário ${u.name} foi ${nextStatus === 'ACTIVE' ? 'reativado' : 'revogado'}.`, 'success');
      fetchUsers();
    } catch (err: any) {
      showToast(err.message || 'Erro ao alterar status.', 'error');
    }
  };

  const handleSendInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteName.trim() || !inviteEmail.trim()) {
      showToast('Preencha o nome e e-mail para o convite.', 'error');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/users/invite', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          name: inviteName,
          email: inviteEmail,
          role: inviteRole,
          tenantId: tenant?.id || 'tenant-1'
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Erro ao gerar convite');
      }
      setInviteLink(data.inviteLink);
      showToast('Convite corporativo gerado!', 'success');
      fetchUsers();
    } catch (err: any) {
      showToast(err.message || 'Erro ao gerar convite.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setEditAvatarUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const filteredUsers = users.filter(u => {
    const matchesSearch = (u.name || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
                          (u.email || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = roleFilter === 'ALL' || u.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  return (
    <div className="min-h-[calc(100vh-80px)] py-8 px-4 sm:px-6 lg:px-8 space-y-8 max-w-7xl mx-auto">
      
      {/* Header */}
      <PageHeader
        eyebrow={{ icon: <UsersIcon className="w-3.5 h-3.5" />, text: 'Controle de Equipe • RBAC' }}
        title="Gerenciamento de Usuários e Permissões"
        description="Controle rigoroso de colaboradores, papéis e acessos por tenant."
        actions={
          canManage ? (
            <div className="flex items-center space-x-3">
              <Button
                variant="secondary"
                size="md"
                icon={<Mail className="w-4 h-4 text-gold" />}
                onClick={() => {
                  setInviteName('');
                  setInviteEmail('');
                  setInviteLink('');
                  setIsInviteModalOpen(true);
                }}
              >
                Convidar por E-mail
              </Button>
              <Button
                variant="gold"
                size="md"
                icon={<Plus className="w-4 h-4" />}
                onClick={() => setIsModalOpen(true)}
              >
                Cadastrar Colaborador
              </Button>
            </div>
          ) : undefined
        }
      />

      {/* Filters & Search */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card elevation="flat" className="p-3 md:col-span-2 flex items-center space-x-3">
          <Search className="w-5 h-5 text-text-muted shrink-0" />
          <Input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por nome ou e-mail..."
            className="border-0 bg-transparent shadow-none"
          />
        </Card>

        <Card elevation="flat" className="p-3 flex items-center space-x-3">
          <ShieldCheck className="w-5 h-5 text-gold shrink-0" />
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="w-full bg-transparent text-xs text-text-primary focus:outline-none"
          >
            <option value="ALL">Todos os Papéis</option>
            <option value="ADMIN">Administrador</option>
            <option value="MANAGER">Gestor</option>
            <option value="OPERATOR">Operador</option>
            <option value="AUDITOR">Auditor</option>
          </select>
        </Card>
      </div>

      {/* State handling: Loading, Error, Empty, Success */}
      {loading ? (
        <div className="space-y-4">
          <Skeleton variant="table-row" />
          <Skeleton variant="table-row" />
          <Skeleton variant="table-row" />
        </div>
      ) : errorState ? (
        <ErrorState
          message="Não foi possível carregar a lista de usuários da organização."
          onRetry={fetchUsers}
        />
      ) : filteredUsers.length === 0 ? (
        <EmptyState
          icon={<UsersIcon className="w-8 h-8 text-text-secondary" />}
          title="Nenhum colaborador encontrado"
          description="Tente ajustar sua busca ou cadastre um novo colaborador na organização."
          actionText={canManage ? 'Cadastrar Colaborador' : undefined}
          onAction={canManage ? () => setIsModalOpen(true) : undefined}
        />
      ) : (
        <DataTable
          keyExtractor={(u: UserType) => u.id}
          columns={[
            {
              header: 'Colaborador',
              key: 'name',
              render: (u: UserType) => (
                <div className="flex items-center space-x-3">
                  {u.avatarUrl || u.avatar ? (
                    <img src={u.avatarUrl || u.avatar} alt="Avatar" className="w-9 h-9 rounded-xl object-cover border border-gold" />
                  ) : (
                    <div className="w-9 h-9 rounded-xl bg-accent/20 border border-accent/40 flex items-center justify-center text-accent font-bold text-xs">
                      {(u.name || 'U').substring(0, 2).toUpperCase()}
                    </div>
                  )}
                  <div>
                    <div className="text-xs font-bold text-text-primary">{u.name}</div>
                    <div className="text-[11px] text-text-secondary">{u.email}</div>
                  </div>
                </div>
              ),
            },
            {
              header: 'Papel Corporativo',
              key: 'role',
              render: (u: UserType) => (
                <Badge variant={u.role === 'ADMIN' ? 'gold' : u.role === 'MANAGER' ? 'info' : 'neutral'}>
                  {u.role}
                </Badge>
              ),
            },
            {
              header: 'Status',
              key: 'status',
              render: (u: UserType) => (
                u.status === 'ACTIVE' ? (
                  <Badge variant="success">Ativo</Badge>
                ) : u.status === 'PENDING' ? (
                  <Badge variant="gold">Pendente</Badge>
                ) : (
                  <Badge variant="danger">Inativo</Badge>
                )
              ),
            },
            {
              header: 'Tenant ID',
              key: 'tenantId',
              render: (u: UserType) => (
                <span className="font-mono text-xs text-text-muted">{u.tenantId || 'tenant-1'}</span>
              ),
            },
            {
              header: 'Ações',
              key: 'actions',
              render: (u: UserType) => (
                canManage ? (
                  <div className="flex items-center justify-end space-x-2">
                    <Button variant="secondary" size="sm" onClick={() => handleOpenEdit(u)}>
                      Editar
                    </Button>
                    <Button 
                      variant={u.status === 'ACTIVE' ? 'danger' : 'primary'} 
                      size="sm" 
                      onClick={() => handleToggleStatus(u)}
                    >
                      {u.status === 'ACTIVE' ? 'Revogar' : 'Ativar'}
                    </Button>
                  </div>
                ) : null
              ),
            },
          ]}
          data={filteredUsers}
        />
      )}

      {/* Create User Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Cadastrar Novo Colaborador"
        description="Adicione um novo usuário à organização atual"
        maxWidth="md"
      >
        <form onSubmit={handleCreateUser} className="space-y-4">
          <Field label="Nome Completo" required>
            <Input
              type="text"
              required
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Ex: Ana Souza"
            />
          </Field>

          <Field label="E-mail Corporativo" required>
            <Input
              type="email"
              required
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              placeholder="ana.souza@empresa.com.br"
            />
          </Field>

          <Field label="Papel / Permissão RBAC">
            <select
              value={newRole}
              onChange={(e) => setNewRole(e.target.value as any)}
              className="w-full px-3 py-2 rounded-xl bg-canvas border border-border-subtle text-xs text-text-primary focus:outline-none focus:border-gold"
            >
              <option value="OPERATOR">Operador (Acesso Padrão)</option>
              <option value="MANAGER">Gestor (Gerenciamento de Equipe)</option>
              <option value="AUDITOR">Auditor (Leitura e Trilha de Auditoria)</option>
              <option value="ADMIN">Administrador (Acesso Total)</option>
            </select>
          </Field>

          <div className="pt-2">
            <Button variant="gold" size="lg" className="w-full justify-center" loading={submitting}>
              Cadastrar Colaborador
            </Button>
          </div>
        </form>
      </Modal>

      {/* Edit User Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title="Editar Colaborador & Permissões"
        description="Atualize dados cadastrais e o papel RBAC"
        maxWidth="md"
      >
        <form onSubmit={handleUpdateUser} className="space-y-4">
          <Field label="Foto / Avatar">
            <div className="space-y-2">
              <input
                type="file"
                accept="image/*"
                onChange={handleEditFileChange}
                className="w-full text-xs text-text-secondary file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-accent file:text-white hover:file:brightness-110 file:cursor-pointer bg-canvas border border-border-subtle rounded-xl"
              />
              <Input
                type="text"
                value={editAvatarUrl}
                onChange={(e) => setEditAvatarUrl(e.target.value)}
                placeholder="Ou informe a URL da imagem"
              />
            </div>
          </Field>

          <Field label="Nome Completo">
            <Input
              type="text"
              required
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
            />
          </Field>

          <Field label="E-mail Corporativo">
            <Input
              type="email"
              required
              value={editEmail}
              onChange={(e) => setEditEmail(e.target.value)}
            />
          </Field>

          <Field label="Papel RBAC">
            <select
              value={editRole}
              onChange={(e) => setEditRole(e.target.value as any)}
              className="w-full px-3 py-2 rounded-xl bg-canvas border border-border-subtle text-xs text-text-primary focus:outline-none focus:border-gold"
            >
              <option value="OPERATOR">Operador</option>
              <option value="MANAGER">Gestor</option>
              <option value="AUDITOR">Auditor</option>
              <option value="ADMIN">Administrador</option>
            </select>
          </Field>

          <Field label="Status de Acesso">
            <select
              value={editStatus}
              onChange={(e) => setEditStatus(e.target.value as any)}
              className="w-full px-3 py-2 rounded-xl bg-canvas border border-border-subtle text-xs text-text-primary focus:outline-none focus:border-gold"
            >
              <option value="ACTIVE">Ativo</option>
              <option value="INACTIVE">Inativo / Revogado</option>
              <option value="PENDING">Pendente</option>
            </select>
          </Field>

          <div className="pt-2">
            <Button variant="gold" size="lg" className="w-full justify-center" loading={submitting}>
              Salvar Alterações
            </Button>
          </div>
        </form>
      </Modal>

      {/* Invite Modal */}
      <Modal
        isOpen={isInviteModalOpen}
        onClose={() => setIsInviteModalOpen(false)}
        title="Convidar Colaborador por E-mail"
        description="Gere um link seguro de convite corporativo"
        maxWidth="md"
      >
        <form onSubmit={handleSendInvite} className="space-y-4">
          <Field label="Nome do Convidado" required>
            <Input
              type="text"
              required
              value={inviteName}
              onChange={(e) => setInviteName(e.target.value)}
              placeholder="Ex: Roberto Carlos"
            />
          </Field>

          <Field label="E-mail do Convidado" required>
            <Input
              type="email"
              required
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              placeholder="roberto@empresa.com.br"
            />
          </Field>

          <Field label="Papel Atribuído">
            <select
              value={inviteRole}
              onChange={(e) => setInviteRole(e.target.value as any)}
              className="w-full px-3 py-2 rounded-xl bg-canvas border border-border-subtle text-xs text-text-primary focus:outline-none focus:border-gold"
            >
              <option value="OPERATOR">Operador</option>
              <option value="MANAGER">Gestor</option>
              <option value="AUDITOR">Auditor</option>
              <option value="ADMIN">Administrador</option>
            </select>
          </Field>

          <div className="pt-2">
            <Button variant="gold" size="lg" className="w-full justify-center" loading={submitting}>
              Gerer Link de Convite
            </Button>
          </div>

          {inviteLink && (
            <div className="p-4 rounded-xl bg-success/10 border border-success/30 space-y-2 text-xs text-success">
              <div className="font-bold">Link de Convite Gerado:</div>
              <div className="p-2 rounded bg-canvas text-text-primary break-all border border-border-subtle">{inviteLink}</div>
              <Button
                variant="primary"
                size="sm"
                onClick={() => {
                  navigator.clipboard.writeText(inviteLink);
                  showToast('Link de convite copiado!', 'success');
                }}
              >
                Copiar Link de Convite
              </Button>
            </div>
          )}
        </form>
      </Modal>

    </div>
  );
};
