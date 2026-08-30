# Arquitetura de Fundação RAG — E³I Processos Inteligentes

## Visão Geral

A arquitetura de fundação RAG da E³I fundamenta-se no princípio de que **RAG não começa no banco vetorial, mas sim em dados confiáveis, proveniência, isolamento multi-tenant, versionamento e chunking determinístico.**

---

## Componentes da Camada de Conhecimento (`src/ai/knowledge/`)

1. **Schemas (`schemas/`)**:
   - `KnowledgeSource`: Contrato descritivo da fonte (ID, organizationId, sourceType, version, status, trustLevel, sensitivity, timestamps).
   - `KnowledgeDocument`: Representação normalizada intermediária no pipeline de ingestão.
   - `KnowledgeChunk`: Unidade atômica de conhecimento contendo hash SHA-256, índice, metadados e `evidenceIds`.

2. **Ingestão (`ingestion/`)**:
   - `KnowledgeSourceAdapter`: Adaptadores para fontes reais (Discovery Answers e Business Context).
   - `KnowledgeNormalizer`: Normalização determinística e sanitização de segredos em nível de entrada.
   - `KnowledgeIngestionService`: Serviço orquestrador idempotente com versionamento e tratamento de falhas transacionais.

3. **Chunking (`chunking/`)**:
   - `ChunkingPolicy`: Configuração central (`KNOWLEDGE_CHUNK_TARGET_SIZE`, `KNOWLEDGE_CHUNK_MAX_SIZE`, `KNOWLEDGE_CHUNK_OVERLAP`).
   - `KnowledgeChunker`: Fragmentação determinística preservando ordem e proveniência, evitando fragmentação trivial de textos curtos.

4. **Armazenamento (`store/`)**:
   - `KnowledgeStore` / `KnowledgeRepository`: Repositório resiliente multi-tenant compatível com a persistência operacional (Firestore / SQLite / InMemory).

5. **Segurança (`security/`)**:
   - `KnowledgeAccessPolicy`: Políticas estritas de acesso por tenant, status (`ACTIVE` vs `SUPERSEDED`), e sensibilidade (`RESTRICTED`).

---

## Status de Implementação (AF02-R1)

- **Embeddings**: `NOT IMPLEMENTED` (Aguardando AF02-R2)
- **Vector Retrieval**: `NOT IMPLEMENTED` (Aguardando AF02-R2)
- **Hybrid Retrieval**: `NOT IMPLEMENTED` (Aguardando AF02-R2)
- **RAG Real**: `NOT IMPLEMENTED` (Foco estrito em Ingestão, Proveniência e Governança)
- **Agentic RAG**: `NOT IMPLEMENTED`
