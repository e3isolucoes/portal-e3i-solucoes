import { writeFileSync } from 'node:fs';

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_ANON_KEY;

if (!/^https:\/\/[a-z0-9-]+\.supabase\.co$/i.test(url || '')) {
  throw new Error('SUPABASE_URL pública ausente ou inválida.');
}
if (!key || key.length < 20) {
  throw new Error('SUPABASE_ANON_KEY pública ausente ou inválida.');
}

const content = `export const SUPABASE_URL = ${JSON.stringify(url)};
export const SUPABASE_ANON_KEY = ${JSON.stringify(key)};
`;

writeFileSync(new URL('../js/config.js', import.meta.url), content, { encoding: 'utf8', mode: 0o600 });
