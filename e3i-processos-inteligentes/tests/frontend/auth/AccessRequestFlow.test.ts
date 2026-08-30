import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const readSource = (relativePath: string) => readFileSync(resolve(process.cwd(), relativePath), 'utf8');

describe('Fluxo público de solicitação de acesso', () => {
  it('abre o formulário interno sem encaminhar o usuário ao cliente de e-mail', () => {
    const navbar = readSource('src/components/Navbar.tsx');

    expect(navbar).toContain("setAuthMode('register')");
    expect(navbar).toContain('setAuthModalOpen(true)');
    expect(navbar).not.toContain("window.location.href = 'mailto:contato@e3isolucoes.com.br?subject=Solicitação%20de%20acesso%20ao%20portal'");
  });

  it('envia o consentimento ao backend e não depende de Microsoft Authenticator', () => {
    const modal = readSource('src/components/AuthModal.tsx');
    const server = readSource('server.ts');

    expect(modal).toContain('requestedToolIds, privacyAccepted');
    expect(server).toContain("PRIVACY_CONSENT_REQUIRED");
    expect(server).toContain("notificationStatus: 'SENT' | 'FAILED' | 'NOT_CONFIGURED' | 'ALREADY_PENDING'");
    expect(server).not.toContain('I have a new phone');
  });

  it('exige confirmação antes de cadastrar uma nova organização e ativa o vínculo pela primeira senha', () => {
    const view = readSource('src/components/AccessRequestsView.tsx');
    const server = readSource('server.ts');

    expect(view).toContain("data.code === 'ORGANIZATION_REQUIRED'");
    expect(view).toContain('Confirmar cadastro e aprovar');
    expect(view).toContain("decide(organizationRequired.id, 'APPROVED', true)");
    expect(server).toContain("code: 'ORGANIZATION_REQUIRED'");
    expect(server).toContain('ORGANIZATION_CREATED_FROM_ACCESS_REQUEST');
    expect(server).toContain("membership.status = 'ACTIVE'");
    expect(server).toContain('Definir minha senha e ativar o acesso');
    expect(server).toContain("/resend-activation");
    expect(view).toContain('Reenviar ativação');
    expect(view).toContain("data.activationNotificationStatus");
    expect(view).not.toContain('ativação encaminhada ao solicitante');
  });
});
