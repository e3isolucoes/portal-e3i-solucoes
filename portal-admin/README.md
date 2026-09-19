# Administração do Portal

Esta pasta entrega extensões controladas sobre a imagem já validada do Portal E3I:

- administração central de acessos e parâmetros;
- reconciliação dos usuários migrados da GRA Comércio;
- fluxo obrigatório de definição de senha segura no primeiro acesso.

## Administração central

A rota principal desta camada é:

`/admin-central.html`

Ela consolida três áreas:

1. **Acessos** — usa os contratos existentes de `client-tools` para liberar/revogar ferramentas da organização ativa;
2. **Parâmetros** — mantém um registro central, por organização, para parâmetros governados do E3I Intelligence;
3. **Governança** — apresenta os guardrails de tenant, allowlist, concorrência e o histórico recente de mudanças.

`/admin-central.html` é a única interface administrativa mantida neste overlay. A tela clássica foi removida para evitar duas superfícies com a mesma responsabilidade.

## Modelo de acesso administrativo

A interface administrativa segue delegação explícita e enforcement no servidor:

- `admin@e3isolucoes.com.br` é o administrador-raiz padrão, configurável por `E3I_ROOT_ADMIN_EMAIL`;
- o administrador-raiz pode conceder ou revogar `E3I_ADMIN`;
- usuários delegados podem operar a Administração Central, mas não podem repassar a própria delegação;
- `/admin-central.html` não é um arquivo público: o backend só entrega a tela depois de validar a sessão e a autorização;
- ocultar ou exibir o link no frontend é apenas UX; a autorização efetiva permanece no backend.

## Segurança e contrato de ferramentas

A administração de ferramentas não cria uma nova regra de autorização. Ela consome as rotas que já existem no backend do Portal:

- `GET /api/client-tools` — lista o catálogo visível no contexto ativo e informa `granted` para administradores E3I;
- `PUT /api/admin/organizations/:organizationId/client-tools/:toolId` — libera a ferramenta;
- `DELETE /api/admin/organizations/:organizationId/client-tools/:toolId` — revoga a ferramenta.

O servidor continua sendo a fonte de verdade. As mutações são aceitas somente quando o contexto do usuário pode gerir concessões (`E3I_ADMIN`) e o `organizationId` é a organização ativa. Tentativas cross-tenant permanecem bloqueadas.

## Parametrização central

O overlay adiciona:

- `GET /api/admin/organizations/:organizationId/central-settings`
- `PUT /api/admin/organizations/:organizationId/central-settings`

As rotas usam a sessão autenticada e exigem `E3I_ADMIN`. A organização informada na URL precisa coincidir com a organização ativa derivada do contexto autenticado. A requisição de escrita também exige `x-e3i-admin-request: 1`.

A configuração é persistida em `/app/data/e3i_admin_settings.json`, separada do dataset principal do Portal. A gravação usa arquivo temporário, `fsync`, `rename` atômico e permissão restrita; uma cópia `.bak` é mantida antes de substituir uma configuração existente.

O payload possui allowlist estrita. Não são aceitos tenant, ator, papel, permissões, contexto de autenticação, tokens ou campos arbitrários. A gravação usa `expectedVersion` para controle de concorrência otimista; uma alteração concorrente retorna `409`.

Parâmetros iniciais:

- `intelligence.enabled=false`;
- `intelligence.ingestionEnabled=false`;
- `intelligence.agentMode=DISABLED|READ_ONLY`;
- `intelligence.requireHumanApproval=true`;
- `intelligence.allowSensitivePersonalData=false`;
- retenção padrão;
- identificador de finalidade de mapeamento;
- nível de auditoria;
- validação humana obrigatória de saving.

Esses valores são um **registro central para consumo futuro** do E3I Intelligence. Salvá-los não altera automaticamente o Portal, Painel de Obrigações ou outras ferramentas operacionais atuais.

## Auditoria e LGPD

O arquivo de parametrização guarda apenas metadados da alteração: versão, ator, horário e nomes das chaves modificadas. Os valores alterados não são copiados para o audit trail.

A finalidade padrão aceita somente um identificador técnico curto; a interface e o backend rejeitam padrões evidentes de e-mail/CPF. O objetivo é evitar que a parametrização seja usada como repositório improvisado de dados pessoais.

A opção para dados pessoais sensíveis nasce desligada e exige confirmação explícita na interface. Ativá-la não cria base legal nem finalidade automaticamente; essas decisões continuam sujeitas à governança e LGPD aplicáveis.

## Usuários migrados e primeiro login

O Portal mantém autenticação local própria. Como a migração anterior para Cognito não preservou a senha original dos usuários, o overlay não cria senha compartilhada nem tenta copiar hashes entre provedores.

No início da revisão, `migrate-gra-users.cjs` reconcilia de forma idempotente os usuários migrados da GRA Comércio pelo mesmo e-mail já utilizado, cria os vínculos locais ausentes e marca essas contas com `mustChangePassword=true`. Antes da primeira alteração do arquivo persistente é criada uma cópia `bigquery_dataset.json.before-first-login-*`; a gravação principal é feita por arquivo temporário, `fsync` e `rename` atômico.

Ao tentar entrar com uma conta marcada para primeiro acesso:

1. o Portal envia um código de seis dígitos ao próprio e-mail da conta usando o `RESEND_API_KEY` já configurado;
2. a interface abre o modal de definição de nova senha;
3. o código expira conforme `PASSWORD_RESET_TOKEN_TTL_MINUTES`, possui limite de tentativas e cooldown de reenvio;
4. a nova senha precisa ter 12–128 caracteres, maiúscula, minúscula, número e símbolo e não pode conter o identificador do e-mail;
5. a alteração só é concluída se o hash retornado for Argon2; não existe downgrade para SHA-256 nesse fluxo;
6. sessões antigas do usuário são revogadas e a conta deixa de exigir troca no próximo login.

As contas reconciliadas são `fiscal@gracomercio.com.br`, `nfe@gracomercio.com.br`, `fiscal2@gracomercio.com.br`, `samea@gracomercio.com.br`, `marcomirandacoc@gmail.com`, `marcoantoniomiranda713@gmail.com` e `daniela@gracomercio.com.br`. As contas recebem papel operacional no Portal; os papéis específicos do Painel continuam sendo resolvidos pelo backend AWS, evitando promover automaticamente um usuário a administrador global do Portal. `contato@e3isolucoes.com.br` continua reservado para notificações e não é criado como usuário.

## QA da administração central

`test-admin-central.cjs` valida os contratos estáticos da tela, defaults seguros, ausência de storage no navegador para os parâmetros, requisitos do patch do servidor e idempotência do patch usando uma fixture de `server.cjs`.

O workflow `Portal Admin Central Validate` executa esses testes em cada PR que toca `portal-admin/**`. O build da imagem também executa o mesmo teste e verifica o bundle final.

## Build candidato no ACR

A imagem continua sendo um overlay sobre o digest nonce-v2 já validado. Durante o build os patches são aplicados ao bundle atual e são executadas validações sintáticas e de contrato.

```bash
ACR="acre3i431811"
REPO="e3i-portal"
TAG="admin-central-$(date -u +%Y%m%d-%H%M%S)"

az acr build \
  --registry "$ACR" \
  --image "$REPO:$TAG" \
  --file portal-admin/Dockerfile \
  portal-admin
```

O build deve imprimir:

- `PORTAL_ADMIN_CENTRAL_PATCH_OK`
- `PORTAL_ADMIN_CENTRAL_VALIDATION_OK`
- `PORTAL_CLIENT_TOOL_AUTH_PATCH_OK`
- `PORTAL_FIRST_LOGIN_PATCH_OK`
- `PORTAL_CLIENT_TOOL_AUTH_VALIDATION_OK`
- `PORTAL_FIRST_LOGIN_TRANSPORT_VALIDATION_OK`

## Publicação segura

Crie uma nova revisão em modo `Multiple`, inicialmente sem retirar tráfego da revisão corrente. Valide `/admin-central.html` em uma label de revisão, incluindo desktop, tablet e mobile, antes de promover tráfego.

O teste funcional mínimo deve confirmar:

- login e Portal existentes continuam funcionando;
- `/admin-central.html` carrega somente com sessão válida;
- administrador consegue ler e salvar parâmetros;
- usuário não administrador recebe `403` nas rotas de parâmetros;
- tentativa cross-organization recebe `404`;
- duas sessões concorrentes produzem `409` na sessão desatualizada;
- conceder/revogar ferramentas continua usando os endpoints existentes;
- salvar parâmetros não altera nenhuma ferramenta operacional.

> O catálogo de ferramentas continua fixo no código atual do Portal. A administração central gerencia concessões das ferramentas existentes e parâmetros governados; ela não cadastra nem exclui ferramentas do catálogo.
