param([Parameter(Mandatory = $true)][int]$ObjectId)

$ErrorActionPreference = 'Stop'
$root = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
$passwordFile = Join-Path $root '.secrets\supabase-db-password.dpapi'
$psql = Join-Path $root '.tools\postgresql-17.11\pgsql\bin\psql.exe'
$securePassword = Get-Content -LiteralPath $passwordFile -Raw | ConvertTo-SecureString
$credential = New-Object System.Management.Automation.PSCredential('postgres', $securePassword)
$env:PGPASSWORD = $credential.GetNetworkCredential().Password

try {
    $query = "select n.nspname as schema_name, p.proname as object_name from pg_proc p join pg_namespace n on n.oid = p.pronamespace where p.oid = $ObjectId;"
    & $psql --host db.fsyginnpvonruifetjjs.supabase.co --port 5432 --username postgres --dbname postgres --tuples-only --no-align --command $query
    if ($LASTEXITCODE -ne 0) { throw 'Não foi possível consultar o objeto remoto.' }
}
finally {
    Remove-Item Env:PGPASSWORD -ErrorAction SilentlyContinue
}
