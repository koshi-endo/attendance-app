@echo off

REM Start backend
start cmd /k "cd backend && .\venv\Scripts\activate && uvicorn main:app --reload --port 8085"

REM Start frontend
start cmd /k "cd frontend && npm run dev"

echo Servers started. Press any key to stop servers.
pause

REM Stop servers
taskkill /F /IM node.exe
taskkill /F /IM python.exe