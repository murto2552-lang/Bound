@echo off
title Stop Smart Finance Manager Server
echo ===================================================
echo   Stopping Smart Finance Manager Server (Port 3000)
echo ===================================================

:: Find PID of process listening on port 3000 and kill it
set found=0
for /f "tokens=5" %%a in ('netstat -aon ^| findstr /r /c:":3000 *LISTENING"') do (
    taskkill /f /pid %%a >nul 2>&1
    echo Stopped server process (PID: %%a) running on port 3000.
    set found=1
)

if %found%==0 (
    echo No server process found running on port 3000.
) else (
    echo Server stopped successfully.
)

echo.
pause
