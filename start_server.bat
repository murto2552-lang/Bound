@echo off
title Start Smart Finance Manager Server
echo ===================================================
echo   Starting Smart Finance Manager Server (Port 3000)
echo ===================================================
cd /d "%~dp0"

:: Check if python is installed
where python >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Python is not installed or not in PATH.
    echo Please install Python to run this server.
    pause
    exit /b
)

:: Start Python HTTP Server in the background
start /b python -m http.server 3000 > nul 2>&1

echo Server started at http://localhost:3000
echo Opening Google Chrome or your default browser...
start http://localhost:3000

echo.
echo Keep this window open to keep the server running.
echo To stop the server, you can close this window or run stop_server.bat.
echo.
pause
