#!/usr/bin/env powershell
# run-tests.ps1 - Test runner with clear summary

Write-Host "🧪 Running MCP Server Test Suite" -ForegroundColor Cyan
Write-Host "=================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "📋 Known Issue: Jest worker exit warning is expected (cosmetic only)" -ForegroundColor Yellow
Write-Host "✅ All functional tests should pass despite the warning" -ForegroundColor Green
Write-Host ""

# Run tests and capture exit code
npm test
$testExitCode = $LASTEXITCODE

Write-Host ""
Write-Host "🏁 Test Run Complete" -ForegroundColor Cyan
Write-Host "===================" -ForegroundColor Cyan

if ($testExitCode -eq 0) {
    Write-Host "✅ Tests PASSED - Application is working correctly" -ForegroundColor Green
    Write-Host "⚠️  Worker exit warning is a known Jest/TypeScript/Windows limitation" -ForegroundColor Yellow
}
else {
    Write-Host "❌ Tests FAILED - Check output above for details" -ForegroundColor Red
}

Write-Host ""
Write-Host "📖 For details see: JEST_WORKER_EXIT_ANALYSIS.md" -ForegroundColor Blue

exit $testExitCode
