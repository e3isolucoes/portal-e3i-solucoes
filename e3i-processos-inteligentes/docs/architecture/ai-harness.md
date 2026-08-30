# E³I AI Harness Architecture

## 1. Overview

O **AI Harness** é o componente central de orquestração de Inteligência Artificial da plataforma E³I Processos Inteligentes. Ele estabelece uma fronteira rigorosa entre a lógica de negócios da aplicação e os provedores de modelos de linguagem (LLMs).

```text
Business Route (/api/discovery/extract-context)
       ↓
   AIHarness
   ├── 1. AIPolicyEngine (Feature Flag, TenantContext, Autonomia, Budget)
   ├── 2. PromptRegistry (Resolução do Prompt e Versão Ativa)
   ├── 3. Input Validation (Zod)
   ├── 4. ContextCompiler (Compilação, Isolamento Multi-Tenant, Higienização)
   ├── 5. ModelRouter (Resolução determinística de ModelProfile)
   ├── 6. ModelProvider / GeminiProvider (@google/genai SDK)
   ├── 7. Output Validation (Zod Schema obrigatório)
   └── 8. AITraceRecorder (Observabilidade com métricas reais de tokens e latência)
```

## 2. Princípios Fundamentais

1. **Separação de Instruções e Dados**: O modelo recebe instruções de sistema em `systemInstruction` e dados estruturados em `userContent`.
2. **Saída Estruturada Obrigatória (Structured Output)**: Toda chamada de modelo utiliza `responseSchema` validado com Zod. Saídas inválidas disparam `AI_OUTPUT_VALIDATION_ERROR` e são rejeitadas.
3. **Isolamento Estrito de Tenant**: `organizationId` e `userId` vêm exclusivamente da autenticação/sessão de backend.
4. **Métricas Factualmente Reais**: Não há métricas sintéticas, tokens inventados ou custos estimados fixos. Quando o provedor não reporta tokens, o valor registrado é `null`.
5. **Roteamento Determinístico**: O `ModelRouter` mapeia perfis (`FAST`, `BALANCED`) diretamente para os modelos configurados em `AIConfig` sem chamadas auxiliares de LLM.
