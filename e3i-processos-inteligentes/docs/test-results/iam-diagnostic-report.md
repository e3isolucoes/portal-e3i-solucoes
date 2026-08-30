# E³I — Relatório de Diagnóstico IAM & GCP

**Data/Hora:** 2026-08-11T01:32:29.943Z

## Identidade e Autenticação (ADC)
- **Principal:** Desconhecido
- **Tipo de Cliente:** Compute
- **GOOGLE_APPLICATION_CREDENTIALS:** NÃO

## Projetos Detectados
- **Resource Project:** gen-lang-client-0360031080
- **ADC Project:** Não detectado
- **Quota Project:** gen-lang-client-0360031080
- **Error Project Relacionado:** 453000302319

## Firestore
- **Cliente Inicializado:** SIM
- **Project ID Efetivo:** gen-lang-client-0360031080
- **Database ID:** (default)
- **Acesso a Coleções (Listagem):** FALHA
- **Erro / Detalhes:** `7 PERMISSION_DENIED: Missing or insufficient permissions.`

## BigQuery
- **Cliente Inicializado:** SIM
- **Project ID Efetivo:** gen-lang-client-0360031080
- **Dataset Alvo:** e3i_analytics
- **Verificação de Dataset:** false
- **Erro / Detalhes:** `Caller does not have required permission to use project gen-lang-client-0360031080. Grant the caller the roles/serviceusage.serviceUsageConsumer role, or a custom role with the serviceusage.services.use permission, by visiting https://console.developers.google.com/iam-admin/iam?project=gen-lang-client-0360031080 and then retry. Propagation of the new permission may take a few minutes.`
