$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Net.Http

$root = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
$keyPath = Join-Path $root '.secrets\supabase-service-role.dpapi'
$dataDump = Join-Path $root '.migration\supabase-export\data.sql'
$outputRoot = Join-Path $root '.migration\supabase-storage'
$projectUrl = 'https://fsyginnpvonruifetjjs.supabase.co'

if (-not (Test-Path -LiteralPath $keyPath)) { throw 'Chave service_role criptografada não encontrada.' }
if (-not (Test-Path -LiteralPath $dataDump)) { throw 'Exportação data.sql não encontrada.' }

$secureKey = Get-Content -LiteralPath $keyPath -Raw | ConvertTo-SecureString
$credential = New-Object System.Management.Automation.PSCredential('service_role', $secureKey)
$serviceKey = $credential.GetNetworkCredential().Password

$lines = Get-Content -LiteralPath $dataDump
$copyHeader = $lines | Where-Object { $_ -like 'COPY storage.objects *' } | Select-Object -First 1
$startIndex = [Array]::IndexOf($lines, $copyHeader)
if ($startIndex -lt 0) { throw 'Bloco storage.objects não encontrado no backup.' }

$objects = New-Object System.Collections.Generic.List[object]
for ($index = $startIndex + 1; $index -lt $lines.Count -and $lines[$index] -ne '\.'; $index++) {
    $columns = $lines[$index] -split "`t"
    if ($columns.Count -ge 3) {
        $objects.Add([pscustomobject]@{ Bucket = $columns[1]; Name = $columns[2] })
    }
}

New-Item -ItemType Directory -Path $outputRoot -Force | Out-Null
$client = [System.Net.Http.HttpClient]::new()
$client.DefaultRequestHeaders.Authorization = [System.Net.Http.Headers.AuthenticationHeaderValue]::new('Bearer', $serviceKey)
$client.DefaultRequestHeaders.Add('apikey', $serviceKey)

$downloaded = 0
$failed = New-Object System.Collections.Generic.List[string]
try {
    foreach ($object in $objects) {
        $encodedPath = (($object.Name -split '/') | ForEach-Object { [System.Uri]::EscapeDataString($_) }) -join '/'
        $encodedBucket = [System.Uri]::EscapeDataString($object.Bucket)
        $uri = "$projectUrl/storage/v1/object/authenticated/$encodedBucket/$encodedPath"
        $destination = Join-Path $outputRoot (Join-Path $object.Bucket ($object.Name -replace '/', [System.IO.Path]::DirectorySeparatorChar))
        $destinationDirectory = Split-Path -Parent $destination
        New-Item -ItemType Directory -Path $destinationDirectory -Force | Out-Null

        try {
            $response = $client.GetAsync($uri).GetAwaiter().GetResult()
            if (-not $response.IsSuccessStatusCode) {
                throw "HTTP $([int]$response.StatusCode)"
            }
            $bytes = $response.Content.ReadAsByteArrayAsync().GetAwaiter().GetResult()
            [System.IO.File]::WriteAllBytes($destination, $bytes)
            $downloaded++
        }
        catch {
            $failed.Add("$($object.Bucket)/$($object.Name): $($_.Exception.Message)")
        }
    }
}
finally {
    $client.Dispose()
    $serviceKey = $null
}

$files = Get-ChildItem -LiteralPath $outputRoot -File -Recurse
[pscustomobject]@{
    Expected = $objects.Count
    Downloaded = $downloaded
    Failed = $failed.Count
    Bytes = ($files | Measure-Object Length -Sum).Sum
}

if ($failed.Count -gt 0) {
    $failed | ForEach-Object { Write-Warning $_ }
    exit 1
}
