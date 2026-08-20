$ErrorActionPreference = "Stop"
Write-Host "⚡ Installing Agent Friday Enterprise Edition..." -ForegroundColor Cyan

$InstallDir = "$env:LOCALAPPDATA\FridayAgent"
$RepoUrl = "https://github.com/friday-ai/agent-friday.git"

if (Test-Path $InstallDir) {
    Write-Host "Updating existing Agent Friday at $InstallDir..." -ForegroundColor Yellow
    Push-Location $InstallDir
    git pull origin main
} else {
    Write-Host "Cloning repository to $InstallDir..." -ForegroundColor Yellow
    git clone $RepoUrl $InstallDir
    Push-Location $InstallDir
}

Write-Host "Provisioning Python 3.11+ Virtual Environment..." -ForegroundColor Yellow
python -m venv .venv
$Pip = "$InstallDir\.venv\Scripts\pip.exe"

Write-Host "Installing backend dependencies and LangGraph orchestrator..." -ForegroundColor Yellow
& $Pip install --upgrade pip
& $Pip install -e backend

$WindowsAppsPath = "$env:LOCALAPPDATA\Microsoft\WindowsApps"
if (-not (Test-Path $WindowsAppsPath)) {
    New-Item -ItemType Directory -Force -Path $WindowsAppsPath | Out-Null
}

$WrapperScript = "$WindowsAppsPath\friday.cmd"
$WrapperContent = @"
@echo off
echo [Agent Friday] Initializing Core Systems...
cd /d "$InstallDir"
start http://127.0.0.1:8000
"%LOCALAPPDATA%\FridayAgent\.venv\Scripts\uvicorn.exe" api.main:app --app-dir backend --host 127.0.0.1 --port 8000
"@
Set-Content -Path $WrapperScript -Value $WrapperContent

Write-Host ""
Write-Host "✅ Installation Complete! Agent Friday is successfully configured." -ForegroundColor Green
Write-Host "🚀 Type 'friday' in your terminal to launch the agent globally." -ForegroundColor Cyan
Pop-Location
