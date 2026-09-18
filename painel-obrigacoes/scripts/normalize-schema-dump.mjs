import { readFile, writeFile } from 'node:fs/promises';
import process from 'node:process';

const [, , inputPath, outputPath] = process.argv;
if (!inputPath || !outputPath) {
  throw new Error('Uso: node scripts/normalize-schema-dump.mjs <entrada> <saida>');
}

let sql = await readFile(inputPath, 'utf8');
sql = sql
  .replace(/^-- Dumped from database version .*\n/gm, '')
  .replace(/^-- Dumped by pg_dump version .*\n/gm, '')
  .replace(/^\\restrict\s+.*\n/gm, '')
  .replace(/^\\unrestrict\s+.*\n/gm, '')
  .replace(/\r\n/g, '\n')
  .replace(/\n{3,}/g, '\n\n')
  .trim();

const header = [
  '-- GENERATED FILE — DO NOT EDIT MANUALLY.',
  '-- Source of truth: sql/migrations/*.sql, applied sequentially with supabase db reset.',
  '-- Regenerate with: npm run db:schema:generate',
  ''
].join('\n');

await writeFile(outputPath, `${header}${sql}\n`, 'utf8');
