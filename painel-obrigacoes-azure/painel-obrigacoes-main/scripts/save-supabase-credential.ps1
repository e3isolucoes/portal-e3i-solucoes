param(
    [string]$OutputPath = (Join-Path $PSScriptRoot '..\.secrets\supabase-db-password.dpapi')
)

$ErrorActionPreference = 'Stop'
$resolvedOutput = [System.IO.Path]::GetFullPath($OutputPath)
$secretDirectory = Split-Path -Parent $resolvedOutput

New-Item -ItemType Directory -Path $secretDirectory -Force | Out-Null
$credential = Read-Host 'Cole a nova senha do banco Supabase' -AsSecureString
$encrypted = ConvertFrom-SecureString -SecureString $credential
[System.IO.File]::WriteAllText($resolvedOutput, $encrypted, [System.Text.UTF8Encoding]::new($false))

Write-Host 'Senha armazenada com protecao DPAPI para o usuario atual do Windows.'
