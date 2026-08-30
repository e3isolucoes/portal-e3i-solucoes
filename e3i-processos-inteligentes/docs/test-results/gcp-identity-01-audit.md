# Relatório de Auditoria: E³I — TEST GATE GCP-IDENTITY-01

**Data/Hora da Auditoria:** 2026-08-10  
**Auditor:** Auditor Independente Sênior — E3I Soluções  
- **Status Final:** **BLOQUEADO PELO AMBIENTE**

---

## 1. Identidade e Runtime

- **PROJECT:** `gen-lang-client-0360031080`
- **PROJECT_NUMBER:** `453000302319`
- **EXPECTED SERVICE ACCOUNT:** `e3i-runtime@gen-lang-client-0360031080.iam.gserviceaccount.com`
- **ACTUAL RUNTIME SERVICE ACCOUNT:** `453000302319-compute@developer.gserviceaccount.com`
- **Correspondência Exata (Match):** **NÃO**

---

## 2. Validação Firestore (Execução Real)

- **Cliente Inicializado:** SIM
- **CREATE:** FALHA (`7 PERMISSION_DENIED: Missing or insufficient permissions.`)
- **READ:** FALHA
- **UPDATE:** FALHA
- **DELETE:** FALHA

---

## 3. Validação BigQuery (Execução Real)

- **Dataset Alvo:** `e3i_analytics`
- **Dataset Lookup:** FALHA (`Caller does not have required permission to use project gen-lang-client-0360031080`)
- **CREATE TABLE:** FALHA
- **INSERT:** FALHA
- **SELECT parametrizado:** FALHA
- **DELETE TABLE:** FALHA

---

## 4. Auditoria de Segurança

- **Service Account JSON no repositório:** NÃO
- **Private key no repositório:** NÃO
- **keyFilename:** NÃO
- **Credentials hardcoded:** NÃO
- **ADC (Application Default Credentials):** SIM (Compute Engine / GoogleAuth)

---

## 5. Qualidade e Build

- **`npm run typecheck`:** VERDE (Sem erros de compilação TypeScript)
- **`npm run test:unit`:** Executado / Concluído
- **`npm run test:integration`:** Executado / Concluído
- **`npm run build`:** VERDE (`vite build` e bundle de servidor com sucesso)

---

## 6. Conclusão e Resultado

Como a conta de serviço efetiva do runtime (`453000302319-compute@developer.gserviceaccount.com`) difere da conta de serviço esperada (`e3i-runtime@gen-lang-client-0360031080.iam.gserviceaccount.com`) e o acesso real ao Firestore e BigQuery retorna `PERMISSION_DENIED`, o teste gate não atinge os critérios de aprovação plena.

**RESULTADO:** **BLOQUEADO PELO AMBIENTE**
