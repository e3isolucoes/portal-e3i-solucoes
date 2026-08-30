# Arquitetura de Fundação de IA (E³I AF01-R2, AF01-R3 & AF01-R4)

## 1. Visão Geral
A arquitetura de Inteligência Artificial da E³I estabelece um pipeline robusto, determinístico, auditável e seguro para a execução de operações baseadas em LLM (Gemini), utilizando tipagem estrita com Zod, isolamento estrito de contexto de tenant, política determinística, Context Compiler, sanitização de segredos, rastreabilidade de evidências, AI Harness e a camada de capacidades (Skills, Tools, Capability Resolver, Knowledge Retriever e Protocol Adapter).

## 2. Fluxo de Execução Oficial (AF01-R4)
```
Use Case / Rota
  ↓
AIHarness
  ↓
AIPolicyEngine (Validação determinística de tenant, budget e autonomia)
  ↓
CapabilityResolver (Resolução de Skills e Tools mínimas exigidas pela operação - Least Capability)
  ↓
ContextCompiler (Compilação restrita, isolamento de tenant, sanitização e budget)
  ↓
PromptRegistry (Gestão e validação de versionamento de prompts)
  ↓
ModelRouter (Roteamento determinístico por ModelProfile: FAST / BALANCED)
  ↓
ModelProvider / GeminiProvider (Adapter isolado para @google/genai com separação de instruções e dados)
  ↓
Zod (Validação rigorosa de Structured Output)
  ↓
Evidence & Provenance (Rastreabilidade factual)
  ↓
AITraceRecorder (Observabilidade sem vazamento de segredos)
```

## 3. Componentes Principais
- **AIConfig (`src/ai/config/AIConfig.ts`)**: Centraliza as configurações de features, provider e modelos.
- **AIPolicyEngine (`src/ai/security/AIPolicyEngine.ts`)**: Motor de política determinístico que valida tenant, membership, budget e limites de autonomia (Max Autonomy = RECOMMEND).
- **SkillRegistry & SkillResolver (`src/ai/skills/`)**: Gerencia competências, versões e validação de permissões baseadas em `PermissionCode`.
- **ToolRegistry & ToolExecutor (`src/ai/tools/`)**: Gerencia ferramentas com validação Zod de entrada/saída, restrições de side-effects (`READ`), isolamento de tenant e bloqueio autônomo de escritas.
- **CapabilityResolver (`src/ai/capabilities/`)**: Resolve o conjunto estrito e mínimo de capacidades (Skills e Tools) exigidas por cada operação (Princípio da Menor Capacidade).
- **KnowledgeRetriever (`src/ai/retrieval/`)**: Contrato seguro de recuperação de conhecimento com validação estrita de isolamento de tenant (`TENANT_MISMATCH`).
- **ProtocolAdapter (`src/ai/protocols/`)**: Ponto de extensão para interoperabilidade futura (MCP-ready).
- **ContextCompiler (`src/ai/context/ContextCompiler.ts`)**: Compila somente o contexto estritamente necessário, aplicando isolamento de tenant rigoroso (`TENANT_MISMATCH`), sanitização de segredos e controle de orçamento de tokens.
- **SecretSanitizer (`src/ai/security/SecretSanitizer.ts`)**: Remove campos sensíveis (senhas, hashes, tokens, chaves de API) antes de chegar ao provider.
- **ContentTrustClassifier (`src/ai/security/ContentTrustClassifier.ts`)**: Classifica o nível de confiança e impede que conteúdos externos não confiáveis sejam elevados a system trusted.
- **EvidenceCollector (`src/ai/evidence/EvidenceCollector.ts`)**: Coleta referências de evidências factuais atreladas à organização.
- **AITraceRecorder (`src/ai/observability/AITraceRecorder.ts`)**: Registra metadados de execução preservando a privacidade (sem armazenar texto integral do usuário ou segredos).
- **AIHarness (`src/ai/core/AIHarness.ts`)**: Pipeline oficial integrando política, resolução de capacidades, compilação de contexto, prompt registry, model router, provider e output validation.

## 4. Operações e Ferramentas Registradas
- `discovery.extract-business-context` (v1): Extração estruturada de produtos/serviços, segmentos de clientes, sistemas mencionados e controles manuais com a skill `business-context-extraction` e zero ferramentas desnecessárias.
- `business-context.get-confirmed-facts` (v1): Ferramenta interna e exclusiva de leitura (`READ`) de fatos confirmados do negócio escopada estritamente ao tenant.

## 5. Escopo NÃO Implementado (Conforme Diretrizes)
Os seguintes módulos e capacidades **NÃO** estão implementados:
- RAG Vetorial Avançado & Embeddings / Vector Store
- Agent Runtime (Planner / ReAct / Autonomous Loops)
- Protocolos de execução autônoma (A2A, AG-UI)

