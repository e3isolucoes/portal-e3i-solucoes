# ADR-AI-002: Model Gateway e AI Harness com Validação Estruturada Zod

## Status
Aceito

## Contexto
A plataforma E³I requer infraestrutura de IA corporativa com isolamento multi-tenant rigoroso, garantias de não-alucinação em extrações de contexto e métricas factuais auditáveis. Anteriormente, chamadas inline ou mockadas podiam gerar inconsistências e débitos técnicos.

## Decisão
Implementar a infraestrutura de IA baseada no pipeline `AIHarness`:
1. Centralizar configuração de IA em `AIConfig`, lendo variáveis de ambiente `GEMINI_MODEL_FAST` e `GEMINI_MODEL_BALANCED` sem hardcoding no código-fonte.
2. Utilizar `PromptRegistry` para versionamento de prompts com esquemas de entrada e saída Zod.
3. Roteamento determinístico de modelos via `ModelRouter` sem custo adicional de LLM para decisão de rota.
4. Provedor oficial `GeminiProvider` utilizando `@google/genai` com timeout explícito e tipagem de erros (`AIProviderTimeoutError`, `AIProviderError`).
5. Validação rigorosa de output com Zod (`AIOutputValidationError`).
6. Migração da rota `POST /api/discovery/extract-context` para utilizar exclusivamente o `AIHarness`.

## Consequências
- **Positivas**:
  - Garantia de formato e tipo em todas as respostas de IA.
  - Eliminação de métricas sintéticas ou estimativas artificiais de tokens.
  - Isolamento seguro de tenants via contexto de sessão validado no backend.
  - Resiliência contra timeouts e falhas de provedor com códigos HTTP semânticos (502, 503, 504).
