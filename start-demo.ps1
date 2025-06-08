#!/usr/bin/env pwsh

<#
.SYNOPSIS
    Complete setup and testing script for MCP Server + Ollama integration

.DESCRIPTION
    This script sets up and tests the complete MCP server integration with Ollama.
    It handles starting services, running tests, and providing clear instructions.

.PARAMETER Action
    The action to perform: setup, start, test, or full

.EXAMPLE
    .\start-demo.ps1 -Action full
    Runs the complete demo setup and test

.EXAMPLE
    .\start-demo.ps1 -Action start
    Just starts the required services
#>

param(
    [Parameter(Mandatory = $false)]
    [ValidateSet("setup", "start", "test", "full")]
    [string]$Action = "full"
)

# Colors for output
$Green = "`e[32m"
$Yellow = "`e[33m"
$Red = "`e[31m"
$Blue = "`e[34m"
$Reset = "`e[0m"

function Write-ColoredOutput {
    param($Message, $Color = $Reset)
    Write-Host "$Color$Message$Reset"
}

function Test-Port {
    param($Port, $Host = "localhost")
    try {
        $connection = New-Object System.Net.Sockets.TcpClient($Host, $Port)
        $connection.Close()
        return $true
    }
    catch {
        return $false
    }
}

function Wait-ForService {
    param($Name, $Port, $MaxWaitSeconds = 30)
    Write-ColoredOutput "Waiting for $Name to start..." $Yellow
    $waited = 0
    while (-not (Test-Port $Port) -and $waited -lt $MaxWaitSeconds) {
        Start-Sleep -Seconds 1
        $waited++
        Write-Host "." -NoNewline
    }
    Write-Host ""
    if (Test-Port $Port) {
        Write-ColoredOutput "✅ $Name is running on port $Port" $Green
        return $true
    }
    else {
        Write-ColoredOutput "❌ $Name failed to start within $MaxWaitSeconds seconds" $Red
        return $false
    }
}

function Start-ExampleService {
    Write-ColoredOutput "🚀 Starting example service..." $Blue
    $exampleService = Start-Process -FilePath "node" -ArgumentList "example-service.js" -PassThru -WindowStyle Hidden
    if (Wait-ForService "Example Service" 3000) {
        return $exampleService
    }
    else {
        $exampleService | Stop-Process -Force -ErrorAction SilentlyContinue
        return $null
    }
}

function Test-Ollama {
    Write-ColoredOutput "🔍 Checking Ollama..." $Blue
    if (Test-Port 11434) {
        try {
            $response = Invoke-RestMethod -Uri "http://localhost:11434/api/tags" -TimeoutSec 5
            $models = $response.models | ForEach-Object { $_.name }
            if ($models.Count -gt 0) {
                Write-ColoredOutput "✅ Ollama is running with models: $($models -join ', ')" $Green
                return $true
            }
            else {
                Write-ColoredOutput "⚠️  Ollama is running but no models are installed" $Yellow
                Write-ColoredOutput "   Install a model with: ollama pull llama2" $Yellow
                return $false
            }
        }
        catch {
            Write-ColoredOutput "⚠️  Ollama is not responding properly" $Yellow
            return $false
        }
    }
    else {
        Write-ColoredOutput "❌ Ollama is not running" $Red
        Write-ColoredOutput "   Start it with: ollama serve" $Yellow
        return $false
    }
}

function Start-Demo {
    Write-ColoredOutput "🎯 Starting MCP Server + Ollama Demo" $Blue
    Write-ColoredOutput "=" * 50 $Blue

    # Check if build exists
    if (-not (Test-Path "build/index.js")) {
        Write-ColoredOutput "📦 Building MCP server..." $Yellow
        npm run build
        if ($LASTEXITCODE -ne 0) {
            Write-ColoredOutput "❌ Build failed" $Red
            exit 1
        }
    }
    else {
        Write-ColoredOutput "✅ MCP server is already built" $Green
    }

    # Start example service
    $exampleService = Start-ExampleService
    if (-not $exampleService) {
        Write-ColoredOutput "❌ Failed to start example service" $Red
        exit 1
    }

    # Check Ollama
    $ollamaReady = Test-Ollama

    # Run integration test
    Write-ColoredOutput "🧪 Running integration test..." $Blue
    node test-integration.js

    # Provide next steps
    Write-ColoredOutput "`n🎉 Demo setup complete!" $Green
    Write-ColoredOutput "=" * 50 $Green

    Write-ColoredOutput "`n📋 What's running:" $Blue
    Write-ColoredOutput "   ✅ Example service: http://localhost:3000" $Green
    Write-ColoredOutput "   ✅ MCP server: ready for connections" $Green
    if ($ollamaReady) {
        Write-ColoredOutput "   ✅ Ollama: http://localhost:11434" $Green
    }
    else {
        Write-ColoredOutput "   ⚠️  Ollama: not available" $Yellow
    }

    Write-ColoredOutput "`n🚀 Try these commands:" $Blue
    Write-ColoredOutput "   # Test the example service:" $Yellow
    Write-ColoredOutput "   curl http://localhost:3000/health" $Reset
    Write-ColoredOutput "   # Test MCP server:" $Yellow
    Write-ColoredOutput "   npm run test-integration" $Reset
    Write-ColoredOutput "   # Start MCP server in dev mode:" $Yellow
    Write-ColoredOutput "   npm run dev" $Reset

    if (-not $ollamaReady) {
        Write-ColoredOutput "`n🔧 To enable Ollama integration:" $Yellow
        Write-ColoredOutput "   1. Start Ollama: ollama serve" $Reset
        Write-ColoredOutput "   2. Pull a model: ollama pull llama2" $Reset
        Write-ColoredOutput "   3. Run test again: npm run test-integration" $Reset
    }

    Write-ColoredOutput "`n📚 Documentation:" $Blue
    Write-ColoredOutput "   - Full integration guide: OLLAMA_INTEGRATION.md" $Reset
    Write-ColoredOutput "   - Project documentation: README.md" $Reset

    # Keep services running
    Write-ColoredOutput "`n⏸️  Press Ctrl+C to stop all services" $Yellow
    try {
        while ($true) {
            Start-Sleep -Seconds 1
        }
    }
    finally {
        Write-ColoredOutput "`n🛑 Stopping services..." $Yellow
        $exampleService | Stop-Process -Force -ErrorAction SilentlyContinue
        Write-ColoredOutput "✅ Services stopped" $Green
    }
}

function Run-TestOnly {
    Write-ColoredOutput "🧪 Running integration tests..." $Blue
    node test-integration.js
}

function Run-Setup {
    Write-ColoredOutput "🔧 Setting up MCP server..." $Blue
    npm run build
    Write-ColoredOutput "✅ Setup complete! Run with -Action start to begin demo" $Green
}

# Main execution
switch ($Action) {
    "setup" { Run-Setup }
    "test" { Run-TestOnly }
    "start" { Start-Demo }
    "full" { 
        Run-Setup
        Start-Demo 
    }
    default { Start-Demo }
}
