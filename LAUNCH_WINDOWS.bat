@echo off
REM IEG LMS - MySQL Edition - Windows Launcher

cls
echo.
echo ╔════════════════════════════════════════════════════════╗
echo ║                                                        ║
echo ║   🎓 IEG LMS - MySQL Edition - Windows Launcher     ║
echo ║                                                        ║
echo ╚════════════════════════════════════════════════════════╝
echo.

REM Check if Node.js is installed
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo ❌ Node.js is not installed!
    echo.
    echo Download from: https://nodejs.org
    echo.
    pause
    exit /b 1
)

REM Check if npm is installed
where npm >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo ❌ npm is not installed!
    echo.
    pause
    exit /b 1
)

echo ✅ Node.js found
echo ✅ npm found
echo.

REM Check if MySQL is running
echo Checking MySQL connection...
mysql -u root -p%MYSQL_PASSWORD% -e "SELECT 1" >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo ⚠️  MySQL might not be running
    echo.
    echo Make sure MySQL is running:
    echo - Windows Services > MySQL > Start
    echo - Or run: mongod in another terminal
    echo.
    pause
)

echo.
echo 📦 Installing dependencies...
call npm install
if %ERRORLEVEL% NEQ 0 (
    echo ❌ npm install failed
    pause
    exit /b 1
)

echo.
echo 🗄️  Initializing database...
call npm run init-db
if %ERRORLEVEL% NEQ 0 (
    echo ❌ Database initialization failed
    pause
    exit /b 1
)

echo.
echo 📊 Seeding sample data (1000 students)...
call npm run init-data
if %ERRORLEVEL% NEQ 0 (
    echo ⚠️  Data seeding had issues, but you can try to start
)

echo.
echo ╔════════════════════════════════════════════════════════╗
echo ║                                                        ║
echo ║        🚀 Starting IEG LMS Server...                ║
echo ║                                                        ║
echo ║     Opening http://localhost:5000 in browser        ║
echo ║                                                        ║
echo ║     Default Login:                                   ║
echo ║     Email: admin@iets.edu                           ║
echo ║     Password: admin123                              ║
echo ║                                                        ║
echo ║     Press Ctrl+C to stop the server                 ║
echo ║                                                        ║
echo ╚════════════════════════════════════════════════════════╝
echo.

REM Start server
call npm start

pause
