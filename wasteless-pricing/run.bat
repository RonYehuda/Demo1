@echo off
setlocal
set "PATH=C:\Program Files\nodejs;%PATH%"
cd /d "%~dp0"

echo Installing dependencies...
call npm install
if errorlevel 1 (
    echo Failed to install dependencies
    pause
    exit /b 1
)

echo.
echo Initializing database...
call npm run init-db
if errorlevel 1 (
    echo Failed to initialize database
    pause
    exit /b 1
)

echo.
echo Seeding sample data...
call npm run seed
if errorlevel 1 (
    echo Failed to seed database
    pause
    exit /b 1
)

echo.
echo Starting server...
call npm start
