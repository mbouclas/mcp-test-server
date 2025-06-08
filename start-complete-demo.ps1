# Complete Frontend Demo Startup Script
# This script starts everything needed for the MCP + Ollama + Frontend integration

Write-Host "🚀 Starting Complete MCP Frontend Demo" -ForegroundColor Green
Write-Host "====================================" -ForegroundColor Green

# Check if Ollama is running
Write-Host "`n1. Checking Ollama..." -ForegroundColor Yellow
try {
    $ollamaResponse = Invoke-WebRequest -Uri "http://127.0.0.1:11434/api/version" -UseBasicParsing -TimeoutSec 5
    Write-Host "✅ Ollama is running" -ForegroundColor Green
}
catch {
    Write-Host "❌ Ollama is not running. Please start it with: ollama serve" -ForegroundColor Red
    exit 1
}

# Kill any existing Node.js processes to start fresh
Write-Host "`n2. Cleaning up existing processes..." -ForegroundColor Yellow
try {
    taskkill /F /IM node.exe 2>$null
    Write-Host "✅ Cleaned up existing Node.js processes" -ForegroundColor Green
}
catch {
    Write-Host "ℹ️  No existing Node.js processes to clean up" -ForegroundColor Cyan
}

Start-Sleep -Seconds 2

# Start minimal web API server
Write-Host "`n3. Starting Minimal Web API Server..." -ForegroundColor Yellow
$webApiServer = Start-Process -FilePath "node" -ArgumentList "minimal-web-api.js" -PassThru -WindowStyle Hidden
Write-Host "✅ Web API Server started (PID: $($webApiServer.Id))" -ForegroundColor Green

# Wait for web API to start
Start-Sleep -Seconds 3

# Test the web API
Write-Host "`n4. Testing Web API..." -ForegroundColor Yellow
try {
    $healthResponse = Invoke-RestMethod -Uri "http://localhost:3002/api/health" -Method GET -TimeoutSec 5
    Write-Host "✅ Web API is responding" -ForegroundColor Green
}
catch {
    Write-Host "❌ Web API is not responding" -ForegroundColor Red
    exit 1
}

# Start frontend server
Write-Host "`n5. Starting Frontend Server..." -ForegroundColor Yellow
$frontendServer = Start-Process -FilePath "node" -ArgumentList "frontend-server.js" -PassThru -WindowStyle Hidden
Write-Host "✅ Frontend Server started (PID: $($frontendServer.Id))" -ForegroundColor Green

# Wait for frontend server to start
Start-Sleep -Seconds 2

Write-Host "`n🎉 All services are running!" -ForegroundColor Green
Write-Host "====================================" -ForegroundColor Green
Write-Host "🌐 Frontend URL: http://localhost:3001" -ForegroundColor Cyan
Write-Host "📡 API Server: http://localhost:3002" -ForegroundColor Cyan
Write-Host ""
Write-Host "📋 Available API endpoints:" -ForegroundColor White
Write-Host "   GET  http://localhost:3002/api/health" -ForegroundColor Gray
Write-Host "   GET  http://localhost:3002/api/tools" -ForegroundColor Gray
Write-Host "   GET  http://localhost:3002/api/ollama/models" -ForegroundColor Gray
Write-Host "   POST http://localhost:3002/api/chat" -ForegroundColor Gray
Write-Host "   POST http://localhost:3002/api/chat/smart" -ForegroundColor Gray
Write-Host ""
Write-Host "💡 Usage:" -ForegroundColor White
Write-Host "   1. Open http://localhost:3001 in your browser" -ForegroundColor Gray
Write-Host "   2. Try asking: 'Hello, how are you?'" -ForegroundColor Gray
Write-Host "   3. Test: 'Tell me a joke'" -ForegroundColor Gray
Write-Host ""
Write-Host "🔧 Technical Details:" -ForegroundColor White
Write-Host "   • Frontend: HTML + JavaScript chat interface" -ForegroundColor Gray
Write-Host "   • API: Express.js server with CORS enabled" -ForegroundColor Gray
Write-Host "   • AI: Ollama with gemma3:4b model" -ForegroundColor Gray
Write-Host "   • Future: MCP tools integration ready" -ForegroundColor Gray
Write-Host ""
Write-Host "Press Ctrl+C to stop all services..." -ForegroundColor Yellow

# Open browser automatically
try {
    Start-Process "http://localhost:3001"
    Write-Host "🌐 Opened browser to frontend" -ForegroundColor Green
}
catch {
    Write-Host "ℹ️  Please manually open http://localhost:3001 in your browser" -ForegroundColor Cyan
}

# Keep script running and handle Ctrl+C
try {
    while ($true) {
        Start-Sleep -Seconds 1
    }
}
finally {
    Write-Host "`n🔄 Stopping all services..." -ForegroundColor Yellow
    
    if ($frontendServer -and !$frontendServer.HasExited) {
        Stop-Process -Id $frontendServer.Id -Force
        Write-Host "✅ Frontend Server stopped" -ForegroundColor Green
    }
    
    if ($webApiServer -and !$webApiServer.HasExited) {
        Stop-Process -Id $webApiServer.Id -Force
        Write-Host "✅ Web API Server stopped" -ForegroundColor Green
    }
    
    Write-Host "👋 Demo stopped" -ForegroundColor Green
}
