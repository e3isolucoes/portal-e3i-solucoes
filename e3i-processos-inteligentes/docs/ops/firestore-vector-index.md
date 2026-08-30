# Documentação Operacional: Firestore Vector Index (AF02-R2)

**Data:** 16 de Agosto de 2026  
**Sistema:** E³I Processos Inteligentes SaaS  
**Componente:** Cloud Firestore Vector Search / Nearest Neighbor Index

---

## 1. Visão Geral da Arquitetura Vetorial

A E³I Processos Inteligentes utiliza o Cloud Firestore para armazenamento e indexação vetorial de chunks de conhecimento (`KnowledgeChunk`).  
Os vetores são gerados pelo modelo `gemini-embedding-001` via Vertex AI SDK (`@google/genai`) com dimensionalidade fixa de **768** e métrica de distância **COSINE**.

---

## 2. Especificações do Índice

* **Database ID:** `(default)` (ou banco Firestore dedicado configurado no projeto GCP)
* **Collection Group / Collection:** `knowledge_chunks` (ou equivalente na arquitetura de persistência)
* **Campo Vetorial:** `embedding`
* **Dimensionalidade:** `768`
* **Métrica de Distância (Distance Measure):** `COSINE`
* **Campos de Pré-Filtro (Pre-Filter / Composite Index Fields):**
  * `organizationId` (ASCENDING)
  * `aiRetrievalEligible` (ASCENDING)
  * `embedding` (VECTOR: COSINE, 768 dimensions)

---

## 3. Comando gcloud para Criação do Índice Vetorial

Caso o índice vetorial precise ser provisionado explicitamente via CLI do Google Cloud (`gcloud`), utilize o seguinte comando:

```bash
gcloud firestore indexes composite create \
  --project=YOUR_GCP_PROJECT_ID \
  --database=\(default\) \
  --collection-group=knowledge_chunks \
  --query-scope=COLLECTION \
  --field-config=field-path=organizationId,order=ascending \
  --field-config=field-path=aiRetrievalEligible,order=ascending \
  --field-config=field-path=embedding,vector-config='{"dimension":768, "metric":"COSINE"}'
```

---

## 4. Verificação de Status do Índice

Para verificar se o índice vetorial está ativo e pronto para consultas de vizinhos mais próximos (`ANN`), execute:

```bash
gcloud firestore indexes composite list \
  --project=YOUR_GCP_PROJECT_ID \
  --database=\(default\)
```

O status deve retornar `READY`. Caso retorne `CREATING`, aguarde a conclusão da indexação no painel do Google Cloud Console.

---

## 5. Garantia de Isolamento Multi-Tenant

O motor de recuperação (`FirestoreVectorKnowledgeRetriever`) garante que o filtro de tenant (`organizationId == tenantContext.organizationId`) e o filtro de elegibilidade (`aiRetrievalEligible == true`) sejam aplicados estritamente server-side antes ou como parte da busca vetorial, prevenindo vazamentos cross-tenant.
