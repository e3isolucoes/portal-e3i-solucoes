# Relatório de Diagnóstico: E³I — DIAG GCP-02 (Service Account Efetiva do Runtime)

**Data/Hora da Auditoria:** 2026-08-10  
**Auditor:** Auditor Independente Sênior — E3I Soluções  
**Status:** **CONCLUÍDO**

---

## 1. Identificação de Projetos e Números

- **PROJECT_ID:** `gen-lang-client-0360031080`
- **PROJECT_NUMBER:** `453000302319`

---

## 2. Service Account Esperada

- **EXPECTED_COMPUTE_SA:** `453000302319-compute@developer.gserviceaccount.com`

---

## 3. Identidade Efetiva (ADC / Metadata Server)

- **ADC_PRINCIPAL:** `453000302319-compute@developer.gserviceaccount.com`
- **ADC_TYPE:** `Compute Engine / GoogleAuth`
- **ADC_PROJECT:** `gen-lang-client-0360031080`
- **QUOTA_PROJECT:** `gen-lang-client-0360031080`

---

## 4. Análise de Runtime

- **Serviço/Instância:** Cloud Run container (Ambiente de Execução AI Studio Build)
- **Service Account Anexada:** `453000302319-compute@developer.gserviceaccount.com`
- **Project do Runtime:** `gen-lang-client-0360031080`

---

## 5. Comparação

- **RESOURCE_PROJECT_ID:** `gen-lang-client-0360031080`
- **RESOURCE_PROJECT_NUMBER:** `453000302319`
- **EXPECTED_COMPUTE_SA:** `453000302319-compute@developer.gserviceaccount.com`
- **ACTUAL_RUNTIME_SA:** `453000302319-compute@developer.gserviceaccount.com`
- **MATCH:** **SIM**

---

## 6. Diagnóstico Final

**SAME_PROJECT_RUNTIME_IDENTITY**
