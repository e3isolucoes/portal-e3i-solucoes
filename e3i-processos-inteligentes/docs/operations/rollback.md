# Procedimento de Rollback Operacional

## 1. Escopo de Rollback
Em caso de falha crítica pós-deploy ou regressão em produção, os seguintes passos devem ser executados em ordem:

1. **Acionar o Modo de Manutenção / Recuperação:**
   - Ativar o modo `MAINTENANCE` via painel administrativo (`E3I_ADMIN`) para proteger dados e exibir mensagem segura aos usuários.
2. **Restaurar Artefato Anterior:**
   - Promover imediatamente a imagem / commit SHA anterior comprovadamente estável.
3. **Reverter Configuração / Feature Flag:**
   - Desativar eventuais feature flags problemáticas.
4. **Recuperação de Banco de Dados (se aplicável):**
   - Executar o restore do último `BackupJob` validado com checksum íntegro em ambiente isolado ou em transação compensatória.
5. **Validação de Saúde:**
   - Executar liveness e readiness probes e verificar logs estruturados.
6. **Encerramento do Incidente:**
   - Desativar o modo de manutenção para `NORMAL` e registrar a auditoria operacional (`ROLLBACK_SUCCEEDED`).
