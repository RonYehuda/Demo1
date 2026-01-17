@echo off
set PATH=C:\Program Files\nodejs;%PATH%
cd /d "%~dp0"
call npm install
call npm run init-db
call npm run seed
echo.
echo Installation complete! Run 'npm start' to start the server.
pause
