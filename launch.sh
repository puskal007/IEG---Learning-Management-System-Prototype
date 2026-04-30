#!/bin/bash

# IETS LMS - MySQL Edition - Unix/Mac/Linux Launcher

clear
echo ""
echo "╔════════════════════════════════════════════════════════╗"
echo "║                                                        ║"
echo "║   🎓 IETS LMS - MySQL Edition - Launcher             ║"
echo "║                                                        ║"
echo "╚════════════════════════════════════════════════════════╝"
echo ""

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed!"
    echo ""
    echo "Download from: https://nodejs.org"
    echo ""
    exit 1
fi

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo "❌ npm is not installed!"
    echo ""
    exit 1
fi

echo "✅ Node.js found"
echo "✅ npm found"
echo ""

# Check MySQL
echo "Checking MySQL connection..."
if command -v mysql &> /dev/null; then
    mysql -u root -e "SELECT 1" > /dev/null 2>&1
    if [ $? -eq 0 ]; then
        echo "✅ MySQL is running"
    else
        echo "⚠️  MySQL might not be running"
        echo ""
        echo "Start MySQL:"
        echo "  Mac: brew services start mysql-server"
        echo "  Linux: sudo systemctl start mysql"
        echo "  Windows: Services > MySQL > Start"
        echo ""
    fi
else
    echo "⚠️  MySQL command not found. Make sure MySQL is running."
    echo ""
fi

echo ""
echo "📦 Installing dependencies..."
npm install
if [ $? -ne 0 ]; then
    echo "❌ npm install failed"
    exit 1
fi

echo ""
echo "🗄️  Initializing database..."
npm run init-db
if [ $? -ne 0 ]; then
    echo "❌ Database initialization failed"
    exit 1
fi

echo ""
echo "📊 Seeding sample data (1000 students)..."
npm run init-data
if [ $? -ne 0 ]; then
    echo "⚠️  Data seeding had issues, but you can try to start"
fi

echo ""
echo "╔════════════════════════════════════════════════════════╗"
echo "║                                                        ║"
echo "║        🚀 Starting IETS LMS Server...                ║"
echo "║                                                        ║"
echo "║     Opening http://localhost:5000 in browser        ║"
echo "║                                                        ║"
echo "║     Default Login:                                   ║"
echo "║     Email: admin@iets.edu                           ║"
echo "║     Password: admin123                              ║"
echo "║                                                        ║"
echo "║     Press Ctrl+C to stop the server                 ║"
echo "║                                                        ║"
echo "╚════════════════════════════════════════════════════════╝"
echo ""

# Start server
npm start
