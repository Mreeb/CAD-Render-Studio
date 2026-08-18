# PowerShell Startup Script for CAD Product Render Manager
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "  Starting CAD Product Render Manager (Backend & Frontend)" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan

$VenvPython = ".\venv\Scripts\python.exe"

if (-not (Test-Path $VenvPython)) {
    Write-Host "Error: Virtual environment not found at $VenvPython" -ForegroundColor Red
    exit 1
}

Write-Host "Starting FastAPI Backend on http://127.0.0.1:8000 ..." -ForegroundColor Green
Start-Process -FilePath $VenvPython -ArgumentList "-m uvicorn backend.app.main:app --host 127.0.0.1 --port 8000 --reload" -WindowStyle Normal

Start-Sleep -Seconds 2

Write-Host "Starting Vite Frontend on http://localhost:5173 ..." -ForegroundColor Green
Start-Process -FilePath "cmd.exe" -ArgumentList "/c cd /d `"$PSScriptRoot\frontend`" && npm run dev" -WindowStyle Normal

Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "Application launched successfully!" -ForegroundColor Green
Write-Host "Backend Docs : http://127.0.0.1:8000/docs" -ForegroundColor Yellow
Write-Host "Frontend App : http://localhost:5173" -ForegroundColor Yellow
Write-Host "============================================================" -ForegroundColor Cyan
