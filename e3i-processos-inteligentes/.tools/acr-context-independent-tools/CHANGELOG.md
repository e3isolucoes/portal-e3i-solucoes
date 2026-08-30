# Changelog

Todas as mudanças notáveis nesta plataforma serão documentadas neste arquivo.

O formato é baseado em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.0.0/),
e este projeto adota Versionamento Semântico [Semantic Versioning](https://semver.org/lang/pt-BR/).

## [1.0.0] - 2026-08-06
### Adicionado
- Fundação E³I Fase 01A completa: Autenticação segura, RBAC, Multiempresa, Auditoria, Notificações, Observabilidade, Custos, Backup, Recuperação de Desastre e CI/CD.
- Sistema de liveness e readiness (`/api/health/live`, `/api/health/ready`, `/api/health/details`).
- Mecanismos de backup e restauração (`/api/backups`), testes de recuperação (DRT) e modo de continuidade operacional.
- Validação estrita de variáveis de ambiente por schema tipado.
- Pipelines de CI/CD para GitHub Actions e configuração multiambiente.
