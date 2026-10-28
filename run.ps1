# AICTE Smart Approval Platform PowerShell Launcher
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host " AICTE SMART APPROVAL & COMPLIANCE MANAGEMENT SYSTEM" -ForegroundColor Yellow
Write-Host " Problem Statement ID: 26262 | Regulation Bureau" -ForegroundColor Cyan
Write-Host "================================================================" -ForegroundColor Cyan

Write-Host "`n[1/2] Seeding Database with Realistic Synthetic Data..." -ForegroundColor Green
node src/database/seedData.js

Write-Host "`n[2/2] Launching AICTE Governance Platform Server on port 8080..." -ForegroundColor Green
Write-Host "Web Application live at: http://localhost:8080" -ForegroundColor Yellow
node server.js
