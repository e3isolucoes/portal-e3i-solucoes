#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

command -v supabase >/dev/null 2>&1 || {
  echo "Supabase CLI não encontrado." >&2
  exit 1
}

mkdir -p supabase/migrations
find supabase/migrations -mindepth 1 -maxdepth 1 -type f -name '*.sql' -delete
cp sql/migrations/*.sql supabase/migrations/

# O reset local é a prova de que o banco nasce somente da sequência de migrations.
supabase start >/dev/null
supabase db reset --local

tmp_schema="$(mktemp)"
trap 'rm -f "$tmp_schema"' EXIT

supabase db dump --local --schema public,storage --file "$tmp_schema"

{
  cat <<'HEADER'
-- =============================================================================
-- ARQUIVO GERADO AUTOMATICAMENTE. NÃO EDITAR MANUALMENTE.
-- Fonte de verdade: sql/migrations/*.sql, aplicadas em ordem por Supabase CLI.
-- Regenerar com: npm run schema:generate
-- =============================================================================

HEADER
  cat "$tmp_schema"
} > sql/schema.sql
