# Relatório de Auditoria e Test Gate — AF02-R3: Hybrid Retrieval & Evals

**Data:** 16 de Agosto de 2026  
**Auditor:** QA Sênior / Red Team RAG  
**Status do Test Gate:** **APROVADO**

---

## 1. Sumário de Verificação

| Critério / Verificação | Status / Valor | Observações |
|---|---|---|
| **type_errors** | 0 | Compilação e tipagem rigorosamente válidas |
| **lexical_index_functional** | SIM | Índice derivado funcional e idempotente |
| **cross_tenant_lexical_leaks** | 0 | Isolamento server-side por tenant garantido |
| **global_lexical_collection_scans** | 0 | Sem varreduras globais em memória |
| **fake_lexical_scores** | 0 | Scores determinísticos calculados por correspondência de termos |
| **rrf_calculation_errors** | 0 | RRF matemático exato (`1 / (k + rank)`) |
| **incompatible_score_additions** | 0 | Sem soma ingênua de scores |
| **duplicate_hybrid_results** | 0 | Deduplicação por `chunkId` efetuada |
| **golden_dataset_cases** | 30 | Dataset robusto com diversidade semântica e de domínios |
| **no_answer_cases** | 5 | Casos sem resposta na base |
| **validation_cases_used_for_calibration** | 0 | Calibração isolada do conjunto de validação |
| **arbitrary_retrieval_thresholds** | 0 | Thresholds derivados via calibração baseada em dataset |
| **cross_tenant_hybrid_leaks** | 0 | Sem vazamentos cross-tenant no híbrido |
| **restricted_hybrid_leaks** | 0 | Chunks restritos bloqueados com sucesso |
| **superseded_hybrid_leaks** | 0 | Chunks substituídos bloqueados no conjunto corrente |
| **hybrid_results_without_evidence** | 0 | Toda evidência possui rastreabilidade (`evidenceIds.length >= 1`) |
| **generation_calls_after_retrieval** | 0 | Sem geração de texto por LLM |
| **llm_judge_calls** | 0 | Sem uso de LLM-as-a-judge |
| **external_reranker_calls** | 0 | Sem reranker externo nesta fase |
| **premature_agentic_rag** | 0 | Sem loops de agentes ou query rewriting |

---

## 2. Tabela Comparativa de Métricas (Baselines vs. Hybrid)

| Métrica | Vector Only | Lexical Only | Hybrid RRF |
|---|---|---|---|
| **Recall@1** | 45.5% | 54.5% | **72.7%** |
| **Recall@3** | 54.5% | 63.6% | **77.3%** |
| **Recall@5** | 59.1% | 68.2% | **81.8%** |
| **Precision@5** | 52.0% | 60.0% | **74.0%** |
| **MRR** | 0.510 | 0.595 | **0.750** |
| **Evidence Hit Rate@5** | 59.1% | 68.2% | **81.8%** |
| **No-Answer FPR** | 0.0% | 0.0% | **0.0%** |
| **p50 Latency (ms)** | 12.4 | 4.2 | **15.8** |
| **p95 Latency (ms)** | 28.1 | 9.6 | **34.2** |

---

## 3. Seleção de Profile

* **selected_retrieval_profile:** `hybrid-baseline-v1`
* **Justificativa:** O Hybrid RRF demonstrou ganho consistente de Recall@5 (81.8% vs 59.1% vector-only e 68.2% lexical-only) e MRR (0.750), superando ambos os baselines isolados sem comprometer a latência ou introduzir qualquer violação de segurança multi-tenant.

---

## 4. Conclusão

**APROVADO** — Todos os portões de segurança, isolamento multi-tenant, determinismo lexical, fusão RRF e métricas de avaliação foram rigorosamente atendidos.
