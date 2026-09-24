$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
$configFile = Join-Path $root "public\config\online-config.js"
$mirrorFile = Join-Path $root "docs\online\ONLINE-SERVER.txt"
$distFile = Join-Path $root "dist\config\online-config.js"

if (-not (Test-Path $configFile)) { throw "Arquivo de configuração não encontrado: $configFile" }
$content = Get-Content $configFile -Raw -Encoding UTF8
$currentMatch = [regex]::Match($content, 'serverUrl:\s*"([^"]+)"')
$current = if ($currentMatch.Success) { $currentMatch.Groups[1].Value } else { "" }

Write-Host ""
Write-Host "BATTLE SPIRITS ETERNAL SIMULATOR v3" -ForegroundColor Cyan
Write-Host "Configuração do servidor Online" -ForegroundColor Cyan
Write-Host ""
Write-Host "Atual: $current" -ForegroundColor Yellow
Write-Host ""
$newUrl = Read-Host "Cole o novo endereço do servidor (ENTER cancela)"
$newUrl = $newUrl.Trim().TrimEnd('/')
if ([string]::IsNullOrWhiteSpace($newUrl)) { Write-Host "Nenhuma alteração feita."; exit 0 }
if ($newUrl -notmatch '^https?://') { throw "O endereço precisa começar com http:// ou https://" }

$newContent = [regex]::Replace($content, 'serverUrl:\s*"[^"]+"', ('serverUrl: "' + $newUrl + '"'), 1)
Set-Content $configFile $newContent -Encoding UTF8
Set-Content $mirrorFile ($newUrl + [Environment]::NewLine) -Encoding UTF8

if (Test-Path $distFile) {
  $dist = Get-Content $distFile -Raw -Encoding UTF8
  $dist = [regex]::Replace($dist, 'serverUrl:\s*"[^"]+"', ('serverUrl: "' + $newUrl + '"'), 1)
  Set-Content $distFile $dist -Encoding UTF8
  Write-Host "A cópia em dist também foi atualizada; não é necessário refazer o build web." -ForegroundColor Green
}

Write-Host ""
Write-Host "Servidor alterado para:" -ForegroundColor Green
Write-Host $newUrl -ForegroundColor White
Write-Host ""
Write-Host "Para Cloudflare/GitHub, publique o arquivo public/config/online-config.js atualizado." -ForegroundColor DarkGray
