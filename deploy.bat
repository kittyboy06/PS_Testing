@echo off
title GitHub Pages Deployer
echo ===================================================
echo   AI Evaluation Engine - GitHub Pages Deployer
echo ===================================================
echo.

:: 1. Clear gh-pages cache to prevent branch conflicts
if exist "node_modules\.cache\gh-pages" (
    echo [1/3] Clearing gh-pages build cache...
    rmdir /s /q "node_modules\.cache\gh-pages"
    echo Cache cleared successfully.
) else (
    echo [1/3] No gh-pages build cache found. Skipping clear.
)
echo.

:: 2. Check for git repository remote
echo [2/3] Verifying git remote configuration...
git remote -v >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Git remote is not configured! 
    echo Please run: git remote add origin ^<your-repo-url^>
    echo.
    pause
    exit /b %errorlevel%
)
echo Git remote verified.
echo.

:: 3. Run deploy command
echo [3/3] Building production bundle and publishing to gh-pages...
call npm run deploy

if %errorlevel% neq 0 (
    echo.
    echo [ERROR] Deployment failed! See logs above.
    echo.
    pause
    exit /b %errorlevel%
)

echo.
echo ===================================================
echo [SUCCESS] Deployed successfully to GitHub Pages!
echo ===================================================
echo Your app is being published by GitHub.
echo It will be live at: https://kittyboy06.github.io/PS_Testing/
echo.
pause
