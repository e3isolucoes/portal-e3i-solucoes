# Documentação Operacional: Migrações de Banco de Dados

## 1. Princípios e Regras
- Todas as migrações devem ser versionadas de forma imutável (ex: Drizzle ORM / SQL files).
- **Nunca** utilizar `db push` em ambientes de produção.
- Executar backup completo com validação de checksum antes de qualquer migration destrutiva.
- Impedir execuções concorrentes de migrations através de locks transacionais ou controle de orquestração.
- Registrar o resultado da migração na auditoria (`MIGRATION_STARTED`, `MIGRATION_SUCCEEDED`, `MIGRATION_FAILED`).

## 2. Procedimento de Execução
1. Validar a migração em ambiente de teste (`npm run test:integration`).
2. Executar o backup preventivo.
3. Aplicar a migração no ambiente de destino (Development -> Staging -> Production).
4. Validar o readiness probe (`/api/health/ready`).
