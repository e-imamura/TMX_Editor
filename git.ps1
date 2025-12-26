param(
  [string]$RemoteName = "origin",
  [string]$RemoteUrl = "",       # ex.: git@github.com:usuario/repositorio.git ou https://...
  [string]$Branch = "main",       # altere para "master" se necessário
  [string]$CommitMsg = "chore: sobrescreve remoto com estado local",
  [bool]$PushTags = $true,
  [switch]$Mirror                 # use -Mirror para enviar todas as refs (branches, tags, notes)
)

# =====================
# Script para forçar que a versão local substitua o remoto
# CUIDADO: Isto sobrescreve o histórico remoto.
# =====================

function Exec([string]$cmd) {
  Write-Host "» $cmd" -ForegroundColor Cyan
  $proc = Start-Process -FilePath "cmd.exe" -ArgumentList "/c $cmd" -NoNewWindow -Wait -PassThru
  if ($proc.ExitCode -ne 0) { throw "Falha: $cmd" }
}

try {
  # 1) Verifica se é repositório git
  Exec "git rev-parse --is-inside-work-tree"

  # 2) Garante a branch local
  cmd /c "git show-ref --verify --quiet refs/heads/$Branch"
  if ($LASTEXITCODE -ne 0) {
    Exec "git checkout -b $Branch"
  } else {
    Exec "git checkout $Branch"
  }

  # 3) Configura remote
  $currentUrl = $null
  try { $currentUrl = git remote get-url $RemoteName } catch {}
  if ($currentUrl) {
    Write-Host "Remote '$RemoteName' atual: $currentUrl" -ForegroundColor Yellow
    if ($RemoteUrl -ne "") { Exec "git remote set-url $RemoteName $RemoteUrl" }
  } else {
    if ($RemoteUrl -eq "") { throw "REMOTE_URL não definido e remote '$RemoteName' não existe." }
    Exec "git remote add $RemoteName $RemoteUrl"
  }

  # 4) Backup do estado remoto
  Exec "git fetch --prune $RemoteName"
  $remoteHasBranch = (git ls-remote --heads $RemoteName $Branch) -match $Branch
  if ($remoteHasBranch) {
    $stamp = Get-Date -Format 'yyyyMMdd-HHmmss'
    $backup = "backup/$RemoteName-$Branch-$stamp"
    Exec "git branch -f $backup $RemoteName/$Branch"
    Write-Host "Backup criado: $backup" -ForegroundColor Green
  } else {
    Write-Host "Nenhuma branch remota '$Branch' detectada." -ForegroundColor Yellow
  }

  # 5) Commit local
  Exec "git add -A"
  cmd /c "git diff --cached --quiet"
  if ($LASTEXITCODE -ne 0) { Exec "git commit -m \"$CommitMsg\"" } else { Write-Host "Sem mudanças para commit." }

  # 6) Define upstream (best effort)
  cmd /c "git branch --set-upstream-to=$RemoteName/$Branch $Branch" | Out-Null

  # 7) Push forçado
  if ($Mirror) {
    Write-Host "Usando --mirror: todas as refs serão sobrescritas." -ForegroundColor Red
    Exec "git push --force --mirror $RemoteName"
  } else {
    Exec "git push --force $RemoteName $Branch"
    if ($PushTags) { Exec "git push --force --tags $RemoteName" }
  }

  Write-Host "✅ Remoto sobrescrito pela versão local." -ForegroundColor Green

} catch {
  Write-Error $_
  exit 1
}
