@echo off
title Next Solution Store - Server Manager
cd /d "%~dp0"

:: Cek konfigurasi .env.local
if not exist ".env.local" (
    if exist ".env.example" (
        copy ".env.example" ".env.local" >nul
    )
)

:: Cek dependencies
if not exist "node_modules\" (
    echo ======================================================
    echo   node_modules belum ditemukan. Menginstall...
    echo ======================================================
    call npm install
    if %errorlevel% neq 0 (
        echo [ERROR] Gagal menginstall dependencies.
        pause
        exit /b %errorlevel%
    )
)

:MENU
cls
echo ======================================================
echo       NEXT SOLUTION STORE - SERVER MANAGER
echo ======================================================
echo.

:: Cek status port 3000
netstat -ano | findstr :3000 | findstr LISTENING >nul
if %errorlevel% equ 0 (
    echo   STATUS: [ AKTIF ] Server berjalan di http://localhost:3000
) else (
    echo   STATUS: [ MATI ] Server tidak aktif (Port 3000 bebas)
)

echo.
echo ======================================================
echo   [1] Jalankan Server (Start)
echo   [2] Restart Server
echo   [3] Matikan Server (Stop / Bebaskan Port 3000)
echo   [4] Buka Website di Browser (http://localhost:3000)
echo   [5] Keluar (Exit / Matikan Server)
echo ======================================================
set "pilihan="
set /p "pilihan=Pilih menu [1-5]: "
if not defined pilihan goto MENU

if "%pilihan%"=="1" goto START_SERVER
if "%pilihan%"=="2" goto RESTART_SERVER
if "%pilihan%"=="3" goto STOP_SERVER
if "%pilihan%"=="4" goto OPEN_BROWSER
if "%pilihan%"=="5" goto EXIT_SCRIPT

echo.
echo [!] Pilihan tidak valid. Silakan masukkan angka 1 sampai 5.
ping -n 2 127.0.0.1 >nul
goto MENU

:START_SERVER
cls
echo ======================================================
echo            MENJALANKAN SERVER NEXT.JS
echo ======================================================
echo.

netstat -ano | findstr :3000 | findstr LISTENING >nul
if %errorlevel% equ 0 (
    echo [INFO] Server SUDAH BERJALAN di http://localhost:3000!
    echo [INFO] Gunakan menu nomor [2] jika ingin Restart.
    echo.
    pause
    goto MENU
)

echo [INFO] Membuka jendela server Next.js...
start "Next.js Dev Server (Port 3000)" cmd /k "title Next.js Dev Server (Port 3000) && npm run dev"

echo [INFO] Menunggu server siap...
ping -n 4 127.0.0.1 >nul

echo [INFO] Membuka browser ke http://localhost:3000...
start http://localhost:3000

echo.
echo [OK] Server Next.js telah berjalan di jendela terpisah!
echo Anda bisa memantau log / error compile di jendela server.
echo Gunakan menu ini kapan saja untuk Restart atau Matikan server.
echo.
pause
goto MENU

:RESTART_SERVER
cls
echo ======================================================
echo              RESTART SERVER NEXT.JS
echo ======================================================
echo.
echo [1/3] Menghentikan server yang sedang berjalan...
call :KILL_PROCESS

echo [2/3] Menunggu port 3000 bersih...
ping -n 3 127.0.0.1 >nul

echo [3/3] Menjalankan kembali server Next.js...
start "Next.js Dev Server (Port 3000)" cmd /k "title Next.js Dev Server (Port 3000) && npm run dev"
ping -n 4 127.0.0.1 >nul
start http://localhost:3000

echo.
echo [OK] Server berhasil di-restart!
echo.
pause
goto MENU

:STOP_SERVER
cls
echo ======================================================
echo             MEMATIKAN SERVER NEXT.JS
echo ======================================================
echo.
call :KILL_PROCESS
echo.
echo [OK] Server berhasil dimatikan dan Port 3000 sudah bebas!
echo.
pause
goto MENU

:OPEN_BROWSER
echo.
echo [INFO] Membuka http://localhost:3000 di browser...
start http://localhost:3000
ping -n 2 127.0.0.1 >nul
goto MENU

:EXIT_SCRIPT
cls
netstat -ano | findstr :3000 | findstr LISTENING >nul
if %errorlevel% equ 0 (
    echo ======================================================
    echo   Menutup dan mematikan server Next.js...
    echo ======================================================
    call :KILL_PROCESS
)
echo.
echo Sampai jumpa!
ping -n 2 127.0.0.1 >nul
exit /b 0

:KILL_PROCESS
echo [INFO] Menutup jendela Next.js Dev Server...
taskkill /f /fi "WINDOWTITLE eq Next.js Dev Server (Port 3000)*" >nul 2>&1

echo [INFO] Menghentikan proses pada Port 3000...
for /f "tokens=5" %%p in ('netstat -aon ^| findstr :3000 ^| findstr LISTENING') do (
    taskkill /f /pid %%p >nul 2>&1
)

:: Pastikan proses node pada port 3000 tuntas dimatikan
powershell -NoProfile -Command "Get-Process -Id (Get-NetTCPConnection -LocalPort 3000 -ErrorAction SilentlyContinue).OwningProcess -ErrorAction SilentlyContinue | Stop-Process -Force" >nul 2>&1

echo [INFO] Pembersihan selesai.
goto :eof
