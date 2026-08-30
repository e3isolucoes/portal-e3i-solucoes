# Acesso unificado às ferramentas E3I

## Fluxo obrigatório

1. A pessoa solicita acesso no Portal E3I.
2. A solicitação permanece pendente e o administrador E3I valida empresa, CNPJ, domínio de e-mail e necessidade.
3. A organização é cadastrada ou vinculada no portal.
4. O administrador concede cada ferramenta separadamente.
5. A pessoa recebe o convite de ativação.
6. Após autenticar no portal, enxerga somente as ferramentas concedidas.
7. Ao abrir uma ferramenta, o servidor revalida organização, usuário, sessão e concessão.
8. A ferramenta aceita a identidade federada; nenhuma senha é transmitida entre aplicações.

## SSO recomendado

Usar Microsoft Entra External ID como provedor OIDC comum para Portal, Gestão de Compras e Painel de Obrigações. O Supabase deve confiar no mesmo provedor para o Painel. Cada aplicação valida `issuer`, `audience`, expiração e organização; a autorização da ferramenta continua no Portal E3I.

Não usar tokens em query string, credenciais compartilhadas, login automático por e-mail, iframe como substituto de autenticação ou chaves administrativas no navegador.

## URLs canônicas

- Portal: `https://portal.e3isolucoes.com.br`
- Painel de Obrigações: `https://obrigacoes.e3isolucoes.com.br`
- Gestão de Compras: `https://compras.e3isolucoes.com.br`

Os domínios só devem substituir endereços técnicos depois da validação DNS, certificado TLS e configuração no serviço de origem.

## Auditoria

Registrar solicitação, decisão, administrador responsável, organização, ferramentas concedidas, abertura da ferramenta, falha de federação e revogação. Nunca registrar senha, token integral ou segredo de provedor.
