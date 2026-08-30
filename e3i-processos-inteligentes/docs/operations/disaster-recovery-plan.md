# Plano de Recuperação de Desastre e Continuidade Operacional (Fase 01A.9)

## 1. Cenários de Falha e Acionamento
- **Corrupção de Banco de Dados:** Acionamento imediato do modo de manutenção (`MAINTENANCE`), validação do último backup íntegro e execução de restore em ambiente isolado.
- **Indisponibilidade de Storage:** Ativação de modo degradado (`DEGRADED`) com redirecionamento para replica de leitura/storage secundário.
- **Falha Crítica de Infraestrutura:** Acionamento do plano de contingência corporativo e restauração em infraestrutura redundante.

## 2. Ordem de Recuperação
1. Isolar o ambiente afetado e ativar o modo de manutenção / recuperação.
2. Identificar o último `BackupJob` bem-sucedido com checksum válido.
3. Executar validação de integridade e simulação de restauração (`RestoreJob`).
4. Convalidar testes de desastre (`DisasterRecoveryTest`) medindo RPO e RTO observados.
5. Retornar ao modo normal (`NORMAL`) após validação positiva dos health checks.

## 3. Responsabilidades e Governança
- **E3I_ADMIN:** Único perfil autorizado a iniciar restaurações globais e alterar o modo de continuidade operacional.
- **Equipe de Operações:** Responsável pelo monitoramento contínuo de backups e execução periódica de testes de disaster recovery.
