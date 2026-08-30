# ADR-AI-002: Arquitetura de Capacidades, Skills e Tools (E³I AF01-R4)

## Status
APROVADO

## Contexto
Com a consolidação da fundação de IA na E³I (AF01-R3), tornou-se necessário evoluir a arquitetura para suportar o conceito de **Skills** (competências) e **Tools** (ferramentas executáveis) de forma isolada, versionada, auditável e segura, respeitando estritamente o princípio da menor privilégio, menor contexto e menor capacidade (*Least Privilege / Least Capability*).

Decidiu-se **não** implementar nesta fase loops de agentes autônomos (Planner / ReAct), RAG vetorial ou protocolos externos complexos (MCP), mantendo a autonomia máxima restrita a `RECOMMEND` e exigindo validação determinística prévia à execução.

## Decisão
1. **Separation of Concerns**: Prompt, Skill e Tool são conceitos estritamente separados:
   - **Prompt**: Instruções e esquemas de entrada/saída estruturada por operação.
   - **Skill**: Competência comportamental e de domínio com versionamento, status, permissões requeridas e nível de risco.
   - **Tool**: Unidade executável determinística com validação Zod (entrada e saída), restrição de efeitos colaterais (`READ`), isolamento estrito de tenant e bloqueio automático de escrita em modo autônomo.
2. **CapabilityResolver**: Introduzido para calcular o conjunto estrito e mínimo de capacidades exigidas por cada operação (ex: `discovery.extract-business-context` requer a skill `business-context-extraction` e **zero** ferramentas).
3. **KnowledgeRetriever Contract**: Contrato padronizado para recuperação de contexto com validação mandatória de isolamento de tenant (`TENANT_MISMATCH`).
4. **ProtocolAdapter (MCP-Ready)**: Ponto de extensão agnóstico para suporte futuro a protocolos padronizados de ferramentas sem acoplamento a SDKs externos desnecessários.

## Consequências
- **Positivas**: Governança granular de competências e ferramentas; segurança reforçada contra escalação de privilégios ou vazamento de tenant; rastreabilidade completa no AI Trace.
- **Negativas**: Aumento estrutural do framework, exigindo registro explícito de cada skill e ferramenta.
