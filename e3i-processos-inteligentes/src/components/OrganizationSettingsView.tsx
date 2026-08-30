import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  Building2, Palette, Upload, Trash2, RotateCcw, Save, Globe, MapPin, Mail, Phone, 
  Shield, CheckCircle2, AlertCircle, Loader2, Sun, Moon, Sliders, FileText, Sparkles 
} from 'lucide-react';
import { getErrorMessage } from '../utils';

export const OrganizationSettingsView: React.FC = () => {
  const { user, token, tenant } = useAuth();
  const isAdmin = user?.role === 'ADMIN';

  const [activeTab, setActiveTab] = useState<'organization' | 'branding'>('organization');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  // Settings State
  const [settings, setSettings] = useState({
    legalName: '',
    tradingName: '',
    document: '',
    segment: '',
    size: '',
    employeeCount: 0,
    phone: '',
    email: '',
    website: '',
    address: '',
    city: '',
    state: '',
    country: 'Brasil',
    timezone: 'America/Sao_Paulo',
    language: 'pt-BR',
    currency: 'BRL',
    status: 'ACTIVE'
  });

  const [initialSettings, setInitialSettings] = useState(settings);

  // Branding State
  const [branding, setBranding] = useState({
    logoUrl: '',
    faviconUrl: '',
    primaryColor: '#3B82F6',
    secondaryColor: '#D4AF37',
    accentColor: '#3B82F6',
    backgroundColor: '#0A192F',
    lightMode: false,
    darkMode: true,
    productName: 'E³I Processos Inteligentes'
  });

  const [initialBranding, setInitialBranding] = useState(branding);
  const [logoFile, setLogoFile] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, [tenant]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
      const [resSettings, resBranding] = await Promise.all([
        fetch('/api/organization/settings', { headers }),
        fetch('/api/organization/branding', { headers })
      ]);

      if (resSettings.ok) {
        const data = await resSettings.json();
        setSettings(data);
        setInitialSettings(data);
      }
      if (resBranding.ok) {
        const data = await resBranding.json();
        setBranding(data);
        setInitialBranding(data);
        applyDesignTokens(data);
      }
    } catch (e) {
      console.error(e);
      setErrorMessage("Erro ao carregar dados da organização.");
    } finally {
      setLoading(false);
    }
  };

  const applyDesignTokens = (b: typeof branding) => {
    const root = document.documentElement;
    root.style.setProperty('--color-primary', b.primaryColor);
    root.style.setProperty('--color-secondary', b.secondaryColor);
    root.style.setProperty('--color-accent', b.accentColor);
    root.style.setProperty('--color-background', b.backgroundColor);
    root.style.setProperty('--color-surface', b.darkMode ? '#0F172A' : '#FFFFFF');
    root.style.setProperty('--color-text', b.darkMode ? '#F8FAFC' : '#0F172A');
    root.style.setProperty('--color-muted', '#94A3B8');
    root.style.setProperty('--color-border', b.darkMode ? 'rgba(212, 175, 55, 0.2)' : 'rgba(0, 0, 0, 0.1)');
  };

  const isSettingsDirty = JSON.stringify(settings) !== JSON.stringify(initialSettings);
  const isBrandingDirty = JSON.stringify(branding) !== JSON.stringify(initialBranding) || logoFile !== null;

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) {
      setErrorMessage("Apenas administradores podem salvar alterações.");
      return;
    }
    setSaving(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      const res = await fetch('/api/organization/settings', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify(settings)
      });
      const data = await res.json();
      if (res.ok) {
        setSettings(data.settings);
        setInitialSettings(data.settings);
        setSuccessMessage("Configurações da organização salvas com sucesso!");
        setTimeout(() => setSuccessMessage(''), 4000);
      } else {
        setErrorMessage(getErrorMessage(data, "Erro ao salvar configurações."));
      }
    } catch (e) {
      console.error(e);
      setErrorMessage("Erro de conexão ao salvar configurações.");
    } finally {
      setSaving(false);
    }
  };

  const handleSaveBranding = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) {
      setErrorMessage("Apenas administradores podem salvar identidade visual.");
      return;
    }
    setSaving(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      if (logoFile) {
        const logoRes = await fetch('/api/organization/branding/logo', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { 'Authorization': `Bearer ${token}` } : {})
          },
          body: JSON.stringify({ data: logoFile })
        });
        if (!logoRes.ok) {
          const errData = await logoRes.json();
          throw new Error(errData.error?.message || "Erro ao enviar logotipo.");
        }
        const logoData = await logoRes.json();
        branding.logoUrl = logoData.logoUrl;
      }

      const res = await fetch('/api/organization/branding/theme', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify(branding)
      });
      const data = await res.json();
      if (res.ok) {
        setBranding(data.branding);
        setInitialBranding(data.branding);
        setLogoFile(null);
        applyDesignTokens(data.branding);
        setSuccessMessage("Identidade visual atualizada com sucesso!");
        setTimeout(() => setSuccessMessage(''), 4000);
      } else {
        setErrorMessage(getErrorMessage(data, "Erro ao atualizar identidade visual."));
      }
    } catch (e: any) {
      console.error(e);
      setErrorMessage(e.message || "Erro ao salvar identidade visual.");
    } finally {
      setSaving(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setErrorMessage("Arquivo excede o limite máximo de 5MB.");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setLogoFile(reader.result as string);
      setBranding(prev => ({ ...prev, logoUrl: reader.result as string }));
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveLogo = async () => {
    if (!confirm("Deseja remover o logotipo atual?")) return;
    try {
      const res = await fetch('/api/organization/branding/logo', {
        method: 'DELETE',
        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
      });
      if (res.ok) {
        setLogoFile(null);
        setBranding(prev => ({ ...prev, logoUrl: '' }));
        setSuccessMessage("Logotipo removido com sucesso.");
        setTimeout(() => setSuccessMessage(''), 3000);
      }
    } catch (e) {
      console.error(e);
      setErrorMessage("Erro ao remover logotipo.");
    }
  };

  const handleResetE3I = async () => {
    if (!confirm("Deseja restaurar a identidade visual padrão E³I?")) return;
    try {
      const res = await fetch('/api/organization/branding/reset', {
        method: 'POST',
        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
      });
      const data = await res.json();
      if (res.ok) {
        setBranding(data.branding);
        setInitialBranding(data.branding);
        setLogoFile(null);
        applyDesignTokens(data.branding);
        setSuccessMessage("Identidade visual restaurada para o padrão E³I!");
        setTimeout(() => setSuccessMessage(''), 4000);
      }
    } catch (e) {
      console.error(e);
      setErrorMessage("Erro ao restaurar padrão E³I.");
    }
  };

  if (loading) {
    return (
      <div className="min-h-[calc(100vh-80px)] flex items-center justify-center bg-[#0A192F] text-slate-100">
        <div className="flex items-center space-x-3">
          <Loader2 className="w-8 h-8 animate-spin text-[#D4AF37]" />
          <span className="text-sm font-medium">Carregando configurações da organização...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-80px)] bg-[#0A192F] py-8 px-4 sm:px-6 lg:px-8 text-slate-100">
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-[#3B82F6]/10 text-[#3B82F6] text-xs font-bold uppercase tracking-wider mb-2 border border-[#3B82F6]/20">
              <Building2 className="w-3.5 h-3.5" />
              <span>Configurações Corporativas • E³I</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white">Organização e Identidade Visual</h1>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">
              Gerencie os dados cadastrais da empresa e personalize a experiência White Label (White-Label Branding).
            </p>
          </div>

          {!isAdmin && (
            <div className="px-4 py-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-center space-x-2">
              <Shield className="w-4 h-4 shrink-0" />
              <span>Modo Somente Leitura (Permissão necessária para alterar)</span>
            </div>
          )}
        </div>

        {/* Notifications */}
        {successMessage && (
          <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center space-x-3 animate-fade-in">
            <CheckCircle2 className="w-5 h-5 shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}
        {errorMessage && (
          <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center space-x-3 animate-fade-in">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Tabs */}
        <div className="flex border-b border-[#D4AF37]/20 space-x-6">
          <button
            onClick={() => setActiveTab('organization')}
            className={`pb-3 text-sm font-bold transition-all flex items-center space-x-2 border-b-2 ${
              activeTab === 'organization'
                ? 'border-[#D4AF37] text-[#D4AF37]'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Building2 className="w-4 h-4" />
            <span>Dados da Organização</span>
          </button>
          <button
            onClick={() => setActiveTab('branding')}
            className={`pb-3 text-sm font-bold transition-all flex items-center space-x-2 border-b-2 ${
              activeTab === 'branding'
                ? 'border-[#D4AF37] text-[#D4AF37]'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Palette className="w-4 h-4" />
            <span>Identidade Visual</span>
          </button>
        </div>

        {/* TAB 1: ORGANIZATION SETTINGS */}
        {activeTab === 'organization' && (
          <form onSubmit={handleSaveSettings} className="space-y-6">
            <div className="p-6 rounded-2xl bg-[#070D1A] border border-[#D4AF37]/20 space-y-6">
              
              <h2 className="text-base font-bold text-white flex items-center space-x-2 border-b border-slate-800 pb-3">
                <FileText className="w-4 h-4 text-[#D4AF37]" />
                <span>Dados Gerais e Cadastrais</span>
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">Razão Social</label>
                  <input
                    type="text"
                    value={settings.legalName}
                    onChange={(e) => setSettings({ ...settings, legalName: e.target.value })}
                    disabled={!isAdmin}
                    className="w-full bg-[#0A192F] border border-slate-700 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-[#D4AF37] disabled:opacity-50"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">Nome Fantasia (Nome Exibido)</label>
                  <input
                    type="text"
                    value={settings.tradingName}
                    onChange={(e) => setSettings({ ...settings, tradingName: e.target.value })}
                    disabled={!isAdmin}
                    className="w-full bg-[#0A192F] border border-slate-700 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-[#D4AF37] disabled:opacity-50"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">CNPJ / Documento</label>
                  <input
                    type="text"
                    value={settings.document}
                    onChange={(e) => setSettings({ ...settings, document: e.target.value })}
                    disabled={!isAdmin}
                    className="w-full bg-[#0A192F] border border-slate-700 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-[#D4AF37] disabled:opacity-50"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">Segmento de Mercado</label>
                  <input
                    type="text"
                    value={settings.segment}
                    onChange={(e) => setSettings({ ...settings, segment: e.target.value })}
                    disabled={!isAdmin}
                    className="w-full bg-[#0A192F] border border-slate-700 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-[#D4AF37] disabled:opacity-50"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">Porte da Empresa</label>
                  <select
                    value={settings.size}
                    onChange={(e) => setSettings({ ...settings, size: e.target.value })}
                    disabled={!isAdmin}
                    className="w-full bg-[#0A192F] border border-slate-700 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-[#D4AF37] disabled:opacity-50"
                  >
                    <option value="Startup">Startup</option>
                    <option value="Pequeno">Pequeno</option>
                    <option value="Médio">Médio</option>
                    <option value="Grande">Grande</option>
                    <option value="Enterprise">Enterprise Global</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">Quantidade de Colaboradores</label>
                  <input
                    type="number"
                    value={settings.employeeCount}
                    onChange={(e) => setSettings({ ...settings, employeeCount: parseInt(e.target.value) || 0 })}
                    disabled={!isAdmin}
                    className="w-full bg-[#0A192F] border border-slate-700 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-[#D4AF37] disabled:opacity-50"
                  />
                </div>
              </div>

              <h2 className="text-base font-bold text-white flex items-center space-x-2 border-b border-slate-800 pt-4 pb-3">
                <Phone className="w-4 h-4 text-[#D4AF37]" />
                <span>Contato e Suporte</span>
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">Telefone Institucional</label>
                  <input
                    type="text"
                    value={settings.phone}
                    onChange={(e) => setSettings({ ...settings, phone: e.target.value })}
                    disabled={!isAdmin}
                    className="w-full bg-[#0A192F] border border-slate-700 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-[#D4AF37] disabled:opacity-50"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">E-mail Institucional</label>
                  <input
                    type="email"
                    value={settings.email}
                    onChange={(e) => setSettings({ ...settings, email: e.target.value })}
                    disabled={!isAdmin}
                    className="w-full bg-[#0A192F] border border-slate-700 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-[#D4AF37] disabled:opacity-50"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">Website</label>
                  <input
                    type="text"
                    value={settings.website}
                    onChange={(e) => setSettings({ ...settings, website: e.target.value })}
                    disabled={!isAdmin}
                    className="w-full bg-[#0A192F] border border-slate-700 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-[#D4AF37] disabled:opacity-50"
                  />
                </div>
              </div>

              <h2 className="text-base font-bold text-white flex items-center space-x-2 border-b border-slate-800 pt-4 pb-3">
                <MapPin className="w-4 h-4 text-[#D4AF37]" />
                <span>Localização e Endereço</span>
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">Endereço Completo</label>
                  <input
                    type="text"
                    value={settings.address}
                    onChange={(e) => setSettings({ ...settings, address: e.target.value })}
                    disabled={!isAdmin}
                    className="w-full bg-[#0A192F] border border-slate-700 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-[#D4AF37] disabled:opacity-50"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">Cidade</label>
                  <input
                    type="text"
                    value={settings.city}
                    onChange={(e) => setSettings({ ...settings, city: e.target.value })}
                    disabled={!isAdmin}
                    className="w-full bg-[#0A192F] border border-slate-700 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-[#D4AF37] disabled:opacity-50"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">Estado</label>
                  <input
                    type="text"
                    value={settings.state}
                    onChange={(e) => setSettings({ ...settings, state: e.target.value })}
                    disabled={!isAdmin}
                    className="w-full bg-[#0A192F] border border-slate-700 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-[#D4AF37] disabled:opacity-50"
                  />
                </div>
              </div>

              <h2 className="text-base font-bold text-white flex items-center space-x-2 border-b border-slate-800 pt-4 pb-3">
                <Globe className="w-4 h-4 text-[#D4AF37]" />
                <span>Preferências Regionais</span>
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">Fuso Horário</label>
                  <select
                    value={settings.timezone}
                    onChange={(e) => setSettings({ ...settings, timezone: e.target.value })}
                    disabled={!isAdmin}
                    className="w-full bg-[#0A192F] border border-slate-700 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-[#D4AF37] disabled:opacity-50"
                  >
                    <option value="America/Sao_Paulo">Brasília (GMT-3)</option>
                    <option value="America/Manaus">Manaus (GMT-4)</option>
                    <option value="America/Noronha">Fernando de Noronha (GMT-2)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">Idioma Padrão</label>
                  <select
                    value={settings.language}
                    onChange={(e) => setSettings({ ...settings, language: e.target.value })}
                    disabled={!isAdmin}
                    className="w-full bg-[#0A192F] border border-slate-700 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-[#D4AF37] disabled:opacity-50"
                  >
                    <option value="pt-BR">Português (Brasil)</option>
                    <option value="en-US">English (US)</option>
                    <option value="es-ES">Español</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">Moeda</label>
                  <select
                    value={settings.currency}
                    onChange={(e) => setSettings({ ...settings, currency: e.target.value })}
                    disabled={!isAdmin}
                    className="w-full bg-[#0A192F] border border-slate-700 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-[#D4AF37] disabled:opacity-50"
                  >
                    <option value="BRL">Real Brasileiro (R$)</option>
                    <option value="USD">Dólar Americano ($)</option>
                    <option value="EUR">Euro (€)</option>
                  </select>
                </div>
              </div>

            </div>

            {isAdmin && (
              <div className="flex items-center justify-end space-x-4">
                {isSettingsDirty && (
                  <button
                    type="button"
                    onClick={() => setSettings(initialSettings)}
                    className="px-5 py-2.5 rounded-xl text-xs font-semibold text-slate-300 bg-slate-800 hover:bg-slate-700 transition-all flex items-center space-x-2"
                  >
                    <RotateCcw className="w-4 h-4" />
                    <span>Cancelar</span>
                  </button>
                )}
                <button
                  type="submit"
                  disabled={saving || !isSettingsDirty}
                  className="px-6 py-2.5 rounded-xl text-xs font-bold text-[#070D1A] bg-gradient-to-r from-[#F3E5AB] via-[#D4AF37] to-[#AA7C11] hover:brightness-110 transition-all shadow-lg e3i-satellite-glow disabled:opacity-50 flex items-center space-x-2"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  <span>Salvar Alterações da Organização</span>
                </button>
              </div>
            )}
          </form>
        )}

        {/* TAB 2: BRANDING & VISUAL IDENTITY */}
        {activeTab === 'branding' && (
          <form onSubmit={handleSaveBranding} className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Left Column: Logo & Product Name */}
              <div className="p-6 rounded-2xl bg-[#070D1A] border border-[#D4AF37]/20 space-y-6 lg:col-span-1">
                <h2 className="text-base font-bold text-white flex items-center space-x-2 border-b border-slate-800 pb-3">
                  <Upload className="w-4 h-4 text-[#D4AF37]" />
                  <span>Logotipo Principal</span>
                </h2>

                <div className="flex flex-col items-center justify-center p-6 rounded-xl border-2 border-dashed border-slate-700 bg-[#0A192F] text-center space-y-4">
                  {branding.logoUrl ? (
                    <div className="relative group">
                      <img src={branding.logoUrl} alt="Logo Preview" className="max-h-24 max-w-full object-contain rounded-lg" />
                      {isAdmin && (
                        <button
                          type="button"
                          onClick={handleRemoveLogo}
                          className="absolute -top-2 -right-2 p-1.5 rounded-full bg-rose-600 text-white hover:bg-rose-500 shadow-lg transition-all"
                          title="Remover logotipo"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center space-y-2">
                      <div className="w-12 h-12 rounded-full bg-[#3B82F6]/10 text-[#3B82F6] flex items-center justify-center border border-[#3B82F6]/30">
                        <Sparkles className="w-6 h-6" />
                      </div>
                      <span className="text-xs text-slate-400">Nenhum logotipo customizado. Usando padrão E³I.</span>
                    </div>
                  )}

                  {isAdmin && (
                    <label className="cursor-pointer px-4 py-2 rounded-xl text-xs font-bold text-[#070D1A] bg-gradient-to-r from-[#F3E5AB] via-[#D4AF37] to-[#AA7C11] hover:brightness-110 transition-all shadow-md">
                      <span>Enviar Logotipo (PNG, JPEG, WebP, SVG)</span>
                      <input type="file" accept="image/png, image/jpeg, image/webp, image/svg+xml" onChange={handleFileSelect} className="hidden" />
                    </label>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">Nome Exibido no Produto</label>
                  <input
                    type="text"
                    value={branding.productName}
                    onChange={(e) => setBranding({ ...branding, productName: e.target.value })}
                    disabled={!isAdmin}
                    className="w-full bg-[#0A192F] border border-slate-700 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-[#D4AF37] disabled:opacity-50"
                  />
                </div>
              </div>

              {/* Right Column: Colors & Theme Mode */}
              <div className="p-6 rounded-2xl bg-[#070D1A] border border-[#D4AF37]/20 space-y-6 lg:col-span-2">
                <h2 className="text-base font-bold text-white flex items-center space-x-2 border-b border-slate-800 pb-3">
                  <Palette className="w-4 h-4 text-[#D4AF37]" />
                  <span>Paleta de Cores e Design Tokens</span>
                </h2>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">Cor Primária (--color-primary)</label>
                    <div className="flex items-center space-x-3">
                      <input
                        type="color"
                        value={branding.primaryColor}
                        onChange={(e) => setBranding({ ...branding, primaryColor: e.target.value })}
                        disabled={!isAdmin}
                        className="w-10 h-10 rounded-lg bg-transparent border border-slate-700 cursor-pointer disabled:opacity-50"
                      />
                      <input
                        type="text"
                        value={branding.primaryColor}
                        onChange={(e) => setBranding({ ...branding, primaryColor: e.target.value })}
                        disabled={!isAdmin}
                        className="w-full bg-[#0A192F] border border-slate-700 rounded-xl px-4 py-2 text-xs text-white focus:outline-none focus:border-[#D4AF37] disabled:opacity-50 font-mono"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">Cor Secundária / Gold (--color-secondary)</label>
                    <div className="flex items-center space-x-3">
                      <input
                        type="color"
                        value={branding.secondaryColor}
                        onChange={(e) => setBranding({ ...branding, secondaryColor: e.target.value })}
                        disabled={!isAdmin}
                        className="w-10 h-10 rounded-lg bg-transparent border border-slate-700 cursor-pointer disabled:opacity-50"
                      />
                      <input
                        type="text"
                        value={branding.secondaryColor}
                        onChange={(e) => setBranding({ ...branding, secondaryColor: e.target.value })}
                        disabled={!isAdmin}
                        className="w-full bg-[#0A192F] border border-slate-700 rounded-xl px-4 py-2 text-xs text-white focus:outline-none focus:border-[#D4AF37] disabled:opacity-50 font-mono"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">Cor de Destaque (--color-accent)</label>
                    <div className="flex items-center space-x-3">
                      <input
                        type="color"
                        value={branding.accentColor}
                        onChange={(e) => setBranding({ ...branding, accentColor: e.target.value })}
                        disabled={!isAdmin}
                        className="w-10 h-10 rounded-lg bg-transparent border border-slate-700 cursor-pointer disabled:opacity-50"
                      />
                      <input
                        type="text"
                        value={branding.accentColor}
                        onChange={(e) => setBranding({ ...branding, accentColor: e.target.value })}
                        disabled={!isAdmin}
                        className="w-full bg-[#0A192F] border border-slate-700 rounded-xl px-4 py-2 text-xs text-white focus:outline-none focus:border-[#D4AF37] disabled:opacity-50 font-mono"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">Cor de Fundo (--color-background)</label>
                    <div className="flex items-center space-x-3">
                      <input
                        type="color"
                        value={branding.backgroundColor}
                        onChange={(e) => setBranding({ ...branding, backgroundColor: e.target.value })}
                        disabled={!isAdmin}
                        className="w-10 h-10 rounded-lg bg-transparent border border-slate-700 cursor-pointer disabled:opacity-50"
                      />
                      <input
                        type="text"
                        value={branding.backgroundColor}
                        onChange={(e) => setBranding({ ...branding, backgroundColor: e.target.value })}
                        disabled={!isAdmin}
                        className="w-full bg-[#0A192F] border border-slate-700 rounded-xl px-4 py-2 text-xs text-white focus:outline-none focus:border-[#D4AF37] disabled:opacity-50 font-mono"
                      />
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-800 flex items-center justify-between">
                  <div>
                    <span className="block text-xs font-bold text-white">Modo Escuro / Dark Mode</span>
                    <span className="block text-[11px] text-slate-400">Ativar paleta de alta performance com contraste profundo</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => isAdmin && setBranding({ ...branding, darkMode: !branding.darkMode, lightMode: branding.darkMode })}
                    disabled={!isAdmin}
                    className={`w-12 h-6 flex items-center rounded-full p-1 transition-colors ${branding.darkMode ? 'bg-[#3B82F6]' : 'bg-slate-700'}`}
                  >
                    <div className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${branding.darkMode ? 'translate-x-6' : 'translate-x-0'}`} />
                  </button>
                </div>

                {/* Theme Preview Box */}
                <div className="p-4 rounded-xl border border-slate-700 mt-4 space-y-3" style={{ backgroundColor: branding.backgroundColor, color: branding.darkMode ? '#F8FAFC' : '#0F172A' }}>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold tracking-wider uppercase opacity-75">Preview Dinâmico do Tema</span>
                    <span className="px-2.5 py-1 rounded-md text-[10px] font-bold text-white" style={{ backgroundColor: branding.primaryColor }}>Ativo</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-white" style={{ backgroundColor: branding.primaryColor }}>E³</div>
                    <div>
                      <h4 className="text-sm font-extrabold">{branding.productName}</h4>
                      <p className="text-[11px] opacity-75">Interface customizada por Design Tokens E³I</p>
                    </div>
                  </div>
                </div>

              </div>

            </div>

            {isAdmin && (
              <div className="flex items-center justify-between pt-4">
                <button
                  type="button"
                  onClick={handleResetE3I}
                  className="px-4 py-2.5 rounded-xl text-xs font-semibold text-amber-400 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 transition-all flex items-center space-x-2"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>Restaurar Padrão E³I</span>
                </button>

                <div className="flex items-center space-x-4">
                  {isBrandingDirty && (
                    <button
                      type="button"
                      onClick={() => { setBranding(initialBranding); setLogoFile(null); }}
                      className="px-5 py-2.5 rounded-xl text-xs font-semibold text-slate-300 bg-slate-800 hover:bg-slate-700 transition-all flex items-center space-x-2"
                    >
                      <RotateCcw className="w-4 h-4" />
                      <span>Cancelar</span>
                    </button>
                  )}
                  <button
                    type="submit"
                    disabled={saving || !isBrandingDirty}
                    className="px-6 py-2.5 rounded-xl text-xs font-bold text-[#070D1A] bg-gradient-to-r from-[#F3E5AB] via-[#D4AF37] to-[#AA7C11] hover:brightness-110 transition-all shadow-lg e3i-satellite-glow disabled:opacity-50 flex items-center space-x-2"
                  >
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    <span>Salvar Identidade Visual</span>
                  </button>
                </div>
              </div>
            )}
          </form>
        )}

      </div>
    </div>
  );
};
