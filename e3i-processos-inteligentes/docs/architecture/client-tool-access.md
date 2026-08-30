# Portal de ferramentas e concessões

O portal autenticado é o ponto de entrada das ferramentas oferecidas aos clientes. A
concessão é vinculada à organização (`tenant.toolAccess`) e nunca ao estado do navegador.

## Fluxo

1. A administração E³I alterna para a organização e abre **Minhas Ferramentas**.
2. Concede ou revoga cada produto disponível no catálogo do servidor.
3. O servidor retorna ao cliente autenticado somente os produtos concedidos;
   itens não contratados não são enviados ao navegador.
4. Ao abrir um produto, o servidor verifica novamente sessão, organização ativa e concessão.
5. Somente `E3I_ADMIN`, atuando na organização ativa, pode conceder ou revogar.
6. Concessões, revogações, acessos, negativas e tentativas entre empresas geram
   eventos de auditoria.

Os endereços publicados são definidos por `GESTAO_COMPRAS_URL` e
`PAINEL_OBRIGACOES_URL`. Os caminhos relativos padrão servem para uma publicação no mesmo
domínio.

## Limite de segurança

A autorização do portal protege o catálogo e o lançamento. Cada aplicação de destino deve
continuar validando sua própria sessão e o vínculo do usuário com o workspace. O endereço
direto de uma ferramenta nunca deve ser considerado segredo nem substituir autenticação,
RLS ou isolamento multi-tenant no produto de destino.
