@echo off
echo 🌐 AGENT-X Web Support Interface
echo ==================================

REM Install backend dependencies
echo 📦 Installing backend dependencies...
python -m pip install -r ../requirements.txt
python -m pip install uvicorn fastapi

REM Install frontend dependencies
echo 📦 Installing frontend dependencies...
cd frontend
npm install

REM Start the services
echo 🚀 Starting AGENT-X backend...
start cmd /k "cd backend && python -m uvicorn main:app --host 0.0.0.0 --port 8000"

REM Wait a moment for backend to start
timeout /t 3 /nobreak > nul

echo 🚀 Starting AGENT-X frontend...
cd frontend
start cmd /k "npm start"

echo.
echo ✅ AGENT-X Web Interface is starting!
echo.
echo 🌐 Frontend: http://localhost:3000
echo 🔧 Backend:  http://localhost:8000
echo.
echo 🛑 Close these command windows to stop the services
pause