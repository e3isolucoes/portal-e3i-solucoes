import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, Tenant, AuditLog } from '../types';
import { getErrorMessage, getAuthHeaders } from '../utils';

export type ViewName = 'landing' | 'dashboard' | 'tools' | 'smartQuotation' | 'tenants' | 'users' | 'rbac' | 'audit' | 'designSystem' | 'architecture' | 'organizationSettings' | 'discovery' | 'discoveryReview' | 'businessContext' | 'strategyCanvas' | 'organizationMap' | 'systems';

export interface MembershipDto {
  id: string;
  organizationId: string;
  role: string;
  status: string;
  organization: Tenant;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  tenant: Tenant | null;
  memberships: MembershipDto[];
  currentMembership: MembershipDto | null;
  tenants: Tenant[];
  auditLogs: AuditLog[];
  currentView: ViewName;
  theme: 'dark' | 'light';
  login: (email: string, pass: string) => Promise<void>;
  register: (name: string, email: string, company: string, doc: string, pass: string) => Promise<void>;
  logout: () => void;
  switchOrganization: (membershipId: string) => Promise<void>;
  switchTenant: (tenantId: string) => void;
  setCurrentView: (view: ViewName) => void;
  toggleTheme: () => void;
  setTheme: React.Dispatch<React.SetStateAction<'dark' | 'light'>>;
  authModalOpen: boolean;
  setAuthModalOpen: (open: boolean) => void;
  authMode: 'login' | 'register' | 'forgot';
  setAuthMode: (mode: 'login' | 'register' | 'forgot') => void;
  profileModalOpen: boolean;
  setProfileModalOpen: (open: boolean) => void;
  mailboxModalOpen: boolean;
  setMailboxModalOpen: (open: boolean) => void;
  shortcutsModalOpen: boolean;
  setShortcutsModalOpen: (open: boolean) => void;
  updateUser: (updatedFields: Partial<User>) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const authenticatedEntryView = (user: User, tenant: Tenant | null): ViewName =>
  user.role === 'E3I_ADMIN' || tenant?.toolAccess?.includes('processos-inteligentes')
    ? 'dashboard'
    : 'tools';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(() => {
    try {
      const saved = localStorage.getItem('e3i_token');
      return (saved && saved !== 'null' && saved !== 'undefined') ? saved : null;
    } catch (e) {
      return null;
    }
  });
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [memberships, setMemberships] = useState<MembershipDto[]>([]);
  const [currentMembership, setCurrentMembership] = useState<MembershipDto | null>(null);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [currentView, setCurrentView] = useState<ViewName>('landing');
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    const saved = localStorage.getItem('e3i_theme');
    if (saved === 'dark' || saved === 'light') return saved;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'register' | 'forgot'>('login');
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [mailboxModalOpen, setMailboxModalOpen] = useState(false);
  const [shortcutsModalOpen, setShortcutsModalOpen] = useState(false);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('e3i_theme', theme);
  }, [theme]);

  useEffect(() => {
    console.log('[E3I Auth] Initializing session verification...');
    const headers = getAuthHeaders();
    fetch('/api/auth/session', { headers, credentials: 'include' })
      .then(res => {
        if (res.ok) return res.json();
        throw new Error('Unauthorized');
      })
      .then(data => {
        console.log('[E3I Auth] Session active:', data.user?.email);
        setUser(data.user);
        if (data.token) {
          setToken(data.token);
          localStorage.setItem('e3i_token', data.token);
        }
        setMemberships(data.memberships || []);
        setTenant(data.currentOrganization || data.tenant || null);
        setCurrentMembership(data.currentMembership || null);
        if (data.user) {
          setCurrentView(authenticatedEntryView(data.user, data.currentOrganization || data.tenant || null));
        }
      })
      .catch(() => {
        console.log('[E3I Auth] No active session found.');
        localStorage.removeItem('e3i_token');
        setToken(null);
        setUser(null);
        setTenant(null);
        setMemberships([]);
        setCurrentMembership(null);
        setCurrentView('landing');
      });

    fetch('/api/audit-logs')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) setAuditLogs(data);
      })
      .catch(err => console.error("Error fetching audit logs:", err));
  }, []);

  const login = async (email: string, pass: string) => {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password: pass }),
      credentials: 'include',
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(getErrorMessage(data, 'Erro ao realizar login'));
    }
    if (data.token) {
      setToken(data.token);
      localStorage.setItem('e3i_token', data.token);
    }
    setUser(data.user);
    setMemberships(data.memberships || []);
    setTenant(data.currentOrganization || data.tenant || null);
    setCurrentMembership(data.currentMembership || null);
    setAuthModalOpen(false);
    setCurrentView(authenticatedEntryView(data.user, data.currentOrganization || data.tenant || null));
  };

  const register = async (name: string, email: string, company: string, doc: string, pass: string) => {
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, companyName: company, document: doc, password: pass }),
      credentials: 'include',
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(getErrorMessage(data, 'Erro ao realizar cadastro'));
    }
    if (data.token) {
      setToken(data.token);
      localStorage.setItem('e3i_token', data.token);
    }
    setUser(data.user);
    setMemberships(data.memberships || []);
    setTenant(data.currentOrganization || data.tenant || null);
    setCurrentMembership(data.currentMembership || null);
    setAuthModalOpen(false);
    setCurrentView(authenticatedEntryView(data.user, data.currentOrganization || data.tenant || null));
  };

  const logout = async () => {
    try {
      const headers = getAuthHeaders();
      await fetch('/api/auth/logout', { method: 'POST', headers, credentials: 'include' });
    } catch (e) {}
    localStorage.removeItem('e3i_token');
    setToken(null);
    setUser(null);
    setTenant(null);
    setMemberships([]);
    setCurrentMembership(null);
    setCurrentView('landing');
  };

  const switchOrganization = async (membershipId: string) => {
    const headers = getAuthHeaders({ 'Content-Type': 'application/json' });
    const res = await fetch('/api/auth/switch-organization', {
      method: 'POST',
      headers,
      body: JSON.stringify({ membershipId }),
      credentials: 'include'
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(getErrorMessage(data, 'Erro ao trocar de organização'));
    }
    setUser(data.user);
    setTenant(data.currentOrganization);
    setCurrentMembership(data.currentMembership);
    window.location.reload();
  };


  const switchTenant = (tenantId: string) => {
    const mem = memberships.find(m => m.organizationId === tenantId);
    if (mem) {
      switchOrganization(mem.id);
    }
  };

  const toggleTheme = () => {
    setTheme(prev => (prev === 'dark' ? 'light' : 'dark'));
  };

  const updateUser = (updatedFields: Partial<User>) => {
    if (!user) return;
    const nextUser = { ...user, ...updatedFields };
    setUser(nextUser);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        tenant,
        memberships,
        currentMembership,
        tenants,
        auditLogs,
        currentView,
        theme,
        login,
        register,
        logout,
        switchOrganization,
        switchTenant,
        setCurrentView,
        toggleTheme,
        setTheme,
        authModalOpen,
        setAuthModalOpen,
        authMode,
        setAuthMode,
        profileModalOpen,
        setProfileModalOpen,
        mailboxModalOpen,
        setMailboxModalOpen,
        shortcutsModalOpen,
        setShortcutsModalOpen,
        updateUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
