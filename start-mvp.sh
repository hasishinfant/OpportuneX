#!/bin/bash

# OpportuneX MVP Startup Script
echo "🚀 Starting OpportuneX MVP..."

# Check if MongoDB is running
if ! pgrep -x "mongod" > /dev/null; then
    echo "⚠️  MongoDB is not running. Please start MongoDB first:"
    echo "   brew services start mongodb-community"
    echo "   or"
    echo "   sudo systemctl start mongod"
    exit 1
fi

# Check if dependencies are installed
if [ ! -d "node_modules" ]; then
    echo "📦 Installing frontend dependencies..."
    npm install
fi

if [ ! -d "server/node_modules" ]; then
    echo "📦 Installing backend dependencies..."
    cd server && npm install && cd ..
fi

# Check if sample data exists
echo "🌱 Checking sample data..."
cd server
if ! node -e "
const mongoose = require('mongoose');
mongoose.connect('mongodb://localhost:27017/opportunex');
const Opportunity = require('./models/Opportunity');
Opportunity.countDocuments().then(count => {
    if (count === 0) {
        console.log('No sample data found. Running seed script...');
        process.exit(1);
    } else {
        console.log(\`Found \${count} opportunities in database\`);
        process.exit(0);
    }
}).catch(() => process.exit(1));
" 2>/dev/null; then
    echo "🌱 Seeding sample data..."
    npm run seed
fi
cd ..

# Start backend in background
echo "🔧 Starting backend server..."
cd server
npm run dev &
BACKEND_PID=$!
cd ..

# Wait for backend to start
echo "⏳ Waiting for backend to start..."
sleep 3

# Check if backend is running
if ! curl -s http://localhost:5000/api/health > /dev/null; then
    echo "❌ Backend failed to start"
    kill $BACKEND_PID 2>/dev/null
    exit 1
fi

echo "✅ Backend running on http://localhost:5000"

# Start frontend
echo "🎨 Starting frontend..."
npm run dev &
FRONTEND_PID=$!

# Wait for frontend to start
echo "⏳ Waiting for frontend to start..."
sleep 5

echo ""
echo "🎉 OpportuneX MVP is now running!"
echo ""
echo "📱 Frontend: http://localhost:3000"
echo "🔧 Backend:  http://localhost:5000"
echo "🏥 Health:   http://localhost:5000/api/health"
echo ""
echo "Press Ctrl+C to stop all services"

# Function to cleanup on exit
cleanup() {
    echo ""
    echo "🛑 Stopping services..."
    kill $BACKEND_PID 2>/dev/null
    kill $FRONTEND_PID 2>/dev/null
    echo "✅ All services stopped"
    exit 0
}

# Set trap to cleanup on script exit
trap cleanup SIGINT SIGTERM

# Wait for user to stop
wait