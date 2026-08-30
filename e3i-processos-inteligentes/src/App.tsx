/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState, useRef } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './components/ui';
import { Navbar } from './components/Navbar';
import { LandingPage } from './components/LandingPage';
import { Dashboard } from './components/Dashboard';
import { ToolHub } from './components/ToolHub';
import { SmartQuotationView } from './components/SmartQuotationView';
import { ObligationsPanelView } from './components/ObligationsPanelView';
import { AccessRequestsView } from './components/AccessRequestsView';
import { TenantManager } from './components/TenantManager';
import { UserManager } from './components/UserManager';
import { RbacManager } from './components/RbacManager';
import { AuditLogsView } from './components/AuditLogsView';
import { DesignSystem } from './components/DesignSystem';
import { ArchitectureView } from './components/ArchitectureView';
import { OrganizationSettingsView } from './components/OrganizationSettingsView';
import { DiscoveryView } from './components/DiscoveryView';
import { DiscoveryReviewView } from './components/DiscoveryReviewView';
import { BusinessContextView } from './components/BusinessContextView';
import { StrategyCanvasView } from './components/StrategyCanvasView';
import { OrganizationMapView } from './components/OrganizationMapView';
import { SystemsDiscoveryView } from './components/SystemsDiscoveryView';
import { AuthModal } from './components/AuthModal';
import { ProfileModal } from './components/ProfileModal';
import { MailboxModal } from './components/MailboxModal';
import { KeyboardShortcutsModal } from './components/KeyboardShortcutsModal';
import { ErrorBoundary } from './components/ErrorBoundary';
import { RequiredPasswordChange } from './components/RequiredPasswordChange';

const MainContent: React.FC = () => {
  const { 
    user, 
    tenant,
    currentView, 
    setCurrentView, 
    profileModalOpen, 
    setProfileModalOpen, 
    mailboxModalOpen, 
    setMailboxModalOpen,
    shortcutsModalOpen,
    setShortcutsModalOpen 
  } = useAuth();
  const [isCollapsed, setIsCollapsed] = useState(() => localStorage.getItem('e3i_sidebar_collapsed') === 'true');
  const waitingForKeyRef = useRef(false);
  const canUseProcessos = user?.role === 'E3I_ADMIN' || tenant?.toolAccess?.includes('processos-inteligentes');
  const canUseGestaoCompras = user?.role === 'E3I_ADMIN' || tenant?.toolAccess?.includes('gestao-compras');
  const canUseObligationsPanel = user?.role === 'E3I_ADMIN' || tenant?.toolAccess?.includes('painel-obrigacoes');
  const processViews = new Set(['dashboard', 'discovery', 'discoveryReview', 'businessContext', 'strategyCanvas', 'organizationMap', 'systems']);
  const guardedView = user && (
    (!canUseProcessos && processViews.has(currentView)) ||
    (!canUseGestaoCompras && currentView === 'smartQuotation') ||
    (!canUseObligationsPanel && currentView === 'obligationsPanel') ||
    (currentView === 'accessRequests' && user.role !== 'E3I_ADMIN')
  ) ? 'tools' : currentView;

  useEffect(() => {
    const handleStorage = () => {
      setIsCollapsed(localStorage.getItem('e3i_sidebar_collapsed') === 'true');
    };
    window.addEventListener('storage', handleStorage);
    const interval = setInterval(() => {
      const val = localStorage.getItem('e3i_sidebar_collapsed') === 'true';
      if (val !== isCollapsed) setIsCollapsed(val);
    }, 200);
    return () => {
      window.removeEventListener('storage', handleStorage);
      clearInterval(interval);
    };
  }, [isCollapsed]);

  // Global keyboard shortcuts listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if typing in input/textarea/select
      const target = e.target as HTMLElement;
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName) || target.isContentEditable || target.closest('input, textarea, select, [contenteditable="true"]')) {
        if (e.key === 'Escape') {
          target.blur();
        }
        return;
      }

      // Esc closes modals
      if (e.key === 'Escape') {
        setProfileModalOpen(false);
        setMailboxModalOpen(false);
        setShortcutsModalOpen(false);
        return;
      }

      // ? opens shortcuts modal
      if (e.key === '?') {
        e.preventDefault();
        setShortcutsModalOpen(true);
        return;
      }

      // Cmd/Ctrl + K for search
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        const searchInput = document.querySelector('input[type="text"]') as HTMLInputElement;
        if (searchInput) searchInput.focus();
        return;
      }

      // 'g' sequence for navigation
      if (e.key.toLowerCase() === 'g' && !waitingForKeyRef.current) {
        waitingForKeyRef.current = true;
        setTimeout(() => {
          waitingForKeyRef.current = false;
        }, 1000);
        return;
      }

      if (waitingForKeyRef.current) {
        waitingForKeyRef.current = false;
        const key = e.key.toLowerCase();
        if (key === 'd') {
          setCurrentView('dashboard');
        } else if (key === 'i') {
          setCurrentView('discovery');
        } else if (key === 'c') {
          setCurrentView('businessContext');
        } else if (key === 's') {
          setCurrentView('strategyCanvas');
        } else if (key === 't') {
          setCurrentView('tenants');
        } else if (key === 'u') {
          setCurrentView('users');
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [setCurrentView, setProfileModalOpen, setMailboxModalOpen, setShortcutsModalOpen]);

  const sidebarViews = new Set([
    ...processViews,
    'accessRequests',
    'tenants',
    'users',
    'rbac',
    'audit',
    'organizationSettings',
  ]);
  const hasSidebar = Boolean(user && sidebarViews.has(guardedView));

  return (
    <div className="min-h-screen bg-canvas text-text-primary">
      <Navbar />
      <main className={`transition-all duration-300 ${hasSidebar ? (isCollapsed ? 'lg:pl-20' : 'lg:pl-72') : ''}`}>
        {(!user || guardedView === 'landing') && <LandingPage />}
        {user && guardedView === 'dashboard' && <Dashboard />}
        {user && guardedView === 'tools' && <ToolHub />}
        {user && guardedView === 'smartQuotation' && <SmartQuotationView />}
        {user && guardedView === 'obligationsPanel' && <ObligationsPanelView />}
        {user && guardedView === 'accessRequests' && user.role === 'E3I_ADMIN' && <AccessRequestsView />}
        {user && guardedView === 'tenants' && <TenantManager />}
        {user && guardedView === 'users' && <UserManager />}
        {user && guardedView === 'rbac' && <RbacManager />}
        {user && guardedView === 'audit' && <AuditLogsView />}
        {user && guardedView === 'organizationSettings' && <OrganizationSettingsView />}
        {user && guardedView === 'discovery' && <DiscoveryView />}
        {user && guardedView === 'discoveryReview' && <DiscoveryReviewView />}
        {user && guardedView === 'businessContext' && <BusinessContextView />}
        {user && guardedView === 'strategyCanvas' && <StrategyCanvasView />}
        {user && guardedView === 'organizationMap' && <OrganizationMapView />}
        {user && guardedView === 'systems' && <SystemsDiscoveryView />}
        {guardedView === 'designSystem' && <DesignSystem />}
        {guardedView === 'architecture' && <ArchitectureView />}
      </main>
      <AuthModal />
      <ProfileModal isOpen={profileModalOpen} onClose={() => setProfileModalOpen(false)} />
      <MailboxModal isOpen={mailboxModalOpen} onClose={() => setMailboxModalOpen(false)} />
      <KeyboardShortcutsModal isOpen={shortcutsModalOpen} onClose={() => setShortcutsModalOpen(false)} />
      <RequiredPasswordChange />
    </div>
  );
};

export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <ToastProvider>
          <MainContent />
        </ToastProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}
