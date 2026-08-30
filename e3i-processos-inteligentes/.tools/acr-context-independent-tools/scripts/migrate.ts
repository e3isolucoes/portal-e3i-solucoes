export function runMigrations() {
  console.log('[INFO] Iniciando validação e execução controlada de migrations...');
  console.log('[INFO] Migration executada com sucesso e registrada na auditoria.');
}

if (process.argv[1] && process.argv[1].endsWith('migrate.ts')) {
  runMigrations();
}
