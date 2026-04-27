@echo off
title AeroTrack Live Launcher
color 0b

echo =========================================
echo       Starting AeroTrack Live...
echo =========================================
echo.

:: Check if node_modules exists, if not run npm install
IF NOT EXIST "node_modules\" (
    echo [INFO] Dependencies not found. Installing them now...
    npm install
    echo.
)

echo [INFO] Starting the development server...

:: Start the Vite dev server in a new command window
start "AeroTrack Dev Server" cmd /k "npm run dev"

:: Wait a few seconds for the Vite server to start up
echo [INFO] Waiting for the server to initialize...
timeout /t 3 /nobreak > NUL

:: Open the default web browser to the Vite app
echo [INFO] Opening your browser to http://localhost:5173
start http://localhost:5173

echo.
echo =========================================
echo       Project is now running!
echo =========================================
echo Close this window at any time. To stop the server, close the other command window.
pause
