# E3I Intelligence

Fundação isolada para discovery, mapeamento, enriquecimento humano, Data Science, Machine Learning, agentes e mensuração de savings.

## Regra de compatibilidade

Esta pasta não é dependência de nenhuma ferramenta operacional existente. Portal, autenticação, SSO, Painel de Obrigações, CRUDs e demais ferramentas devem continuar operando mesmo quando o E3I Intelligence estiver desabilitado ou indisponível.

Na Sprint 1:

- `E3I_INTELLIGENCE_ENABLED` nasce desligado;
- não existe integração de escrita nas ferramentas atuais;
- não existe agente com permissão de alteração;
- o barramento de ingestão nasce `DISABLED`;
- nenhuma tabela ou endpoint atual é modificado;
- o workflow desta pasta apenas valida; não faz deploy.

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

## Infraestrutura proposta

`aws/template.yaml` define uma stack independente, sem vínculo com a stack do Painel de Obrigações:

- EventBridge dedicado;
- fila SQS e DLQ criptografadas;
- Event Ledger;
- Mapping Store;
- Savings Ledger;
- Audit Store;
- bucket privado de evidências;
- endpoint público somente de health.

A regra EventBridge nasce desabilitada. Não há produtor nem consumidor conectado nesta Sprint.

## Segurança e LGPD

Consulte `docs/SECURITY-LGPD.md`. Os princípios obrigatórios são isolamento por tenant, minimização, finalidade registrada, proveniência, classificação, retenção, auditabilidade, segregação de funções e proibição de uso de conteúdo de clientes para treinamento de modelos por padrão.

## Validação local

```bash
cd e3i-intelligence
npm test
sam validate --lint --template-file aws/template.yaml
sam build --template-file aws/template.yaml
```

## Próxima etapa

Após revisão e validação desta fundação, a próxima PR deve implementar o Mapping Core autenticado e tenant-scoped. Só depois conectaremos o primeiro evento de uma ferramenta existente em shadow mode, com falha de telemetria incapaz de afetar a operação principal.
