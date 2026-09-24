param(
  [string]$Mode = "menu"
)

$ErrorActionPreference = "Stop"
$ProjectRoot = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path
Set-Location $ProjectRoot

function Write-Title($text) {
  Write-Host ""
  Write-Host "============================================================" -ForegroundColor DarkGray
  Write-Host " $text" -ForegroundColor Cyan
  Write-Host "============================================================" -ForegroundColor DarkGray
}

function Require-Command($name, $hint) {
  if (-not (Get-Command $name -ErrorAction SilentlyContinue)) {
    throw "$name não foi encontrado. $hint"
  }
}

function Get-FileHashSafe($path) {
  if (Test-Path $path) { return (Get-FileHash -Algorithm SHA256 $path).Hash }
  return ""
}

function Get-ProjectVersion {
  $pkg = Get-Content (Join-Path $ProjectRoot "package.json") -Raw | ConvertFrom-Json
  return $pkg.version
}

function Select-UpdateZip {
  Add-Type -AssemblyName System.Windows.Forms
  $dialog = New-Object System.Windows.Forms.OpenFileDialog
  $dialog.Title = "Selecione o ZIP de atualização do Battle Spirits"
  $dialog.Filter = "Arquivos ZIP (*.zip)|*.zip"
  $dialog.Multiselect = $false
  if ($dialog.ShowDialog() -eq [System.Windows.Forms.DialogResult]::OK) {
    return $dialog.FileName
  }
  return $null
}

function Copy-UpdateTree($Source, $Destination) {
  $blockedTop = @(".git", "node_modules", "dist", "release", ".wrangler")
  $sourceRoot = (Resolve-Path $Source).Path

  Get-ChildItem -LiteralPath $sourceRoot -Recurse -Force -File | ForEach-Object {
    $rel = $_.FullName.Substring($sourceRoot.Length).TrimStart('\\', '/')
    if (-not $rel) { return }
    $parts = $rel -split '[\\/]'
    if ($blockedTop -contains $parts[0]) { return }
    if ($rel -eq ".env" -or $rel -eq "server\.env" -or $rel -eq "server/.env") { return }
    if ($rel -eq ".update-delete.txt") { return }

    $target = Join-Path $Destination $rel
    $parent = Split-Path -Parent $target
    if (-not (Test-Path $parent)) { New-Item -ItemType Directory -Path $parent -Force | Out-Null }
    Copy-Item -LiteralPath $_.FullName -Destination $target -Force
  }
}
function Apply-UpdateZip {
  Write-Title "APLICAR UPDATE"
  $zip = Select-UpdateZip
  if (-not $zip) {
    Write-Host "Nenhum ZIP selecionado." -ForegroundColor Yellow
    return $false
  }

  $beforeLock = Get-FileHashSafe (Join-Path $ProjectRoot "package-lock.json")
  $temp = Join-Path $env:TEMP ("battle-spirits-update-" + [guid]::NewGuid().ToString("N"))
  New-Item -ItemType Directory -Path $temp -Force | Out-Null

  try {
    Write-Host "Extraindo: $zip"
    Expand-Archive -LiteralPath $zip -DestinationPath $temp -Force

    $source = $temp
    $topItems = @(Get-ChildItem -LiteralPath $temp -Force)
    if ($topItems.Count -eq 1 -and $topItems[0].PSIsContainer) {
      $source = $topItems[0].FullName
    }

    $deleteManifest = Join-Path $source ".update-delete.txt"
    if (Test-Path $deleteManifest) {
      Get-Content $deleteManifest | ForEach-Object {
        $rel = $_.Trim()
        if ($rel -and -not $rel.StartsWith("#")) {
          $target = Join-Path $ProjectRoot $rel
          if (Test-Path $target) {
            Remove-Item -LiteralPath $target -Recurse -Force
            Write-Host "Removido: $rel" -ForegroundColor DarkYellow
          }
        }
      }
    }

    Copy-UpdateTree $source $ProjectRoot
    if (Test-Path (Join-Path $ProjectRoot ".update-delete.txt")) {
      Remove-Item (Join-Path $ProjectRoot ".update-delete.txt") -Force
    }

    $afterLock = Get-FileHashSafe (Join-Path $ProjectRoot "package-lock.json")
    $needsInstall = (-not (Test-Path (Join-Path $ProjectRoot "node_modules"))) -or ($beforeLock -ne $afterLock)
    if ($needsInstall) {
      Write-Host "Dependências mudaram ou node_modules não existe. Executando npm install..." -ForegroundColor Yellow
      npm install
      if ($LASTEXITCODE -ne 0) { throw "npm install falhou." }
    } else {
      Write-Host "Dependências não mudaram; npm install ignorado." -ForegroundColor Green
    }

    Write-Host "Update aplicado com sucesso." -ForegroundColor Green
    return $true
  }
  finally {
    if (Test-Path $temp) { Remove-Item $temp -Recurse -Force -ErrorAction SilentlyContinue }
  }
}

function Test-Project {
  Write-Title "VALIDAÇÃO"
  Require-Command "node" "Instale Node.js 24."
  Require-Command "npm" "Instale Node.js/NPM."

  npm run verify
  if ($LASTEXITCODE -ne 0) { throw "npm run verify falhou." }
  npm test
  if ($LASTEXITCODE -ne 0) { throw "npm test falhou." }
  Write-Host "Verificação e testes concluídos." -ForegroundColor Green
}

function Build-Project {
  Write-Title "BUILD LOCAL"
  npm run build
  if ($LASTEXITCODE -ne 0) { throw "npm run build falhou." }
  Write-Host "Build gerado em dist/." -ForegroundColor Green
}

function Push-GitHub {
  Write-Title "GITHUB"
  Require-Command "git" "Instale Git ou GitHub Desktop."
  $changes = git status --porcelain
  if (-not $changes) {
    Write-Host "Nenhuma alteração para commitar." -ForegroundColor Yellow
    return
  }

  git add -A
  if ($LASTEXITCODE -ne 0) { throw "git add falhou." }

  $version = Get-ProjectVersion
  $defaultMessage = "Update v$version"
  $message = Read-Host "Mensagem do commit (Enter = '$defaultMessage')"
  if ([string]::IsNullOrWhiteSpace($message)) { $message = $defaultMessage }

  git commit -m $message
  if ($LASTEXITCODE -ne 0) { throw "git commit falhou." }
  git push
  if ($LASTEXITCODE -ne 0) { throw "git push falhou." }
  Write-Host "GitHub atualizado." -ForegroundColor Green
}

function Deploy-Cloudflare {
  Write-Title "CLOUDFLARE"
  Write-Host "Deploy direto via Wrangler. Isso evita esperar o build remoto do Cloudflare." -ForegroundColor Cyan
  Write-Host "Na primeira vez, se não estiver autenticado, execute: npx wrangler@4 login" -ForegroundColor DarkGray
  npx wrangler@4 deploy
  if ($LASTEXITCODE -ne 0) {
    Write-Host "Se for a primeira vez, rode 'npx wrangler@4 login' e tente novamente." -ForegroundColor Yellow
    throw "Wrangler deploy falhou."
  }
  Write-Host "Cloudflare atualizado." -ForegroundColor Green
}

function Publish-All {
  Test-Project
  Build-Project
  Push-GitHub
  $answer = Read-Host "Fazer deploy direto no Cloudflare agora? (S/n)"
  if ([string]::IsNullOrWhiteSpace($answer) -or $answer.Trim().ToLower().StartsWith("s")) {
    Deploy-Cloudflare
  }
}

try {
  Require-Command "node" "Instale Node.js 24."
  Require-Command "npm" "Instale Node.js/NPM."

  if ($Mode -eq "apply") { if (Apply-UpdateZip) { Publish-All }; exit 0 }
  if ($Mode -eq "publish") { Publish-All; exit 0 }
  if ($Mode -eq "check") { Test-Project; exit 0 }

  while ($true) {
    Write-Title "BATTLE SPIRITS — GERENCIADOR DO PROJETO"
    Write-Host "[1] Aplicar ZIP de update + validar + GitHub + Cloudflare"
    Write-Host "[2] Publicar alterações atuais (sem aplicar ZIP)"
    Write-Host "[3] Somente validar projeto"
    Write-Host "[4] Login do Cloudflare (Wrangler)"
    Write-Host "[0] Sair"
    $choice = Read-Host "Escolha"
    switch ($choice) {
      "1" { if (Apply-UpdateZip) { Publish-All } }
      "2" { Publish-All }
      "3" { Test-Project }
      "4" { npx wrangler@4 login }
      "0" { break }
      default { Write-Host "Opção inválida." -ForegroundColor Yellow }
    }
  }
}
catch {
  Write-Host ""; Write-Host "ERRO: $($_.Exception.Message)" -ForegroundColor Red
  Write-Host "O fluxo foi interrompido antes das etapas seguintes." -ForegroundColor Yellow
  Read-Host "Pressione Enter para fechar"
  exit 1
}
