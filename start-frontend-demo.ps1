# PowerShell script to start all services for frontend demo
# Run this script to start MCP server, example service, and web API

Write-Host "🚀 Starting MCP + Ollama Frontend Demo" -ForegroundColor Green
Write-Host "=====================================" -ForegroundColor Green

# Check if Ollama is running
Write-Host "`n1. Checking Ollama..." -ForegroundColor Yellow
try {
    $ollamaResponse = Invoke-WebRequest -Uri "http://localhost:11434/api/version" -UseBasicParsing -TimeoutSec 5
    Write-Host "✅ Ollama is running" -ForegroundColor Green
}
catch {
    Write-Host "❌ Ollama is not running. Please start it with: ollama serve" -ForegroundColor Red
    Write-Host "Press any key to continue anyway..."
    $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
}

# Start example service in background
Write-Host "`n2. Starting Example Service..." -ForegroundColor Yellow
$exampleService = Start-Process -FilePath "node" -ArgumentList "example-service.js" -PassThru -WindowStyle Minimized
Write-Host "✅ Example Service started (PID: $($exampleService.Id))" -ForegroundColor Green

# Wait a moment for service to start
Start-Sleep -Seconds 2

# Start web API server in background
Write-Host "`n3. Starting Web API Server..." -ForegroundColor Yellow
$webApiServer = Start-Process -FilePath "node" -ArgumentList "minimal-web-api.js" -PassThru -WindowStyle Minimized
Write-Host "✅ Web API Server started (PID: $($webApiServer.Id))" -ForegroundColor Green

# Wait a moment for web API to start
Start-Sleep -Seconds 3

Write-Host "`n🎉 All services started!" -ForegroundColor Green
Write-Host "=====================================" -ForegroundColor Green
Write-Host "📱 Frontend Demo: Open frontend-example.html in your browser" -ForegroundColor Cyan
Write-Host "🌐 Web API: http://localhost:3002" -ForegroundColor Cyan
Write-Host "🔧 Example Service: http://localhost:3000" -ForegroundColor Cyan
Write-Host ""
Write-Host "📋 Available endpoints:" -ForegroundColor White
Write-Host "   GET  http://localhost:3002/api/health" -ForegroundColor Gray
Write-Host "   POST http://localhost:3002/api/chat/smart" -ForegroundColor Gray
Write-Host "   GET  http://localhost:3002/api/tools" -ForegroundColor Gray
Write-Host ""
Write-Host "💡 Example frontend usage:" -ForegroundColor White
Write-Host "   Open frontend-example.html and ask: 'Is my API running okay?'" -ForegroundColor Gray
Write-Host ""
Write-Host "Press Ctrl+C to stop all services..." -ForegroundColor Yellow

# Keep script running and handle Ctrl+C
try {
    while ($true) {
        Start-Sleep -Seconds 1
    }
}
finally {
    Write-Host "`n🔄 Stopping services..." -ForegroundColor Yellow
    
    if ($exampleService -and !$exampleService.HasExited) {
        Stop-Process -Id $exampleService.Id -Force
        Write-Host "✅ Example Service stopped" -ForegroundColor Green
    }
    
    if ($webApiServer -and !$webApiServer.HasExited) {
        Stop-Process -Id $webApiServer.Id -Force
        Write-Host "✅ Web API Server stopped" -ForegroundColor Green
    }
    
    Write-Host "👋 Demo stopped" -ForegroundColor Green
}
