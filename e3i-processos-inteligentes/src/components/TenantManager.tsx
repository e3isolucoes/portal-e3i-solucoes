import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { PageHeader, Card, Button, Input, Field, Modal, DataTable, Badge, useToast } from './ui';
import { Building2, Plus, CheckCircle2, Shield, Search, ArrowRight, Upload } from 'lucide-react';
import { Tenant } from '../types';
import { getErrorMessage } from '../utils';

export const TenantManager: React.FC = () => {
  const { user, tenants, tenant, switchTenant, token } = useAuth();
  const { showToast } = useToast();
  const isAdmin = user?.role === 'ADMIN';

  const [searchQuery, setSearchQuery] = useState('');
  const [showNewModal, setShowNewModal] = useState(false);
  const [showLogoModal, setShowLogoModal] = useState(false);
  const [targetTenantId, setTargetTenantId] = useState('');
  const [customLogoUrl, setCustomLogoUrl] = useState('');
  const [newName, setNewName] = useState('');
  const [newDoc, setNewDoc] = useState('');
  const [newPlan, setNewPlan] = useState<'Enterprise' | 'Professional' | 'Starter'>('Professional');
  const [newLogoUrl, setNewLogoUrl] = useState('');
  const [loading, setLoading] = useState(false);

  const newNameInputRef = useRef<HTMLInputElement>(null);
  const newDocInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (showNewModal) {
      const timer = setTimeout(() => {
        const active = document.activeElement;
        if (active && ['INPUT', 'TEXTAREA', 'SELECT'].includes(active.tagName)) {
          return;
        }
        newNameInputRef.current?.focus();
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [showNewModal]);

  const visibleTenants = isAdmin
    ? tenants
    : tenants.filter(t => t.id === user?.tenantId);

  const filteredTenants = visibleTenants.filter(t => 
    t.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    t.document.includes(searchQuery)
  );

  const handleCreateTenant = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch('/api/tenants', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ name: newName, document: newDoc, plan: newPlan, customLogoUrl: newLogoUrl }),
      });
      if (res.ok) {
        showToast('Empresa criada com sucesso!', 'success');
        window.location.reload();
      } else {
        const data = await res.json();
        throw new Error(getErrorMessage(data, 'Erro ao criar empresa.'));
      }
    } catch (err: any) {
      showToast(err.message || 'Erro ao criar empresa.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateLogo = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch('/api/tenants/logo', {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ tenantId: targetTenantId, customLogoUrl }),
      });
      if (res.ok) {
        showToast('Logo atualizado com sucesso!', 'success');
        window.location.reload();
      } else {
        const data = await res.json();
        throw new Error(getErrorMessage(data, 'Erro ao atualizar logo.'));
      }
    } catch (err: any) {
      showToast(err.message || 'Erro ao atualizar logo.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, setter: (val: string) => void) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setter(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleToggleStatus = async (targetTenant: Tenant) => {
    const nextStatus = targetTenant.status === 'INACTIVE' ? 'ACTIVE' : 'INACTIVE';
    if (nextStatus === 'INACTIVE') {
      const confirmed = window.confirm("Ao inativar esta organização, todos os usuários perderão o acesso imediatamente.");
      if (!confirmed) return;
    }

    try {
      const res = await fetch(`/api/admin/organizations/${targetTenant.id}/status`, {
        method: 'PATCH',
        headers: { 
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ status: nextStatus }),
      });
      if (res.ok) {
        showToast('Status da organização atualizado!', 'success');
        window.location.reload();
      } else {
        const data = await res.json();
        showToast(getErrorMessage(data, 'Erro ao alterar status da organização.'), 'error');
      }
    } catch (e: any) {
      showToast(e.message || 'Erro ao alterar status.', 'error');
    }
  };

  return (
    <div className="min-h-[calc(100vh-80px)] py-8 px-4 sm:px-6 lg:px-8 space-y-8 max-w-7xl mx-auto">
      
      {/* Header */}
      <PageHeader
        eyebrow={{ icon: <Building2 className="w-3.5 h-3.5" />, text: 'Multi-Tenant Enterprise' }}
        title="Gerenciamento de Empresas (Tenants)"
        description="Isolamento completo de dados e contexto para cada filial ou cliente corporativo."
        actions={
          isAdmin ? (
            <Button
              variant="gold"
              size="md"
              icon={<Plus className="w-4 h-4" />}
              onClick={() => setShowNewModal(true)}
            >
              Nova Empresa / Filial
            </Button>
          ) : undefined
        }
      />

      {/* Search Bar */}
      <Card elevation="flat" className="p-4 flex items-center space-x-3">
        <Search className="w-5 h-5 text-text-muted shrink-0" />
        <Input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Pesquisar empresa por nome ou CNPJ..."
          className="border-0 bg-transparent shadow-none"
        />
      </Card>

      {/* Tenants Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredTenants.map((t) => {
          const isActive = tenant?.id === t.id;
          return (
            <Card 
              key={t.id}
              elevation="raised"
              className={`p-6 flex flex-col justify-between transition-all ${
                isActive 
                  ? 'border-accent shadow-lg shadow-accent/10' 
                  : 'hover:border-gold/50'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-4">
                  <Badge variant="gold">{t.plan}</Badge>
                  {t.status === 'INACTIVE' ? (
                    <Badge variant="danger">Inativa</Badge>
                  ) : (
                    <Badge variant="success">Ativa</Badge>
                  )}
                </div>

                <h3 className="text-lg font-bold font-display text-text-primary mb-1">{t.name}</h3>
                <p className="text-xs font-mono text-text-secondary mb-4">CNPJ: {t.document}</p>

                <div className="space-y-2 text-xs text-text-secondary border-t border-border-subtle pt-4 mb-6">
                  <div className="flex justify-between">
                    <span>Usuários Ativos:</span>
                    <span className="font-bold text-text-primary">{t.usersCount} colaboradores</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Isolamento:</span>
                    <span className="text-accent font-bold">Schema Seguro</span>
                  </div>
                  <div className="flex justify-between items-center pt-2">
                    <span>Logo:</span>
                    <button
                      type="button"
                      onClick={() => {
                        setTargetTenantId(t.id);
                        setCustomLogoUrl(t.customLogoUrl || '');
                        setShowLogoModal(true);
                      }}
                      className="text-[11px] text-gold hover:underline font-semibold"
                    >
                      {t.customLogoUrl ? 'Alterar Logo' : '+ Inserir Logo'}
                    </button>
                  </div>
                </div>
              </div>

              <div className="space-y-2 pt-4 border-t border-border-subtle">
                {!isActive ? (
                  <Button
                    variant="primary"
                    size="sm"
                    className="w-full justify-center"
                    onClick={() => {
                      switchTenant(t.id);
                      showToast(`Empresa ativa alternada para ${t.name}`, 'success');
                    }}
                  >
                    Alternar para Esta Empresa
                  </Button>
                ) : (
                  <div className="text-center py-2 text-xs font-bold text-accent bg-accent/10 rounded-xl border border-accent/30">
                    Empresa Ativa Atual
                  </div>
                )}

                {isAdmin && (
                  <Button
                    variant={t.status === 'INACTIVE' ? 'primary' : 'danger'}
                    size="sm"
                    className="w-full justify-center"
                    onClick={() => handleToggleStatus(t)}
                  >
                    {t.status === 'INACTIVE' ? 'Ativar Organização' : 'Inativar Organização'}
                  </Button>
                )}
              </div>
            </Card>
          );
        })}
      </div>

      {/* New Tenant Modal */}
      <Modal
        isOpen={showNewModal}
        onClose={() => setShowNewModal(false)}
        title="Cadastrar Nova Empresa / Filial"
        description="Crie uma nova organização com isolamento multi-tenant seguro"
        maxWidth="md"
      >
        <form onSubmit={handleCreateTenant} className="space-y-4">
          <Field label="Nome da Empresa (Razão Social)" required>
            <Input
              ref={newNameInputRef}
              type="text"
              required
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Ex: E³I Logística S/A"
            />
          </Field>

          <Field label="CNPJ" required>
            <Input
              ref={newDocInputRef}
              type="text"
              required
              value={newDoc}
              onChange={(e) => setNewDoc(e.target.value)}
              placeholder="00.000.000/0001-00"
            />
          </Field>

          <Field label="Plano Corporativo">
            <select
              value={newPlan}
              onChange={(e) => setNewPlan(e.target.value as any)}
              className="w-full px-3 py-2 rounded-xl bg-canvas border border-border-subtle text-xs text-text-primary focus:outline-none focus:border-gold"
            >
              <option value="Starter">Starter</option>
              <option value="Professional">Professional</option>
              <option value="Enterprise">Enterprise</option>
            </select>
          </Field>

          <Field label="Logo Personalizada (Opcional)">
            <input
              type="file"
              accept="image/*"
              onChange={(e) => handleFileChange(e, setNewLogoUrl)}
              className="w-full text-xs text-text-secondary file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-accent file:text-white hover:file:brightness-110 file:cursor-pointer bg-canvas border border-border-subtle rounded-xl"
            />
          </Field>

          <div className="pt-2">
            <Button variant="gold" size="lg" className="w-full justify-center" loading={loading}>
              Criar Organização com Segurança
            </Button>
          </div>
        </form>
      </Modal>

      {/* Logo Modal */}
      <Modal
        isOpen={showLogoModal}
        onClose={() => setShowLogoModal(false)}
        title="Configurar Logo da Empresa"
        description="Insira uma imagem ou URL personalizada para a organização"
        maxWidth="md"
      >
        <form onSubmit={handleUpdateLogo} className="space-y-4">
          <Field label="Arquivo de Imagem / Logo">
            <input
              type="file"
              accept="image/*"
              onChange={(e) => handleFileChange(e, setCustomLogoUrl)}
              className="w-full text-xs text-text-secondary file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-accent file:text-white hover:file:brightness-110 file:cursor-pointer bg-canvas border border-border-subtle rounded-xl"
            />
          </Field>

          <Field label="Ou URL da Logo">
            <Input
              type="text"
              value={customLogoUrl}
              onChange={(e) => setCustomLogoUrl(e.target.value)}
              placeholder="https://..."
            />
          </Field>

          <div className="pt-2">
            <Button variant="gold" size="md" className="w-full justify-center" loading={loading}>
              Salvar Logo da Organização
            </Button>
          </div>
        </form>
      </Modal>

    </div>
  );
};
