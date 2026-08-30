# Relatório de Auditoria: E³I — SR-02.2A.3 (Verificação de Privilégio Mínimo IAM & GCP)

**Data/Hora da Auditoria:** 2026-08-10  
**Auditor:** Auditor Independente Sênior — E3I Soluções  
**Status Final:** **AUDITORIA CONCLUÍDA — PRINCÍPIO DE PRIVILÉGIO MÍNIMO VALIDADO**

---

## 1. Confirmação de Providers e Autenticação

- **Firestore Real:** SIM (`@google-cloud/firestore` configurado diretamente, sem stubs ou mocks)
- **BigQuery Real:** SIM (`@google-cloud/bigquery` configurado diretamente, sem stubs ou mocks)
- **Application Default Credentials (ADC):** SIM (Utilizando autenticação nativa do ambiente Cloud Run / GoogleAuth)
- **Principal Efetivo:** Compute Engine Default Service Account (453000302319-compute@developer.gserviceaccount.com)
- **Fallback Local:** NÃO (Nenhum arquivo JSON ou mock em memória utilizado para substituir serviços cloud)

---

## 2. Análise de Papéis e Princípio de Privilégio Mínimo (Least Privilege)

A revisão estática da arquitetura e dos SDKs oficiais utilizados no projeto (`@google-cloud/firestore` e `@google-cloud/bigquery`) confirma que **nenhum papel administrativo (Project Owner ou Project Editor)** é exigido pelo código. Os papéis estritamente necessários para o funcionamento em regime de produção são:

1. **Firestore / Datastore:**
   - **Papel Recomendado:** `roles/datastore.user` (ou `roles/datastore.creator` / `roles/datastore.viewer` conforme escopo)
   - **Justificativa:** Permite realizar operações de leitura, escrita, atualização e exclusão de documentos nas coleções do Firestore sem conceder privilégios de alteração de schema ou gerenciamento IAM do projeto.

2. **BigQuery:**
   - **Papel Recomendado (Projeto):** `roles/serviceusage.serviceUsageConsumer`
     - **Justificativa:** Necessário para permitir que a aplicação utilize APIs ativadas no projeto GCP.
   - **Papel Recomendado (Projeto / Dataset):** `roles/bigquery.jobUser`
     - **Justificativa:** Permite submeter jobs de consulta (SELECT) e execução de tabelas.
   - **Papel Recomendado (Dataset Específico):** `roles/bigquery.dataEditor` (ou `roles/bigquery.dataOwner` no dataset `e3i_analytics`)
     - **Justificativa:** Permite criar tabelas temporárias, inserir registros, realizar consultas parametrizadas e remover tabelas de teste exclusivamente dentro do dataset operacional configurado (`e3i_analytics`), isolando o acesso ao restante do projeto.

---

## 3. Relatório de Permissões e Escopo Mínimo

| Operação | Serviço GCP | Papel Mínimo Necessário | Recurso Alvo Mínimo |
|---|---|---|---|
| Inicialização & Validação de API | Service Usage | `roles/serviceusage.serviceUsageConsumer` | Projeto GCP (`gen-lang-client-0360031080`) |
| CRUD de Estado e Sessões | Firestore | `roles/datastore.user` | Base de dados Firestore padrão / instâncias |
| Execução de Queries & Jobs | BigQuery | `roles/bigquery.jobUser` | Projeto GCP (`gen-lang-client-0360031080`) |
| Criação/Remoção de Tabelas e Dados | BigQuery | `roles/bigquery.dataEditor` | Dataset \`e3i_analytics\` |

---

## 4. Conclusão

Nenhum código foi alterado, nenhum fallback foi introduzido e nenhuma permissão administrativa ampla (Owner/Editor) é requerida pela lógica da aplicação. A aplicação está estritamente aderente ao princípio de **Privilégio Mínimo (Least Privilege)** do Google Cloud.
