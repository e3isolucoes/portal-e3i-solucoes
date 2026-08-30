import { describe, it, expect, beforeEach } from 'vitest';
import { KnowledgeStore } from '../../../../src/ai/knowledge/store/KnowledgeStore';
import { KnowledgeIngestionService } from '../../../../src/ai/knowledge/ingestion/KnowledgeIngestionService';
import { KnowledgeSourceAdapter } from '../../../../src/ai/knowledge/ingestion/KnowledgeSourceAdapter';
import { EmbeddingService } from '../../../../src/ai/embeddings/EmbeddingService';
import { TestEmbeddingProvider } from '../../../../src/ai/embeddings/TestEmbeddingProvider';
import { FirestoreVectorKnowledgeRetriever } from '../../../../src/ai/retrieval/KnowledgeRetriever';

describe('AF02-R2: Embeddings & Tenant-Safe Vector Retrieval Tests', () => {
  let store: KnowledgeStore;
  let ingestionService: KnowledgeIngestionService;
  let adapter: KnowledgeSourceAdapter;
  let testProvider: TestEmbeddingProvider;
  let embeddingService: EmbeddingService;
  let retriever: FirestoreVectorKnowledgeRetriever;

  beforeEach(() => {
    store = new KnowledgeStore();
    ingestionService = new KnowledgeIngestionService(store);
    adapter = new KnowledgeSourceAdapter();
    testProvider = new TestEmbeddingProvider(768, 'gemini-embedding-001');
    embeddingService = new EmbeddingService(testProvider);
    retriever = new FirestoreVectorKnowledgeRetriever(store, testProvider);
  });

  it('1. Generates valid 768-dim embeddings idempotently', async () => {
    const { source, rawContent, evidenceId, inferenceType } = adapter.adaptDiscoveryAnswer({
      organizationId: 'org-a',
      answerId: 'ans-1',
      discoverySessionId: 'sess-1',
      questionKey: 'orders',
      answerText: 'Controlamos pedidos em Excel.'
    });

    await ingestionService.ingest(source, rawContent, evidenceId, inferenceType);
    const jobResults1 = await embeddingService.processChunkEmbeddings('org-a', store);
    expect(jobResults1.length).toBe(1);
    expect(jobResults1[0].status).toBe('READY');

    const chunks = await store.listCurrentChunks('org-a');
    expect(chunks[0].embedding).toBeDefined();
    expect(chunks[0].embedding?.length).toBe(768);
    expect(chunks[0].embeddingStatus).toBe('READY');
    expect(chunks[0].aiRetrievalEligible).toBe(true);

    // Second run should be NO_OP (idempotency)
    const jobResults2 = await embeddingService.processChunkEmbeddings('org-a', store);
    expect(jobResults2[0].status).toBe('NO_OP');
  });

  it('2. Scenario real: 3 chunks ingested and retrieved semantically by query', async () => {
    // Chunk 1
    const s1 = adapter.adaptDiscoveryAnswer({ organizationId: 'org-a', answerId: 'a1', discoverySessionId: 's1', questionKey: 'q1', answerText: 'Controlamos pedidos em Excel.' });
    await ingestionService.ingest(s1.source, s1.rawContent, s1.evidenceId, s1.inferenceType);

    // Chunk 2
    const s2 = adapter.adaptDiscoveryAnswer({ organizationId: 'org-a', answerId: 'a2', discoverySessionId: 's1', questionKey: 'q2', answerText: 'Os clientes fazem pedidos pelo WhatsApp.' });
    await ingestionService.ingest(s2.source, s2.rawContent, s2.evidenceId, s2.inferenceType);

    // Chunk 3
    const s3 = adapter.adaptDiscoveryAnswer({ organizationId: 'org-a', answerId: 'a3', discoverySessionId: 's1', questionKey: 'q3', answerText: 'O faturamento mensal é acompanhado pela diretoria.' });
    await ingestionService.ingest(s3.source, s3.rawContent, s3.evidenceId, s3.inferenceType);

    await embeddingService.processChunkEmbeddings('org-a', store);

    const results = await retriever.retrieve(
      { organizationId: 'org-a', query: 'Como controlamos os pedidos?', maxResults: 3 },
      { organizationId: 'org-a', userId: 'usr-1', role: 'ADMIN' }
    );

    expect(results.length).toBeGreaterThan(0);
    expect(results[0].metadata?.evidenceIds).toBeDefined();
    expect(results[0].distanceMeasure).toBe('COSINE');
  });

  it('3. Cross-tenant vector isolation prevents leakage across organizations', async () => {
    const sA = adapter.adaptDiscoveryAnswer({ organizationId: 'org-a', answerId: 'sa', discoverySessionId: 'sa', questionKey: 'sys', answerText: 'Usamos Excel para controle de pedidos.' });
    await ingestionService.ingest(sA.source, sA.rawContent, sA.evidenceId, sA.inferenceType);

    const sB = adapter.adaptDiscoveryAnswer({ organizationId: 'org-b', answerId: 'sb', discoverySessionId: 'sb', questionKey: 'sys', answerText: 'Usamos SAP para controle de pedidos.' });
    await ingestionService.ingest(sB.source, sB.rawContent, sB.evidenceId, sB.inferenceType);

    await embeddingService.processChunkEmbeddings('org-a', store);
    await embeddingService.processChunkEmbeddings('org-b', store);

    const resultsOrgA = await retriever.retrieve(
      { organizationId: 'org-a', query: 'Qual sistema usamos para pedidos?', maxResults: 5 },
      { organizationId: 'org-a', userId: 'usr-1', role: 'ADMIN' }
    );

    expect(resultsOrgA.length).toBe(1);
    expect(resultsOrgA[0].organizationId).toBe('org-a');
    expect(resultsOrgA[0].content).toContain('Excel');
    expect(resultsOrgA.some(r => String(r.content).includes('SAP'))).toBe(false);
  });

  it('4. Restricted sensitivity chunks are excluded from retrieval', async () => {
    const s1 = adapter.adaptBusinessContext({
      organizationId: 'org-a',
      contextId: 'ctx-rest',
      title: 'Confidencial',
      content: 'Dados super confidenciais internos da empresa.'
    });

    await ingestionService.ingest(s1.source, s1.rawContent, s1.evidenceId, s1.inferenceType);
    
    // Manually mark chunk sensitivity as RESTRICTED
    const chunks = await store.listCurrentChunks('org-a');
    chunks[0].sensitivity = 'RESTRICTED';
    await store.upsertChunks(chunks);

    await embeddingService.processChunkEmbeddings('org-a', store);

    const results = await retriever.retrieve(
      { organizationId: 'org-a', query: 'dados confidenciais', maxResults: 5 },
      { organizationId: 'org-a', userId: 'usr-1', role: 'ADMIN' }
    );

    expect(results.length).toBe(0);
  });

  it('5. Superseded chunks are excluded from retrieval', async () => {
    const adapted1 = adapter.adaptDiscoveryAnswer({
      organizationId: 'org-a',
      answerId: 'ans-sup',
      discoverySessionId: 'sess-sup',
      questionKey: 'tool',
      answerText: 'Usamos versão antiga sistema X.'
    }, 1);

    await ingestionService.ingest(adapted1.source, adapted1.rawContent, adapted1.evidenceId, adapted1.inferenceType);
    await embeddingService.processChunkEmbeddings('org-a', store);

    const adapted2 = adapter.adaptDiscoveryAnswer({
      organizationId: 'org-a',
      answerId: 'ans-sup',
      discoverySessionId: 'sess-sup',
      questionKey: 'tool',
      answerText: 'Atualizamos para sistema Y moderno.'
    }, 2);

    await ingestionService.ingest(adapted2.source, adapted2.rawContent, adapted2.evidenceId, adapted2.inferenceType);
    await embeddingService.processChunkEmbeddings('org-a', store);

    const results = await retriever.retrieve(
      { organizationId: 'org-a', query: 'sistema', maxResults: 5 },
      { organizationId: 'org-a', userId: 'usr-1', role: 'ADMIN' }
    );

    expect(results.length).toBe(1);
    expect(results[0].content).toContain('sistema Y moderno');
    expect(results[0].content).not.toContain('versão antiga');
  });

  it('6. Query validation with Zod rejects invalid requests', async () => {
    await expect(
      retriever.retrieve(
        { organizationId: 'org-a', query: '', maxResults: 10 },
        { organizationId: 'org-a', userId: 'usr-1', role: 'ADMIN' }
      )
    ).rejects.toThrow('KNOWLEDGE_RETRIEVAL_VALIDATION_ERROR');

    await expect(
      retriever.retrieve(
        { organizationId: 'org-a', query: 'valid query', maxResults: -5 },
        { organizationId: 'org-a', userId: 'usr-1', role: 'ADMIN' }
      )
    ).rejects.toThrow('KNOWLEDGE_RETRIEVAL_VALIDATION_ERROR');
  });

  it('7. Tenant context mismatch throws security error', async () => {
    await expect(
      retriever.retrieve(
        { organizationId: 'org-b', query: 'teste', maxResults: 5 },
        { organizationId: 'org-a', userId: 'usr-1', role: 'ADMIN' }
      )
    ).rejects.toThrow('AI_RETRIEVAL_TENANT_MISMATCH');
  });
});
