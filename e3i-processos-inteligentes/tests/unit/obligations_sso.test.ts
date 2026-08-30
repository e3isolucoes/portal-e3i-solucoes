import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

describe('Acesso único ao Painel de Obrigações', () => {
  it('valida a concessão no portal e emite somente um token descartável', () => {
    const server = readFileSync(resolve(process.cwd(), 'server.ts'), 'utf8');
    const panel = readFileSync(resolve(process.cwd(), 'src/components/ObligationsPanelView.tsx'), 'utf8');

    expect(server).toContain("tool.id === 'painel-obrigacoes'");
    expect(server).toContain('PAINEL_SUPABASE_SERVICE_ROLE_KEY');
    expect(server).toContain("type: 'magiclink'");
    expect(server).toContain('portal_sso_token=');
    expect(panel).toContain('/api/client-tools/painel-obrigacoes/launch');
    expect(panel).not.toContain('src={PANEL_URL}');
  });
});
