@echo off
echo Starting DSE backend (FastAPI on port 8000)...
start "DSE Backend" cmd /k "cd /d ""%~dp0"" && uvicorn backend.main:app --reload"

echo Starting DSE frontend (Next.js on port 3000)...
start "DSE Frontend" cmd /k "cd /d ""%~dp0frontend"" && npm run dev"

echo.
echo Both services starting in separate windows.
echo Close each window to stop the service.
