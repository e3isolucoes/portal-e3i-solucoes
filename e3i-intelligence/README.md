# E3I Intelligence

Fundação isolada para discovery, mapeamento, enriquecimento humano, Data Science, Machine Learning, agentes e mensuração de savings.

## Regra de compatibilidade

Esta pasta não é dependência de nenhuma ferramenta operacional existente. Portal, autenticação, SSO, Painel de Obrigações, CRUDs e demais ferramentas devem continuar operando mesmo quando o E3I Intelligence estiver desabilitado ou indisponível.

Na fundação:

- `E3I_INTELLIGENCE_ENABLED` continua desligado por padrão;
- produção continua com o recurso desligado;
- não existe integração de escrita nas ferramentas atuais;
- não existe agente com permissão de alteração;
- nenhuma tabela ou endpoint operacional é modificado pelo Intelligence;
- a falha de telemetria nunca pode interromper a operação.

## Shadow ingestion — staging isolado

O primeiro consumidor foi adicionado em modo **read-only/shadow** para eventos `EVENT#` dos módulos `obrigacoes` e `suprimentos`.

Regras obrigatórias:

- habilitação somente com `E3I_ENVIRONMENT=staging`;
- `E3I_INTELLIGENCE_ENABLED=true` somente no ambiente `intelligence-staging`;
- `E3I_INTELLIGENCE_SHADOW_MODE=true` é obrigatório;
- a role do consumidor possui apenas `dynamodb:DescribeTable` e `dynamodb:Scan` nas tabelas-fonte;
- nenhuma operação `PutItem`, `UpdateItem` ou `DeleteItem` é permitida nas tabelas dos módulos;
- gravações são permitidas exclusivamente nas tabelas isoladas `EventLedger` e `MappingStore`;
- payload operacional bruto não é copiado: o consumidor minimiza os dados e traduz somente metadados necessários para `event-v1`;
- indisponibilidade do Intelligence resulta em telemetria degradada, sem derrubar `obrigacoes` ou `suprimentos`.

O deploy de staging é **manual** em `.github/workflows/intelligence-shadow-staging.yml`. O schedule nasce `DISABLED` e deve ser habilitado somente depois do health check e de uma execução shadow manual bem-sucedidos.

## Três formas de iniciar um mapeamento

1. **Ferramentas E3I** — dados autorizados podem ser ingeridos futuramente em shadow mode.
2. **Complementação humana** — usuários complementam contexto, tempos, volumes, custos, riscos e evidências.
3. **Do zero** — um `Mapping` pode nascer sem integração prévia e ser enriquecido posteriormente.

Todos os dados carregam proveniência. Informação medida, declarada, extraída, calculada, prevista ou inferida nunca deve ser apresentada como se tivesse a mesma natureza.

## Contratos v1

- `contracts/data-provenance-v1.schema.json`
- `contracts/evidence-v1.schema.json`
- `contracts/event-v1.schema.json`
- `contracts/mapping-v1.schema.json`
- `contracts/saving-opportunity-v1.schema.json`

## Infraestrutura planejada

`foundation-manifest.json` descreve a stack futura de forma não executável e explicitamente sem deploy automático:

- EventBus dedicado;
- fila e DLQ;
- Event Ledger;
- Mapping Store;
- Savings Ledger;
- Audit Store;
- armazenamento privado de evidências;
- endpoint somente de health.

Nenhum desses componentes está conectado às ferramentas atuais nesta Sprint.

## Segurança e LGPD

Consulte `docs/SECURITY-LGPD.md`. Os princípios obrigatórios são isolamento por tenant, minimização, finalidade registrada, proveniência, classificação, retenção, auditabilidade, segregação de funções e proibição de uso de conteúdo de clientes para treinamento de modelos por padrão.

## Validação local

```bash
cd e3i-intelligence
npm test
```

## Consumidor shadow

Arquivos principais:

- `src/shadow-event-consumer.mjs` — tradução `EVENT#` → `event-v1`, idempotência e projeção shadow;
- `src/dynamodb-shadow-adapter.mjs` — leitura DynamoDB e escrita somente nos stores de Intelligence;
- `src/shadow-health.mjs` — health check de isolamento de falha;
- `src/shadow-runner.mjs` — execução do consumidor;
- `aws/shadow-staging.yaml` — stack isolada de staging;
- `.github/workflows/intelligence-shadow-staging.yml` — deploy manual de staging.

## Próxima etapa

Após validar o primeiro lote real em staging, comparar Event Ledger e Mapping Store com os eventos-fonte, medir volume/custo de leitura e somente então decidir sobre polling recorrente ou migração para streams/event bus. Produção permanece desligada até uma decisão explícita posterior.
