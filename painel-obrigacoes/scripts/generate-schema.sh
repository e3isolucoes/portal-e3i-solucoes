#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

OUTPUT="sql/schema.sql"
if [[ "${1:-}" == "--output" ]]; then
  [[ -n "${2:-}" ]] || { echo "Missing path after --output" >&2; exit 2; }
  OUTPUT="$2"
fi

command -v supabase >/dev/null 2>&1 || {
  echo "Supabase CLI is required. Install it before generating schema.sql." >&2
  exit 127
}

cleanup() {
  supabase stop --no-backup >/dev/null 2>&1 || true
  rm -rf supabase
}
trap cleanup EXIT

rm -rf supabase
supabase init >/dev/null
node scripts/prepare-supabase-migrations.mjs

# Start a clean local stack, then explicitly rebuild the database from zero.
supabase start >/dev/null
supabase db reset --local

RAW="$(mktemp)"
trap 'rm -f "$RAW"; cleanup' EXIT
supabase db dump --local --schema public -f "$RAW"
node scripts/normalize-schema-dump.mjs "$RAW" "$OUTPUT"
node scripts/check-rls-isolation.mjs "$OUTPUT"

echo "Generated $OUTPUT from the full migration chain."
