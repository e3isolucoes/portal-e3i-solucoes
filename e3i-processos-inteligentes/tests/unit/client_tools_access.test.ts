import { describe, expect, it } from 'vitest';
import {
  canManageClientToolGrants,
  isActiveOrganizationTarget,
  scopeClientToolsForOrganization,
} from '../../src/clientTools/access';

const catalog = [
  { id: 'processos-inteligentes', name: 'E3I Processos Inteligentes' },
  { id: 'gestao-compras', name: 'Gestão de Compras' },
  { id: 'painel-obrigacoes', name: 'Painel de Obrigações' },
];

describe('concessões de ferramentas por empresa', () => {
  it('retorna ao cliente somente as ferramentas concedidas à empresa ativa', () => {
    expect(scopeClientToolsForOrganization(catalog, ['painel-obrigacoes'], false)).toEqual([
      { id: 'painel-obrigacoes', name: 'Painel de Obrigações', granted: true },
    ]);
  });

  it('não revela o catálogo quando a empresa não possui concessões', () => {
    expect(scopeClientToolsForOrganization(catalog, [], false)).toEqual([]);
  });

  it('não concede Processos Inteligentes por herança do Painel de Obrigações', () => {
    const tools = scopeClientToolsForOrganization(catalog, ['painel-obrigacoes'], false);
    expect(tools.map(tool => tool.id)).toEqual(['painel-obrigacoes']);
    expect(tools.some(tool => tool.id === 'processos-inteligentes')).toBe(false);
  });

  it('permite que somente a administração E3I veja o catálogo para concessão', () => {
    expect(canManageClientToolGrants('E3I_ADMIN')).toBe(true);
    expect(canManageClientToolGrants('ADMIN')).toBe(false);
    expect(canManageClientToolGrants('ORGANIZATION_ADMIN')).toBe(false);
  });

  it('bloqueia concessão ou revogação para empresa diferente da organização ativa', () => {
    expect(isActiveOrganizationTarget('tenant-1', 'tenant-1')).toBe(true);
    expect(isActiveOrganizationTarget('tenant-1', 'tenant-2')).toBe(false);
  });

  it('exibe o catálogo completo somente no modo administrativo E3I', () => {
    expect(scopeClientToolsForOrganization(catalog, ['gestao-compras'], true)).toEqual([
      { id: 'processos-inteligentes', name: 'E3I Processos Inteligentes', granted: false },
      { id: 'gestao-compras', name: 'Gestão de Compras', granted: true },
      { id: 'painel-obrigacoes', name: 'Painel de Obrigações', granted: false },
    ]);
  });
});
