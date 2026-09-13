# Administração de acessos às ferramentas do Portal

Esta pasta entrega uma tela administrativa independente, servida pelo mesmo backend do Portal E3I, para gerir as concessões das ferramentas já existentes à **organização ativa**.

## Segurança e contrato existente

A tela não cria uma nova regra de autorização. Ela consome as rotas que já existem no backend do Portal:

- `GET /api/client-tools` — lista o catálogo visível no contexto ativo e informa `granted` para administradores E3I;
- `PUT /api/admin/organizations/:organizationId/client-tools/:toolId` — libera a ferramenta;
- `DELETE /api/admin/organizations/:organizationId/client-tools/:toolId` — revoga a ferramenta.

O servidor continua sendo a fonte de verdade. As mutações são aceitas somente quando o contexto do usuário pode gerir concessões (`E3I_ADMIN`) e o `organizationId` é a organização ativa. Tentativas cross-tenant permanecem bloqueadas.

## Tela

Depois de publicada no Portal, abrir:

`/admin-ferramentas.html`

A tela mostra:

- organização ativa;
- quantidade total, liberada e bloqueada;
- busca no catálogo;
- estado de acesso de cada ferramenta;
- ações para liberar e revogar acesso;
- confirmação antes de revogar;
- tratamento explícito de sessão expirada, `403` e falhas de API.

## Build candidato no ACR

A imagem é um overlay sobre o digest nonce-v2 já validado. Nenhuma recompilação do bundle React ou do servidor é necessária.

```bash
ACR="acre3i431811"
REPO="e3i-portal"
TAG="tool-access-admin-$(date -u +%Y%m%d-%H%M%S)"

az acr build \
  --registry "$ACR" \
  --image "$REPO:$TAG" \
  --file portal-admin/Dockerfile \
  portal-admin
```

O build deve imprimir `PORTAL_TOOL_ACCESS_SCREEN_VALIDATION_OK`.

## Publicação segura

Crie uma nova revisão em modo `Multiple`, inicialmente sem retirar tráfego da revisão corrente. Valide primeiro a rota `/admin-ferramentas.html` usando uma label de revisão. Só mova o tráfego principal após os testes funcionais.

> O catálogo de ferramentas continua fixo no código atual do Portal. Este CRUD administra as **concessões de acesso** às ferramentas existentes; não cadastra nem exclui ferramentas do catálogo.
