@echo off
echo 🌐 AGENT-X Web Support Interface
echo =================================

echo 📦 Installing backend dependencies...
cd /d "%~dp0"
set PYTHONPATH=%~dp0
python -m pip install -r requirements.txt
python -m pip install uvicorn fastapi

echo 📦 Installing frontend dependencies...
cd /d "%~dp0web\frontend"
call npm install
if errorlevel 1 (
    echo ⚠️  Frontend dependencies installation failed, trying with npm install --force...
    call npm install --force
)

echo 🚀 Starting backend...
cd /d "%~dp0"
set PYTHONPATH=%~dp0
start "AGENT-X Backend" cmd /k "cd /d %~dp0web\backend && set PYTHONPATH=%~dp0 && python -m uvicorn main:app --host 0.0.0.0 --port 8000"

echo 🌐 Starting frontend...
timeout /t 5 /nobreak >nul
cd /d "%~dp0web\frontend"
start "AGENT-X Frontend" cmd /k "npm start"

echo ✅ AGENT-X Web Interface is starting...
echo 🌐 Backend: http://localhost:8000
echo 🌐 Frontend: http://localhost:3000
echo.
echo Press any key to close this window...
pause >nul