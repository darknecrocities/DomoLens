# ==============================================================================
# DomoLens - Ollama Local LLM Runner & Health Check for Windows (PowerShell)
# ==============================================================================

$ErrorActionPreference = "Stop"

$OllamaPort = "11434"
$OllamaHost = "http://127.0.0.1:$OllamaPort"
$RecommendedModel = "llama3.2:latest"

Write-Host "🔍 Checking Ollama setup for DomoLens AI Director (Windows)..." -ForegroundColor Cyan

# 1. Locate Ollama executable
$OllamaBin = ""
$commandCheck = Get-Command "ollama" -ErrorAction SilentlyContinue
if ($commandCheck) {
    $OllamaBin = $commandCheck.Source
} elseif (Test-Path "$env:LOCALAPPDATA\Programs\Ollama\ollama.exe") {
    $OllamaBin = "$env:LOCALAPPDATA\Programs\Ollama\ollama.exe"
} elseif (Test-Path "C:\Program Files\Ollama\ollama.exe") {
    $OllamaBin = "C:\Program Files\Ollama\ollama.exe"
}

if (-not $OllamaBin) {
    Write-Host ""
    Write-Host "❌ Ollama is not installed on your system." -ForegroundColor Red
    Write-Host "👉 Install via Windows Package Manager (winget):" -ForegroundColor Yellow
    Write-Host "   winget install Ollama.Ollama" -ForegroundColor White
    Write-Host "   or download the Windows installer from: https://ollama.com/download/windows" -ForegroundColor Yellow
    Write-Host ""
    Start-Process "https://ollama.com/download/windows"
    exit 1
}

Write-Host "✓ Found Ollama binary at: $OllamaBin" -ForegroundColor Green

# 2. Check if Ollama server is already responding
$isRunning = $false
try {
    $resp = Invoke-RestMethod -Uri "$OllamaHost/api/tags" -Method Get -TimeoutSec 2 -ErrorAction SilentlyContinue
    if ($resp) { $isRunning = $true }
} catch {
    $isRunning = $false
}

if ($isRunning) {
    Write-Host "✓ Ollama server is already running at $OllamaHost" -ForegroundColor Green
} else {
    Write-Host "🚀 Starting Ollama background server with unrestricted origins..." -ForegroundColor Cyan
    $env:OLLAMA_ORIGINS = "*"
    Start-Process -FilePath $OllamaBin -ArgumentList "serve" -WindowStyle Hidden
    Start-Sleep -Seconds 2

    $maxTries = 10
    $tries = 0
    while (-not $isRunning -and $tries -lt $maxTries) {
        $tries++
        Start-Sleep -Seconds 1
        try {
            $resp = Invoke-RestMethod -Uri "$OllamaHost/api/tags" -Method Get -TimeoutSec 2 -ErrorAction SilentlyContinue
            if ($resp) { $isRunning = $true }
        } catch {}
    }

    if (-not $isRunning) {
        Write-Host "⚠️ Ollama server did not respond within 10 seconds." -ForegroundColor Yellow
        Write-Host "Please run: ollama serve manually in a separate PowerShell window." -ForegroundColor White
        exit 1
    }
    Write-Host "✓ Ollama server successfully started and responding at $OllamaHost" -ForegroundColor Green
}

# 3. Check installed models
Write-Host "📋 Inspecting installed models..." -ForegroundColor Cyan
try {
    $tags = Invoke-RestMethod -Uri "$OllamaHost/api/tags" -Method Get
    if ($tags.models -and $tags.models.Count -gt 0) {
        Write-Host "✓ Installed models found:" -ForegroundColor Green
        foreach ($m in $tags.models) {
            Write-Host "  • $($m.name)" -ForegroundColor White
        }
    } else {
        Write-Host "⚠️ No models found in Ollama. Pulling recommended fast model ($RecommendedModel)..." -ForegroundColor Yellow
        & $OllamaBin pull $RecommendedModel
    }
} catch {
    Write-Host "⚠️ Could not query models list, but Ollama server is active." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "🎉 DomoLens AI Director is ready to use Ollama at $OllamaHost!" -ForegroundColor Green
