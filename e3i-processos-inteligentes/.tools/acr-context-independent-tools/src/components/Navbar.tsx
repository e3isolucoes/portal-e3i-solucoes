import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { Logo } from './Logo';
import { Button, IconButton } from './ui';
import { 
  Building2, 
  ShieldCheck, 
  LayoutDashboard, 
  Users, 
  FileText, 
  Palette,
  LogOut, 
  Sun, 
  Moon, 
  ChevronDown,
  UserCog,
  Mail,
  Compass,
  Layers,
  Target,
  Network,
  Server,
  Menu,
  X,
  Search,
  Check,
  PanelLeftClose,
  PanelLeftOpen,
  Shield,
  Activity,
  Boxes
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export const Navbar: React.FC = () => {
  const { 
    user, 
    tenant, 
    tenants, 
    currentView, 
    setCurrentView, 
    theme, 
    toggleTheme, 
    logout, 
    switchTenant,
    setAuthModalOpen,
    setAuthMode,
    setProfileModalOpen,
    setMailboxModalOpen
  } = useAuth();

  const [tenantDropdownOpen, setTenantDropdownOpen] = useState(false);
  const [tenantSearchQuery, setTenantSearchQuery] = useState('');
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(() => {
    const saved = localStorage.getItem('e3i_sidebar_collapsed');
    return saved === 'true';
  });

  const tenantDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    localStorage.setItem('e3i_sidebar_collapsed', String(isCollapsed));
  }, [isCollapsed]);

  // Close tenant dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (tenantDropdownRef.current && !tenantDropdownRef.current.contains(e.target as Node)) {
        setTenantDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Strict RBAC checks
  const isAdmin = user?.role === 'ADMIN';
  const isManager = user?.role === 'MANAGER';
  const isAuditor = user?.role === 'AUDITOR';
  const canUseProcessos = user?.role === 'E3I_ADMIN' || tenant?.toolAccess?.includes('processos-inteligentes');

  const operationNavItems = [
    { id: 'dashboard', label: 'Painel Inicial', icon: <LayoutDashboard className="w-4 h-4" />, show: canUseProcessos },
    { id: 'tools', label: 'Minhas Ferramentas', icon: <Boxes className="w-4 h-4 text-gold" />, show: true },
    { id: 'discovery', label: 'Discovery', icon: <Compass className="w-4 h-4 text-gold" />, show: canUseProcessos },
    { id: 'businessContext', label: 'Contexto de Negócio', icon: <Layers className="w-4 h-4 text-gold" />, show: canUseProcessos },
    { id: 'strategyCanvas', label: 'Strategy Canvas', icon: <Target className="w-4 h-4 text-gold" />, show: canUseProcessos },
    { id: 'organizationMap', label: 'Org Mapper', icon: <Network className="w-4 h-4 text-gold" />, show: canUseProcessos },
    { id: 'systems', label: 'Sistemas & Integrações', icon: <Server className="w-4 h-4 text-gold" />, show: canUseProcessos },
  ];

  const adminNavItems = [
    { id: 'tenants', label: 'Empresas', icon: <Building2 className="w-4 h-4" />, show: isAdmin || isManager },
    { id: 'users', label: 'Usuários', icon: <Users className="w-4 h-4" />, show: isAdmin || isManager },
    { id: 'rbac', label: 'Controle de Acesso', icon: <ShieldCheck className="w-4 h-4" />, show: isAdmin },
    { id: 'audit', label: 'Auditoria e Logs', icon: <FileText className="w-4 h-4" />, show: isAdmin || isAuditor },
    { id: 'organizationSettings', label: 'Organização & Tema', icon: <Palette className="w-4 h-4" />, show: true },
  ];

  const filteredTenants = tenants.filter(t => t.name.toLowerCase().includes(tenantSearchQuery.toLowerCase()));

  // Landing page or unauthenticated view
  if (!user || currentView === 'landing') {
    return (
      <header className="sticky top-0 z-[100] border-b border-[#CFD6C6] bg-[#F0F2EC]/95 text-[#0E1A29] backdrop-blur-md">
        <div className="mx-auto flex h-[74px] max-w-[1180px] items-center justify-between gap-4 px-6">
          <div onClick={() => setCurrentView('landing')} className="cursor-pointer flex items-center space-x-3">
            <Logo />
          </div>
          <nav className="hidden items-center gap-7 font-mono text-[11px] font-medium uppercase tracking-[.1em] text-[#5C6672] lg:flex">
            <a href="#solucoes" className="border-b border-transparent py-1 transition hover:border-[#D9A925] hover:text-[#0E1A29]">Ferramentas</a>
            <a href="#servicos" className="border-b border-transparent py-1 transition hover:border-[#D9A925] hover:text-[#0E1A29]">Serviços</a>
            <a href="#governanca" className="border-b border-transparent py-1 transition hover:border-[#D9A925] hover:text-[#0E1A29]">Governança</a>
          </nav>
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              className="rounded-[3px] border border-[#B9C1B3] bg-[#FBFBF8] px-4 py-2.5 text-sm font-semibold transition hover:border-[#17395C]"
              onClick={() => {
                setAuthMode('login');
                setAuthModalOpen(true);
              }}
            >
              Entrar
            </button>
            <button
              className="hidden rounded-[3px] border border-[#0E1A29] bg-[#0E1A29] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#17395C] sm:block"
              onClick={() => { window.location.href = 'mailto:contato@e3isolucoes.com.br?subject=Solicitação%20de%20acesso%20ao%20portal'; }}
            >
              Solicitar acesso
            </button>
          </div>
        </div>
      </header>
    );
  }

  return (
    <>
      {/* Topbar */}
      <header className="sticky top-0 z-[90] border-b border-border-subtle bg-surface/90 backdrop-blur-md">
        <div className="px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between gap-4">
          
          {/* Left: Mobile menu button & Brand Logo */}
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setMobileDrawerOpen(true)}
              className="p-2.5 rounded-xl bg-surface-raised border border-border-subtle text-text-primary md:hidden"
              aria-label="Abrir menu lateral"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div 
              onClick={() => setCurrentView(canUseProcessos ? 'dashboard' : 'tools')}
              className="cursor-pointer flex items-center space-x-3 group"
            >
              <Logo />
            </div>
          </div>

          {/* Center: Tenant Switcher & Persistent Context */}
          <div className="hidden lg:flex items-center space-x-4">
            {tenant && isAdmin && (
              <div className="relative" ref={tenantDropdownRef}>
                <button
                  onClick={() => setTenantDropdownOpen(!tenantDropdownOpen)}
                  className="flex items-center space-x-3 bg-canvas border border-gold/30 hover:border-gold px-4 py-2.5 rounded-xl text-xs font-semibold text-text-primary transition-all shadow-sm"
                  aria-haspopup="true"
                  aria-expanded={tenantDropdownOpen}
                >
                  <Building2 className="w-4 h-4 text-gold shrink-0" />
                  <div className="text-left">
                    <span className="block text-[10px] text-text-muted uppercase tracking-wider">Empresa Ativa</span>
                    <span className="block font-bold truncate max-w-[160px] text-text-primary">{tenant.name}</span>
                  </div>
                  <ChevronDown className="w-3.5 h-3.5 text-gold shrink-0" />
                </button>

                {tenantDropdownOpen && (
                  <div className="absolute left-0 mt-2 w-72 bg-surface border border-gold/30 rounded-2xl shadow-2xl py-3 z-[999] space-y-2">
                    <div className="px-4 pb-2 border-b border-border-subtle">
                      <p className="text-[11px] font-bold text-text-secondary uppercase tracking-wider mb-2">
                        Alternar Organização (Tenant)
                      </p>
                      {tenants.length > 8 && (
                        <div className="relative">
                          <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-text-muted" />
                          <input
                            type="text"
                            placeholder="Buscar empresa..."
                            value={tenantSearchQuery}
                            onChange={(e) => setTenantSearchQuery(e.target.value)}
                            className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-surface-raised text-text-primary text-xs border border-border-subtle focus:outline-none focus:border-accent"
                          />
                        </div>
                      )}
                    </div>
                    <div className="max-h-60 overflow-y-auto px-2 space-y-1">
                      {filteredTenants.map((t) => (
                        <button
                          key={t.id}
                          onClick={() => {
                            switchTenant(t.id);
                            setTenantDropdownOpen(false);
                          }}
                          className={`w-full text-left px-3 py-2.5 rounded-xl text-xs flex items-center justify-between transition-colors ${
                            tenant.id === t.id ? 'bg-accent/15 text-accent font-bold' : 'text-text-secondary hover:bg-surface-raised hover:text-text-primary'
                          }`}
                        >
                          <span className="truncate">{t.name}</span>
                          {tenant.id === t.id && <Check className="w-4 h-4 text-accent shrink-0" />}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Context Badge */}
            <div className="flex items-center space-x-2 px-3.5 py-2 rounded-xl bg-surface-raised border border-border-subtle text-xs text-text-secondary">
              <Shield className="w-3.5 h-3.5 text-accent" />
              <span>Papel: <strong className="text-text-primary font-bold">{user.role}</strong></span>
            </div>
          </div>

          {/* Right Actions: Theme, Mailbox, Profile, Logout */}
          <div className="flex items-center space-x-3">
            <IconButton
              aria-label="Alternar Tema Claro / Escuro"
              icon={theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              variant="surface"
              onClick={toggleTheme}
            />

            <button
              onClick={() => setMailboxModalOpen(true)}
              className="px-3.5 py-2 rounded-xl bg-gold/10 border border-gold/30 text-gold hover:bg-gold/20 transition-all flex items-center space-x-2 text-xs font-bold"
              title="Simulador de E-mails & Convites"
            >
              <Mail className="w-4 h-4" />
              <span className="hidden sm:inline">E-mails</span>
            </button>

            <div className="flex items-center space-x-3 pl-3 border-l border-border-subtle">
              <div className="hidden xl:block text-right">
                <span className="block text-xs font-bold text-text-primary">{user.name}</span>
                <span className="block text-[10px] text-gold font-medium uppercase tracking-wider">
                  {user.role === 'ADMIN' ? 'Administrador' : user.role === 'MANAGER' ? 'Gestor' : user.role === 'AUDITOR' ? 'Auditor' : 'Operador'}
                </span>
              </div>
              <IconButton
                aria-label="Editar Meu Perfil"
                icon={<UserCog className="w-4 h-4" />}
                variant="surface"
                onClick={() => setProfileModalOpen(true)}
              />
              <IconButton
                aria-label="Encerrar Sessão"
                icon={<LogOut className="w-4 h-4" />}
                variant="danger"
                onClick={logout}
              />
            </div>
          </div>

        </div>
      </header>

      {/* Persistent Context Bar for Mobile / Medium screens */}
      {tenant && (
        <div className="lg:hidden bg-surface-raised border-b border-border-subtle px-4 py-2 flex items-center justify-between text-xs">
          <div className="flex items-center space-x-2 truncate">
            <Building2 className="w-3.5 h-3.5 text-gold shrink-0" />
            <span className="text-text-secondary">Empresa:</span>
            <span className="font-bold text-text-primary truncate">{tenant.name}</span>
          </div>
          <span className="text-text-muted">|</span>
          <div className="flex items-center space-x-1 shrink-0">
            <span className="text-text-secondary">Papel:</span>
            <span className="font-bold text-accent">{user.role}</span>
          </div>
        </div>
      )}

      {/* Sidebar for Desktop (≥1024px) */}
      <aside 
        className={`hidden lg:block fixed left-0 top-20 bottom-0 z-40 bg-surface border-r border-border-subtle transition-all duration-300 ${
          isCollapsed ? 'w-20' : 'w-72'
        }`}
      >
        <div className="flex flex-col h-full justify-between p-4 overflow-y-auto">
          <div className="space-y-6">
            
            {/* Collapse toggle button */}
            <div className="flex items-center justify-between px-2">
              {!isCollapsed && (
                <span className="text-[11px] font-bold text-text-muted uppercase tracking-wider">Navegação</span>
              )}
              <IconButton
                aria-label={isCollapsed ? 'Expandir barra lateral' : 'Colapsar barra lateral'}
                icon={isCollapsed ? <PanelLeftOpen className="w-4 h-4" /> : <PanelLeftClose className="w-4 h-4" />}
                variant="ghost"
                size="sm"
                onClick={() => setIsCollapsed(!isCollapsed)}
                className="ml-auto"
              />
            </div>

            {/* Section 1: Operação */}
            <div className="space-y-1.5">
              {!isCollapsed && (
                <p className="px-3 text-[10px] font-bold text-text-secondary uppercase tracking-wider">Operação</p>
              )}
              {operationNavItems.map((item) => {
                const isActive = currentView === item.id || (item.id === 'discovery' && currentView === 'discoveryReview');
                return (
                  <button
                    key={item.id}
                    onClick={() => setCurrentView(item.id as any)}
                    title={isCollapsed ? item.label : undefined}
                    className={`w-full flex items-center space-x-3 px-3.5 py-3 rounded-xl text-sm font-medium transition-all relative group ${
                      isActive
                        ? 'bg-accent/15 text-accent font-semibold shadow-sm'
                        : 'text-text-secondary hover:text-text-primary hover:bg-surface-raised'
                    }`}
                  >
                    {isActive && (
                      <span className="absolute left-0 top-2 bottom-2 w-1 bg-accent rounded-r-full" />
                    )}
                    <span className="shrink-0">{item.icon}</span>
                    {!isCollapsed && <span className="truncate">{item.label}</span>}
                  </button>
                );
              })}
            </div>

            {/* Section 2: Administração */}
            <div className="space-y-1.5 pt-4 border-t border-border-subtle">
              {!isCollapsed && (
                <p className="px-3 text-[10px] font-bold text-text-secondary uppercase tracking-wider">Administração</p>
              )}
              {adminNavItems.filter(i => i.show).map((item) => {
                const isActive = currentView === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => setCurrentView(item.id as any)}
                    title={isCollapsed ? item.label : undefined}
                    className={`w-full flex items-center space-x-3 px-3.5 py-3 rounded-xl text-sm font-medium transition-all relative group ${
                      isActive
                        ? 'bg-accent/15 text-accent font-semibold shadow-sm'
                        : 'text-text-secondary hover:text-text-primary hover:bg-surface-raised'
                    }`}
                  >
                    {isActive && (
                      <span className="absolute left-0 top-2 bottom-2 w-1 bg-accent rounded-r-full" />
                    )}
                    <span className="shrink-0">{item.icon}</span>
                    {!isCollapsed && <span className="truncate">{item.label}</span>}
                  </button>
                );
              })}
            </div>

          </div>

          {!isCollapsed && (
            <div className="p-3 rounded-2xl bg-surface-raised border border-border-subtle text-xs space-y-1">
              <p className="font-bold text-text-primary">E³I Processos v2.0</p>
              <p className="text-[11px] text-text-muted">Ambiente Corporativo Seguro</p>
            </div>
          )}
        </div>
      </aside>

      {/* Mobile Drawer (<1024px) */}
      <AnimatePresence>
        {mobileDrawerOpen && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileDrawerOpen(false)}
              className="fixed inset-0 bg-canvas/80 backdrop-blur-sm"
            />
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed left-0 top-0 bottom-0 w-80 bg-surface border-r border-border-subtle p-6 shadow-2xl z-10 flex flex-col justify-between overflow-y-auto"
            >
              <div className="space-y-6">
                <div className="flex items-center justify-between pb-4 border-b border-border-subtle">
                  <Logo />
                  <IconButton
                    aria-label="Fechar menu"
                    icon={<X className="w-5 h-5" />}
                    variant="ghost"
                    size="sm"
                    onClick={() => setMobileDrawerOpen(false)}
                  />
                </div>

                {/* Tenant Selector in Mobile Drawer */}
                {tenant && isAdmin && (
                  <div className="p-3 rounded-2xl bg-surface-raised border border-border-subtle space-y-2">
                    <span className="text-[10px] font-bold text-text-secondary uppercase tracking-wider">Empresa Ativa</span>
                    <select
                      value={tenant.id}
                      onChange={(e) => {
                        switchTenant(e.target.value);
                        setMobileDrawerOpen(false);
                      }}
                      className="w-full px-3 py-2 rounded-xl bg-canvas text-text-primary text-xs border border-border-subtle"
                    >
                      {tenants.map(t => (
                        <option key={t.id} value={t.id}>{t.name}</option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Nav Items */}
                <div className="space-y-4">
                  <div className="space-y-1">
                    <p className="px-3 text-[10px] font-bold text-text-secondary uppercase tracking-wider mb-2">Operação</p>
                    {operationNavItems.map(item => {
                      const isActive = currentView === item.id;
                      return (
                        <button
                          key={item.id}
                          onClick={() => {
                            setCurrentView(item.id as any);
                            setMobileDrawerOpen(false);
                          }}
                          className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                            isActive ? 'bg-accent/15 text-accent font-semibold' : 'text-text-secondary hover:text-text-primary hover:bg-surface-raised'
                          }`}
                        >
                          {item.icon}
                          <span>{item.label}</span>
                        </button>
                      );
                    })}
                  </div>

                  <div className="space-y-1 pt-4 border-t border-border-subtle">
                    <p className="px-3 text-[10px] font-bold text-text-secondary uppercase tracking-wider mb-2">Administração</p>
                    {adminNavItems.filter(i => i.show).map(item => {
                      const isActive = currentView === item.id;
                      return (
                        <button
                          key={item.id}
                          onClick={() => {
                            setCurrentView(item.id as any);
                            setMobileDrawerOpen(false);
                          }}
                          className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                            isActive ? 'bg-accent/15 text-accent font-semibold' : 'text-text-secondary hover:text-text-primary hover:bg-surface-raised'
                          }`}
                        >
                          {item.icon}
                          <span>{item.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="pt-6 border-t border-border-subtle text-xs text-text-muted text-center">
                E³I Processos Inteligentes v2.0
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};
