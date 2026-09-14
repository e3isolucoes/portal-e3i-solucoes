# Administração de acessos e primeiro login do Portal

Esta pasta entrega extensões controladas sobre a imagem já validada do Portal E3I:

- a tela administrativa de concessões de ferramentas;
- a reconciliação dos usuários migrados da GRA Comércio;
- o fluxo obrigatório de definição de senha segura no primeiro acesso.

## Segurança e contrato de ferramentas

A tela de ferramentas não cria uma nova regra de autorização. Ela consome as rotas que já existem no backend do Portal:

- `GET /api/client-tools` — lista o catálogo visível no contexto ativo e informa `granted` para administradores E3I;
- `PUT /api/admin/organizations/:organizationId/client-tools/:toolId` — libera a ferramenta;
- `DELETE /api/admin/organizations/:organizationId/client-tools/:toolId` — revoga a ferramenta.

O servidor continua sendo a fonte de verdade. As mutações são aceitas somente quando o contexto do usuário pode gerir concessões (`E3I_ADMIN`) e o `organizationId` é a organização ativa. Tentativas cross-tenant permanecem bloqueadas.

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

## Tela de ferramentas

Depois de publicada no Portal, abrir:

`/admin-ferramentas.html`

A tela mostra organização ativa, quantidade total/liberada/bloqueada, busca no catálogo, estado de acesso de cada ferramenta, ações para liberar/revogar e tratamento explícito de sessão expirada, `403` e falhas de API.

## Build candidato no ACR

A imagem continua sendo um overlay sobre o digest nonce-v2 já validado. Durante o build o script aplica o patch de primeiro login ao bundle atual e executa validações sintáticas e de contrato.

```bash
ACR="acre3i431811"
REPO="e3i-portal"
TAG="first-login-password-$(date -u +%Y%m%d-%H%M%S)"

az acr build \
  --registry "$ACR" \
  --image "$REPO:$TAG" \
  --file portal-admin/Dockerfile \
  portal-admin
```

O build deve imprimir `PORTAL_ADMIN_AND_FIRST_LOGIN_VALIDATION_OK`.

## Publicação segura

Crie uma nova revisão em modo `Multiple`, inicialmente sem retirar tráfego da revisão corrente. Como `/app/data` é um volume persistente compartilhado, iniciar a revisão executa a reconciliação idempotente dos usuários e cria o backup antes da primeira escrita. Valide primeiro o login de uma conta migrada e a rota `/admin-ferramentas.html` usando uma label de revisão. Só mova o tráfego principal após os testes funcionais.

> O catálogo de ferramentas continua fixo no código atual do Portal. Este CRUD administra as **concessões de acesso** às ferramentas existentes; não cadastra nem exclui ferramentas do catálogo.
