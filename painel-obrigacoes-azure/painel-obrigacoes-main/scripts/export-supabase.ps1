param(
    [ValidateSet('roles', 'all')]
    [string]$Mode = 'all'
)

$ErrorActionPreference = 'Stop'
$projectRef = 'fsyginnpvonruifetjjs'
$root = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
$credentialPath = Join-Path $root '.secrets\supabase-db-password.dpapi'
$outputDirectory = Join-Path $root '.migration\supabase-export'
$postgresBin = Join-Path $root '.tools\postgresql-17.11\pgsql\bin'
$pgDump = Join-Path $postgresBin 'pg_dump.exe'
$pgDumpAll = Join-Path $postgresBin 'pg_dumpall.exe'

if (-not (Test-Path -LiteralPath $credentialPath)) {
    throw 'Credencial criptografada do Supabase não encontrada.'
}

$securePassword = Get-Content -LiteralPath $credentialPath -Raw | ConvertTo-SecureString
$credential = New-Object System.Management.Automation.PSCredential('postgres', $securePassword)
$plainPassword = $credential.GetNetworkCredential().Password

New-Item -ItemType Directory -Path $outputDirectory -Force | Out-Null
$env:PGPASSWORD = $plainPassword
$databaseHost = "db.$projectRef.supabase.co"

if (-not (Test-Path -LiteralPath $pgDump) -or -not (Test-Path -LiteralPath $pgDumpAll)) {
    throw 'Ferramentas portáteis do PostgreSQL não encontradas.'
}

try {
    & $pgDumpAll --roles-only --host $databaseHost --port 5432 --username postgres --file (Join-Path $outputDirectory 'roles.sql')
    if ($LASTEXITCODE -ne 0) { throw 'Falha ao exportar papéis do banco.' }

    if ($Mode -eq 'all') {
        & $pgDump --host $databaseHost --port 5432 --username postgres --dbname postgres --exclude-schema vault --format custom --file (Join-Path $outputDirectory 'full.dump')
        if ($LASTEXITCODE -ne 0) { throw 'Falha ao gerar o backup completo.' }

        & $pgDump --host $databaseHost --port 5432 --username postgres --dbname postgres --exclude-schema vault --schema-only --file (Join-Path $outputDirectory 'schema.sql')
        if ($LASTEXITCODE -ne 0) { throw 'Falha ao exportar o esquema.' }

        & $pgDump --host $databaseHost --port 5432 --username postgres --dbname postgres --exclude-schema vault --data-only --file (Join-Path $outputDirectory 'data.sql')
        if ($LASTEXITCODE -ne 0) { throw 'Falha ao exportar os dados.' }
    }
}
finally {
    Remove-Item Env:PGPASSWORD -ErrorAction SilentlyContinue
    $plainPassword = $null
}

Get-ChildItem -LiteralPath $outputDirectory -File | Select-Object Name, Length, LastWriteTime
