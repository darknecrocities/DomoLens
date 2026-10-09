@echo off
rem ==============================================================================
rem DomoLens - Ollama Local LLM Runner for Windows (CMD / Batch)
rem ==============================================================================

echo [DomoLens] Launching Ollama Local LLM Runner for Windows...
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0run-ollama.ps1"
if %ERRORLEVEL% NEQ 0 (
    echo [DomoLens] PowerShell script returned an error code: %ERRORLEVEL%
    pause
)
