@echo off
title Next Solution Store - Dev Server
cd /d "%~dp0"

echo ======================================================
echo     MENJALANKAN NEXT SOLUTION STORE (NEXT.JS)
echo ======================================================
echo.

:: Cek apakah file .env.local sudah ada
if not exist ".env.local" (
    echo [INFO] File .env.local belum ada.
    if exist ".env.example" (
        echo [INFO] Menyalin konfigurasi default dari .env.example...
        copy ".env.example" ".env.local" >nul
        echo [INFO] File .env.local berhasil dibuat.
    )
)

:: Cek apakah dependencies sudah terinstall
if not exist "node_modules\" (
    echo [INFO] Folder node_modules belum ditemukan.
    echo [INFO] Sedang menginstall dependencies, mohon tunggu...
    call npm install
    if %errorlevel% neq 0 (
        echo.
        echo [ERROR] Gagal menginstall dependencies!
        pause
        exit /b %errorlevel%
    )
)

echo.
echo [INFO] Membuka http://localhost:3000 di browser...
start http://localhost:3000

echo [INFO] Menjalankan server Next.js...
echo (Tekan Ctrl + C di terminal ini untuk mematikan server)
echo.

call npm run dev

if %errorlevel% neq 0 (
    echo.
    echo [ERROR] Server berhenti dengan kode error: %errorlevel%
    pause
)

