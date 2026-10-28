@echo off
echo ================================================================
echo  AICTE SMART APPROVAL & COMPLIANCE MANAGEMENT SYSTEM
echo  Problem Statement ID: 26262 | Regulation Bureau
echo ================================================================
echo [1/2] Seeding Database with Realistic Synthetic Data...
node src/database/seedData.js
echo.
echo [2/2] Launching AICTE Governance Platform Server on port 8080...
echo Access Web UI at: http://localhost:8080
node server.js
