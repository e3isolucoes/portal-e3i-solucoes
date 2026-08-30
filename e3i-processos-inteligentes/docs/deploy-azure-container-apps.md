# Deploy econômico no Azure Container Apps

## Configuração escolhida

- assinatura Microsoft for Startups;
- região `Brazil South`;
- Container Apps Consumption;
- 0,5 vCPU e 1 GiB de memória;
- mínimo de 0 e máximo de 1 réplica;
- ingresso HTTPS externo na porta 3000;
- Azure Container Registry Basic;
- Azure Files Standard LRS, compartilhamento de 5 GiB;
- cadastro público desabilitado;
- IA desabilitada na primeira publicação.

O Container App escala para zero quando não recebe tráfego. O limite de uma réplica é
intencional enquanto o servidor ainda persiste parte dos dados em arquivo. O Azure Files é
montado em `/app/data` para preservar esses arquivos entre reinicializações.

## Implantação pelo Cloud Shell

1. Abra o Cloud Shell no portal Azure e escolha Bash.
2. Envie o pacote do projeto sem `.env`, `node_modules`, `dist` ou bancos locais.
3. Extraia o pacote e entre na pasta do projeto.
4. Revise `deploy/azure/deploy.sh`.
5. Execute `bash deploy/azure/deploy.sh`.
6. Valide a URL HTTPS e `/api/health/live` informadas ao final.

O script cria um grupo de recursos isolado chamado `rg-e3i-portal-test`, facilitando a
visualização de custos e a remoção integral do ambiente de teste.

## Custos e limites

Compute tende a ficar dentro da franquia mensal do plano Consumption com baixo tráfego.
ACR Basic e Azure Files podem consumir uma pequena parte dos créditos mesmo quando o app
está parado. Configure um orçamento de US$ 10/mês com alertas de 50%, 80% e 100%.

## Antes de clientes reais

- migrar arrays e JSON restantes para Cosmos DB ou Azure Database for PostgreSQL;
- remover todas as contas demonstrativas;
- armazenar segredos no Key Vault;
- trocar as credenciais administrativas do ACR por identidade gerenciada;
- configurar `app.e3isolucoes.com.br` e o certificado gerenciado;
- criar backup e política de retenção;
- testar isolamento entre organizações e revogação das ferramentas.
