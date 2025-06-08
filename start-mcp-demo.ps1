# MCP Bridge Demo Startup Script
# This script starts the complete MCP integration with dual frontends

Write-Host "🚀 Starting MCP Bridge Demo with Dual Frontends" -ForegroundColor Cyan
Write-Host "=============================================" -ForegroundColor Cyan
Write-Host ""

# Function to check if a port is in use
function Test-Port {
    param([int]$Port)
    try {
        $connection = New-Object System.Net.Sockets.TcpClient
        $connection.Connect("127.0.0.1", $Port)
        $connection.Close()
        return $true
    }
    catch {
        return $false
    }
}

# Check if required ports are available
$ports = @(3000, 3002, 3001, 3003, 11434)
$portsInUse = @()

foreach ($port in $ports) {
    if (Test-Port $port) {
        $portsInUse += $port
    }
}

if ($portsInUse.Count -gt 0) {
    Write-Host "⚠️  Warning: The following ports are already in use:" -ForegroundColor Yellow
    $portsInUse | ForEach-Object { Write-Host "   Port $_" -ForegroundColor Yellow }
    Write-Host ""
    Write-Host "You may need to stop existing services or they might conflict." -ForegroundColor Yellow
    Write-Host "Press Enter to continue anyway, or Ctrl+C to cancel..."
    Read-Host
}

# Check if Ollama is running
Write-Host "🔍 Checking Ollama status..." -ForegroundColor White
try {
    $ollamaCheck = Invoke-RestMethod -Uri "http://localhost:11434/api/tags" -Method GET -TimeoutSec 5
    Write-Host "✅ Ollama is running with models:" -ForegroundColor Green
    $ollamaCheck.models | ForEach-Object { Write-Host "   - $($_.name)" -ForegroundColor Gray }
}
catch {
    Write-Host "❌ Ollama is not running or not accessible" -ForegroundColor Red
    Write-Host "   Please start Ollama first: ollama serve" -ForegroundColor Yellow
    Write-Host "   And pull a model: ollama pull gemma3:4b" -ForegroundColor Yellow
    exit 1
}

Write-Host ""
Write-Host "🏗️  Building MCP server..." -ForegroundColor White
npm run build

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Build failed" -ForegroundColor Red
    exit 1
}

Write-Host "✅ Build completed" -ForegroundColor Green
Write-Host ""

# Start the services in background
Write-Host "🚀 Starting services..." -ForegroundColor White
Write-Host ""

# Start example service (port 3000)
Write-Host "1️⃣  Starting Example Service (port 3000)..." -ForegroundColor Cyan
Start-Process -FilePath "node" -ArgumentList "example-service.js" -WindowStyle Minimized
Start-Sleep -Seconds 2

# Start MCP bridge API server (port 3002)
Write-Host "2️⃣  Starting MCP Bridge API Server (port 3002)..." -ForegroundColor Cyan
Start-Process -FilePath "node" -ArgumentList "web-api-server.js" -WindowStyle Minimized
Start-Sleep -Seconds 3

# Start minimal frontend (port 3001)
Write-Host "3️⃣  Starting Minimal Frontend (port 3001)..." -ForegroundColor Cyan
Start-Process -FilePath "node" -ArgumentList "frontend-server.js" -WindowStyle Minimized
Start-Sleep -Seconds 2

# Start MCP bridge frontend (port 3003)
Write-Host "4️⃣  Starting MCP Bridge Frontend (port 3003)..." -ForegroundColor Cyan
Start-Process -FilePath "node" -ArgumentList "frontend-mcp-server.js" -WindowStyle Minimized
Start-Sleep -Seconds 2

Write-Host ""
Write-Host "🎉 All services started!" -ForegroundColor Green
Write-Host ""

# Test connectivity
Write-Host "🔍 Testing connectivity..." -ForegroundColor White

$services = @(
    @{ Name = "Example Service"; Url = "http://localhost:3000/health"; Port = 3000 },
    @{ Name = "MCP Bridge API"; Url = "http://localhost:3002/api/health"; Port = 3002 },
    @{ Name = "Minimal Frontend"; Url = "http://localhost:3001/health"; Port = 3001 },
    @{ Name = "MCP Frontend"; Url = "http://localhost:3003/health"; Port = 3003 }
)

foreach ($service in $services) {
    try {
        $response = Invoke-RestMethod -Uri $service.Url -Method GET -TimeoutSec 10
        Write-Host "✅ $($service.Name) - OK" -ForegroundColor Green
    }
    catch {
        Write-Host "❌ $($service.Name) - Failed" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "🌐 Frontend URLs:" -ForegroundColor White
Write-Host "   📱 Minimal Frontend (Mock Tools):  http://localhost:3001" -ForegroundColor Cyan
Write-Host "   🔗 MCP Bridge Frontend (Real MCP): http://localhost:3003" -ForegroundColor Magenta
Write-Host ""
Write-Host "🔧 API Endpoints:" -ForegroundColor White
Write-Host "   📡 Example Service:     http://localhost:3000" -ForegroundColor Gray
Write-Host "   🚀 MCP Bridge API:      http://localhost:3002" -ForegroundColor Gray
Write-Host ""
Write-Host "📊 Architecture:" -ForegroundColor White
Write-Host "   Minimal: Frontend(3001) → minimal-web-api(3002) → Ollama(11434)" -ForegroundColor Gray
Write-Host "   MCP:     Frontend(3003) → web-api-server(3002) → MCP Tools → Ollama(11434)" -ForegroundColor Gray
Write-Host "            ↳ Connects to: example-service(3000)" -ForegroundColor Gray
Write-Host ""
Write-Host "💡 Usage:" -ForegroundColor White
Write-Host "   1. Open both frontends in separate browser tabs" -ForegroundColor Gray
Write-Host "   2. Compare mock tools vs real MCP tools" -ForegroundColor Gray
Write-Host "   3. Test queries: 'Is my API running okay?'" -ForegroundColor Gray
Write-Host "   4. Try: 'Check my service health'" -ForegroundColor Gray
Write-Host ""
Write-Host "🔧 To stop services:" -ForegroundColor White
Write-Host "   taskkill /F /IM node.exe" -ForegroundColor Gray
Write-Host ""
Write-Host "📋 Log locations:" -ForegroundColor White
Write-Host "   All services running in minimized windows" -ForegroundColor Gray
Write-Host "   Check Task Manager for node.exe processes" -ForegroundColor Gray
Write-Host ""
Write-Host "✨ Demo ready! Open the URLs above to start testing." -ForegroundColor Green
