# Relatório de Auditoria Independente — TEST GATE AF01-R1.1

**Data:** 17/08/2026  
**Auditor:** QA Sênior / Auditoria Independente de Qualidade  
**Status do Gate:** **APROVADO**

---

## 1. Typecheck e Verificação Estática

Comando executado:
```bash
npm run typecheck
```
- **Erros de tipo:** `0`
- **TypeScript `--noEmit`:** Concluído com sucesso (0 erros de compilação).

---

## 2. Auditoria de Métricas de Tokens

Mapeamento de todas as atribuições em tempo de execução produtivo (`server.ts`, `src/`):

| Localização / Fluxo | Campo | Classificação | Valor na Ausência de Provider |
| :--- | :--- | :--- | :--- |
| `server.ts:2919-2922` (Agent Runtime) | `tokens, inputTokens, outputTokens, cachedTokens` | `PROVIDER_REAL` ou `NULL` | `null` |
| `server.ts:3077-3080` (`/api/discovery/extract-context`) | `tokens, inputTokens, outputTokens, cachedTokens` | `NULL` | `null` |
| `server.ts:3669-3672` (`/api/discovery/interpret-response`) | `tokens, inputTokens, outputTokens, cachedTokens` | `NULL` | `null` |
| `server.ts:3761-3764` (`/api/observability/ai-usage`) | `totalTokens` | `NULL` | `null` (quando sem medições reais) |
| `server.ts:4410-4413` (`/api/organization/synthesis`) | `tokens, inputTokens, outputTokens, cachedTokens` | `NULL` | `null` |
| `server.ts:4637-4640` (`/api/systems/synthesis`) | `tokens, inputTokens, outputTokens, cachedTokens` | `NULL` | `null` |

**Resultado:**
- `HARDCODED = 0`
- `ESTIMATED = 0`
- `fake_token_metrics = 0`

---

## 3. Auditoria de Custos de IA

| Localização / Fluxo | Campo | Classificação | Valor na Ausência de Cálculo Real |
| :--- | :--- | :--- | :--- |
| `server.ts:2542-2554` (`/api/observability/costs`) | `estimatedCost` | `REAL_CALCULATION` | Baseado em `quantity * unitPrice` de infraestrutura |
| `server.ts:2925` (Agent Execution) | `cost` | `NULL` | `null` |
| `server.ts:3083` (Discovery Context Extraction) | `cost` | `NULL` | `null` |
| `server.ts:3673` (Interpret Free Response) | `cost` | `NULL` | `null` |
| `server.ts:3764, 3770` (Observability AI Usage) | `estimatedCost` | `NULL` | `null` (quando sem medições reais) |
| `server.ts:4414` (Organization Synthesis) | `cost` | `NULL` | `null` |
| `server.ts:4641` (Systems Synthesis) | `cost` | `NULL` | `null` |

**Resultado:**
- `HARDCODED = 0`
- `fake_cost_metrics = 0`

---

## 4. Auditoria de Níveis de Confiança (Confidence)

| Localização / Componente | Tratamento de Fallback | Comportamento com `confidence = null` | Comportamento com `confidence = 72` |
| :--- | :--- | :--- | :--- |
| `src/components/BusinessContextView.tsx:287` | Eliminado fallback `|| 85` / `|| 90` | Exibe `"Não calculada"` | Exibe `"72%"` |
| `src/components/BusinessContextView.tsx:465-468` | Eliminado fallback arbitrário | Exibe `"Não calculada"` / `"Sem cálculo disponível"` | Exibe `"72%"` / `"Calculado deterministicamente"` |
| `server.ts:3698` (Executive Summary) | Nullish coalescing para `null` | Retorna `null` | Retorna `72` |
| `server.ts:2966, 3032, 3155` (Discovery Session) | Cálculo real algorítmico | Média ponderada determinística das 8 dimensões avaliadas | Reflete cálculo das dimensões |

**Resultado:**
- `fake_ai_confidence = 0`

---

## 5. Débitos Mapeados para AF01-R2 (Controle de Modelos)

Ocorrências de nomes de modelos hardcoded mapeadas para migração/centralização exclusiva na etapa `AF01-R2`:
- `src/ai/config/AIConfig.ts:5` (`gemini-2.5-flash`)
- `src/ai/config/AIConfig.ts:6` (`gemini-2.5-flash`)

**Total de ocorrências para AF01-R2:**
- `hardcoded_model_names = 2`

---

## 6. Resultados da Bateria de Testes

| Bateria de Testes | Comando | Arquivos | Testes Executados | Status |
| :--- | :--- | :--- | :--- | :--- |
| **Unit Tests** | `npm run test:unit` | 12 arquivos | 67 testes | **PASSOU (67/67)** |
| **Integration Tests** | `npm run test:integration` | 13 arquivos | 69 testes | **PASSOU (69/69)** |
| **Frontend Tests** | `npm run test:frontend` | 6 arquivos | 10 testes | **PASSOU (10/10)** |
| **Production Build** | `npm run build` | - | - | **PASSOU (Compilado)** |

---

## 7. Quadro Consolidado de Métricas

```text
type_errors = 0
async_password_defects = 0
mock_production_paths = 0
fake_token_metrics = 0
fake_cost_metrics = 0
fake_ai_confidence = 0
fake_ai_claims = 0

hardcoded_model_names = 2 (registrado para AF01-R2)

unit_tests = 67 passed (12 test files)
integration_tests = 69 passed (13 test files)
frontend_tests = 10 passed (6 test files)
build = verde
```

---

## Conclusão da Auditoria

### **APROVADO**
Todos os critérios do TEST GATE AF01-R1.1 foram cumpridos integralmente.
