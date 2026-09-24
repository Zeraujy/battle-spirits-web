$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
Write-Host "BATTLE SPIRITS v3 - MIGRAR CONTEÚDO DA v2" -ForegroundColor Cyan
Write-Host "A v2 NÃO será alterada." -ForegroundColor Green
Write-Host ""
$source = Read-Host "Cole o caminho da pasta raiz do seu simulador atual v2"
$source = $source.Trim('"').Trim()
if (-not (Test-Path $source)) { throw "Pasta não encontrada: $source" }
if ((Resolve-Path $source).Path -eq (Resolve-Path $root).Path) { throw "Escolha a pasta da v2, não a própria pasta v3." }

$assetPairs = @(
  @{ From = "public\cards-database"; To = "public\cards-database" },
  @{ From = "public\images"; To = "public\images" }
)
foreach ($item in $assetPairs) {
  $from = Join-Path $source $item.From
  $to = Join-Path $root $item.To
  if (Test-Path $from) {
    Write-Host "Copiando $($item.From)..." -ForegroundColor Yellow
    New-Item -ItemType Directory -Force -Path $to | Out-Null
    Copy-Item -Path (Join-Path $from '*') -Destination $to -Recurse -Force
  } else {
    Write-Host "Ignorado (não encontrado): $($item.From)" -ForegroundColor DarkGray
  }
}

$sourceData = Join-Path $source "src\data"
$targetData = Join-Path $root "src\data"
if (Test-Path $sourceData) {
  Write-Host "Copiando JSONs da database v2..." -ForegroundColor Yellow
  New-Item -ItemType Directory -Force -Path $targetData | Out-Null
  Get-ChildItem $sourceData -Filter *.json -File | Copy-Item -Destination $targetData -Force
}

# Restaura dados específicos que fazem parte do rebuild v3 e são mais recentes.
$bundled = Join-Path $root "resources\v3-data"
if (Test-Path $bundled) {
  Write-Host "Reaplicando dados e decks atualizados da v3..." -ForegroundColor Yellow
  Copy-Item (Join-Path $bundled '*') -Destination $targetData -Force
}

# Reaplica Critical Hit / Trigger Counter / XU Trigger também no cards.json importado.
if (Get-Command node -ErrorAction SilentlyContinue) {
  Push-Location $root
  try { node scripts/patch-advanced-triggers-sd23-sd28.mjs } finally { Pop-Location }
  $backup = Join-Path $root "backup"
  if (Test-Path $backup) { Remove-Item $backup -Recurse -Force }
}

Write-Host ""
Write-Host "Migração concluída. Sua pasta v2 continua intacta." -ForegroundColor Green
Write-Host "Agora execute scripts\windows\INSTALAR_E_ABRIR.bat para testar a v3." -ForegroundColor Cyan
