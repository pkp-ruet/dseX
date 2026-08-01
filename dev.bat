@echo off
setlocal EnableExtensions

rem --- grab the ANSI escape char (Windows 10+ terminals render these) ---
for /F "delims=#" %%E in ('"prompt #$E# & for %%E in (1) do rem"') do set "ESC=%%E"

set "R=%ESC%[0m"
set "B=%ESC%[1m"
set "DIM=%ESC%[38;2;110;115;130m"
set "BLUE=%ESC%[38;2;96;165;250m"
set "CYAN=%ESC%[38;2;34;211;238m"
set "GREEN=%ESC%[38;2;74;222;128m"
set "RED=%ESC%[38;2;248;113;113m"
set "TXT=%ESC%[38;2;228;228;231m"
set "RULE=%DIM%------------------------------------------------------%R%"

cls
echo(
echo(%B%%CYAN%   ___   ___  ___ __  __%R%
echo(%B%%CYAN%  ^|   \ / __^|^| __^|\ \/ /%R%
echo(%B%%CYAN%  ^| ^|) ^|\__ \^| _^|  ^>  ^< %R%
echo(%B%%CYAN%  ^|___/ ^|___/^|___^|/_/\_\%R%
echo(
echo(   %DIM%local dev environment%R%
echo(
echo(  %RULE%
echo(
echo(  %BLUE%[1/3]%R% %TXT%Frontend dependencies%R%  %DIM%npm install%R%
echo(

pushd "%~dp0frontend"
call npm install
if errorlevel 1 (
    echo(
    echo(  %RED%%B%FAILED%R% %RED%npm install did not finish - not starting anything.%R%
    echo(
    popd
    pause
    exit /b 1
)
popd

echo(
echo(  %GREEN%%B%OK%R%    %DIM%dependencies ready%R%
echo(
echo(  %BLUE%[2/3]%R% %TXT%Backend%R%   %DIM%FastAPI%R%  %GREEN%http://localhost:8000%R%
start "DSE Backend" cmd /k "cd /d ""%~dp0"" && python -m uvicorn backend.main:app --reload"

echo(  %BLUE%[3/3]%R% %TXT%Frontend%R%  %DIM%Next.js%R%  %GREEN%http://localhost:3000%R%
start "DSE Frontend" cmd /k "cd /d ""%~dp0frontend"" && set NEXT_PUBLIC_API_URL=http://localhost:8000&& set API_URL=http://localhost:8000&& npm run dev"

echo(
echo(  %RULE%
echo(  %DIM%two windows opened - close a window to stop that service%R%
echo(
timeout /t 6 >nul
