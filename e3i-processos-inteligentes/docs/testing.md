# E3I Processos Inteligentes — Documentação de Testes e Infraestrutura QA

Esta documentação detalha a arquitetura de testes automatizados implementada para a plataforma **E3I Processos Inteligentes**, garantindo robustez, segurança e conformidade corporativa.

## 1. Stack de Testes
- **Vitest**: Framework de testes rápidos para TypeScript e React.
- **Testing Library**: Validação de componentes de interface (`@testing-library/react`).
- **Supertest**: Testes de integração para os endpoints HTTP da API Express.
- **JSDOM**: Ambiente de DOM virtual para renderização de componentes React.
- **Cobertura V8**: Relatórios nativos de cobertura de código (`@vitest/coverage-v8`).

## 2. Estrutura de Diretórios
```text
tests/
├── unit/
│   ├── auth/         # Testes unitários de hash de senha e tokens
│   └── tenant/       # Testes unitários de isolamento multi-tenant
├── integration/
│   ├── auth/         # Testes de rotas de login e autenticação
│   └── organizations/# Testes de listagem e status de organizações
├── frontend/
│   ├── auth/         # Testes de modais de login e redefinição
│   ├── profile/      # Testes do painel de perfil e alteração de senha
│   └── administration/# Testes da tabela e gestão de usuários/colaboradores
├── fixtures/         # Dados estáticos simulados para entidades corporativas
├── helpers/          # Utilitários de banco de dados e servidores de teste
└── setup/            # Configuração global do Vitest e JSDOM
```

## 3. Comandos Disponíveis (`package.json`)
- `npm run test`: Executa todos os testes unitários e de integração em modo run.
- `npm run test:watch`: Mantém os testes em modo interativo (watch).
- `npm run test:unit`: Executa apenas os testes unitários (`tests/unit`).
- `npm run test:integration`: Executa apenas os testes de integração (`tests/integration`).
- `npm run test:frontend`: Executa apenas os testes de frontend (`tests/frontend`).
- `npm run test:coverage`: Gera o relatório de cobertura de código.
- `npm run test:all`: Executa a suíte completa de testes (Unitários, Integração e Frontend).
