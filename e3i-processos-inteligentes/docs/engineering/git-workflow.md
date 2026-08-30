# Fluxo de Trabalho Git (Git Workflow)

## 1. Estrutura de Branches
- `main`: Branch de produção, protegida contra pushes diretos. Requer Pull Request, aprovação de revisores e status checks verdes.
- `staging`: Branch de homologação e testes integrados.
- `develop`: Branch de integração contínua para novas funcionalidades.
- `feature/*`: Branches de trabalho individuais para cada história ou correção.

## 2. Padrões de Commit e Pull Request
- Commits seguem convenções claras e rastreáveis.
- Pull Requests exigem passagem obrigatória pelo pipeline de CI (lint, typecheck, testes unitários, testes de integração e build).
- Proibido versionar segredos ou credenciais em qualquer branch.
