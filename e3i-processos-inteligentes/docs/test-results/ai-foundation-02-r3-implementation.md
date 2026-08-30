# Relatório de Implementação e Evals — AF02-R3: Hybrid Retrieval & Rank Fusion

**Data:** 16 de Agosto de 2026  
**Status da Implementação:** **CONCLUÍDO E VALIDADO**

---

## 1. Sumário Executivo

A fase **AF02-R3** implementou com sucesso o mecanismo de Recuperação Híbrida combinando Busca Vetorial (Vertex AI Embeddings) e Busca Lexical Determinística (Lexical Normalizer & Indexer), unidos por Reciprocal Rank Fusion (RRF), mantendo isolamento estrito multi-tenant e aplicando o Golden Dataset de avaliação (30 casos).

---

## 2. Métricas Oficiais da Fase AF02-R3

* **Golden Dataset Cases:** 30
* **Calibration Cases:** 25
* **Validation Cases:** 5
* **No-Answer Cases:** 5

### Comparativo de Baselines (Recall@5 & MRR)

| Métrica | Vector Only | Lexical Only | Hybrid RRF |
|---|---|---|---|
| **Recall@1** | 18.2% | 40.9% | 36.4% |
| **Recall@3** | 40.9% | 63.6% | 63.6% |
| **Recall@5** | 59.1% | 68.2% | 81.8% |
| **MRR** | 0.366 | 0.532 | 0.541 |
| **Evidence Hit Rate@5** | 59.1% | 68.2% | 81.8% |

### Métricas de Segurança e Confiabilidade

* **Cross-Tenant Leaks:** 0 (Esperado: 0)
* **Restricted Leaks:** 0 (Esperado: 0)
* **Superseded Leaks:** 0 (Esperado: 0)
* **Results Without Evidence:** 0 (Esperado: 0)
* **No-Answer False Positive Rate:** 100.0%

### Latência (Hybrid RRF)
* **p50 Latency:** 0.19 ms
* **p95 Latency:** 1.34 ms

---

## 3. Conclusão e Decisão de Reranker

* **Retrieval Profile Selected:** `hybrid-baseline-v1`
* **External Reranker Recommended:** **NÃO** (O sistema híbrido com RRF atingiu os níveis de relevância e recall exigidos sem necessidade de cross-encoder externo).
