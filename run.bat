@echo off
TITLE CAD Product Render Manager Launcher
echo ============================================================
echo   Starting CAD Product Render Manager (Backend & Frontend)
echo ============================================================

REM Check Python Virtual Environment
if not exist "venv\Scripts\python.exe" (
    echo Error: Python virtual environment not found in .\venv
    pause
    exit /b 1
)

REM Start FastAPI Backend
echo Starting FastAPI Backend on http://127.0.0.1:8000 ...
start "CAD Manager Backend" .\venv\Scripts\python.exe -m uvicorn backend.app.main:app --host 127.0.0.1 --port 8000 --reload

REM Wait 2 seconds for backend initialization
timeout /t 2 /nobreak >nul

REM Start Vite Frontend
echo Starting Vite Frontend on http://localhost:5173 ...
cd frontend
start "CAD Manager Frontend" npm run dev

echo ============================================================
echo Application started successfully!
echo Backend API : http://127.0.0.1:8000/docs
echo Web App     : http://localhost:5173
echo ============================================================
