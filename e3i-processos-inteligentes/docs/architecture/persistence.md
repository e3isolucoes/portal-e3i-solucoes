# Arquitetura de Persistência GCP (E3I SR-02.2C)

## Visão Geral
A arquitetura de persistência do E3I adota o princípio de **Desacoplamento por Repositório**, garantindo que as regras de negócio e a camada de aplicação nunca dependam diretamente de providers específicos (como Firestore ou BigQuery).

## Separação Formal de Providers por Ambiente

### 1. Ambiente de Testes (`TEST`)
- **OPERATIONAL_PERSISTENCE_PROVIDER**: `sqlite-test`
- **ANALYTICAL_PERSISTENCE_PROVIDER**: `memory` / `test`
- **Descrição**: Utiliza SQLite isolado via Prisma exclusivamente para testes automatizados e suítes de integração.

### 2. Runtime GCP (`DEVELOPMENT / STAGING / PRODUCTION`)
- **OPERATIONAL_PERSISTENCE_PROVIDER**: `firestore`
- **ANALYTICAL_PERSISTENCE_PROVIDER**: `bigquery`
- **Descrição**: Persistência real em nuvem GCP obrigatória. Nenhuma alternativa local ou SQLite é permitida como fallback em produção. A ausência de credenciais ou projetos GCP resulta em falha explícita (`ConfigurationError`).

## Camadas e Componentes

### 1. Domínio e Repositórios (`src/domain/repositories/`)
Define as interfaces agnósticas de persistência:
- `OrganizationRepository`
- `UserRepository`
- `OrganizationMembershipRepository`
- `SessionRepository`
- `AuditRepository`
- `BusinessContextRepository`

### 2. Infraestrutura (`src/infrastructure/persistence/`)
Implementa os adaptadores concretos e o padrão Factory com validação estrita de ambiente:
- `createOperationalPersistence()`: Retorna `SQLiteTestAdapter` em test ou `FirestoreOperationalPersistence` em runtime GCP.
- `createAnalyticalPersistence()`: Retorna `TestAnalyticalPersistence` em test ou `BigQueryAnalyticalPersistence` em runtime GCP.

