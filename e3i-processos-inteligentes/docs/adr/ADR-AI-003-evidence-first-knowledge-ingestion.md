# ADR-AI-003: Ingestão de Conhecimento Baseada em Evidências (Evidence-First Knowledge Ingestion)

## Status
APROVADO

## Contexto
Sistemas de Recuperação Aumentada por Geração (RAG) em ambientes corporativos e multi-tenant frequentemente falham devido à falta de rastreabilidade, mistura de dados entre organizações (vazamentos cross-tenant), sobrescrita silenciosa de histórico e ingestão de dados sensíveis ou segredos.

## Decisão
Estabelecemos que **nenhum conteúdo poderá participar de operações de IA ou RAG sem proveniência (Evidence), isolamento estrito por tenant (organizationId obrigatório), versionamento imutável e bloqueio preventivo de segredos na entrada.**

### Consequências
- **Positivas**:
  - Garantia absoluta de rastreabilidade até a evidência original (ex: ID da resposta de discovery ou fato de business context).
  - Impossibilidade de vazamentos cross-tenant através de isolamento em todas as queries e repositórios.
  - Idempotência e versionamento robustos (fontes atualizadas geram novas versões e marcam chunks anteriores como `SUPERSEDED`).
  - Segurança contra ingestão acidental de credenciais, chaves de API e senhas.
- **Negativas**:
  - Maior rigor na estruturação prévia dos dados antes da indexação.
