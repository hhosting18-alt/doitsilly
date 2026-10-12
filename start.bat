@echo off
REM DOITSILLY website - local preview
REM Double-click this file. It unpacks the art (first run only), starts a small web server and opens your browser.
cd /d "%~dp0"
set PORT=8000

if not exist "art\map\base-r2-c1.webp" (
  if exist "doitsilly-art.zip" (
    echo Unpacking doitsilly-art.zip ...
    powershell -NoProfile -ExecutionPolicy Bypass -Command "Expand-Archive -LiteralPath 'doitsilly-art.zip' -DestinationPath '.' -Force"
  )
)
if not exist "art\map\base-r2-c1.webp" (
  echo The art folder is missing. Put doitsilly-art.zip in this folder and run this file again.
  pause
  goto :eof
)

REM "python" can be a Windows Store shortcut that doesn't actually run, so test it before using it.
python -c "import sys; sys.exit(0 if sys.version_info >= (3, 7) else 1)" >nul 2>nul
if %errorlevel%==0 (
  python serve.py %PORT%
  goto :end
)
py -3 -c "import sys" >nul 2>nul
if %errorlevel%==0 (
  py -3 serve.py %PORT%
  goto :end
)
where npx >nul 2>nul
if %errorlevel%==0 (
  echo Starting DOITSILLY at http://localhost:%PORT%  (press Ctrl+C to stop)
  npx --yes http-server -p %PORT% -c-1 --silent -o / .
  goto :end
)
echo Could not find Python 3.7+ or Node.js.
echo Install Python from https://www.python.org/downloads/ (tick "Add python.exe to PATH"), then run this file again.

:end
pause
