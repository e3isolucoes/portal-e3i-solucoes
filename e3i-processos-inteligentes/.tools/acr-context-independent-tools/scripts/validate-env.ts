import dotenv from 'dotenv';
dotenv.config();

const requiredEnv = [
  'NODE_ENV',
  'APP_URL',
  'SESSION_SECRET'
];

export function validateEnvironment() {
  const missing = requiredEnv.filter(key => !process.env[key]);
  if (missing.length > 0) {
    console.error(`[FATAL] Variáveis de ambiente obrigatórias ausentes: ${missing.join(', ')}`);
    process.exit(1);
  }
  console.log('[INFO] Validação de ambiente concluída com sucesso.');
}

if (process.argv[1] && process.argv[1].endsWith('validate-env.ts')) {
  validateEnvironment();
}
