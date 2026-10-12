# DOITSILLY website - local preview (PowerShell)
# Run:  powershell -ExecutionPolicy Bypass -File .\start.ps1
Set-Location -Path $PSScriptRoot
$port = 8000
if (-not (Test-Path "art\map\base-r2-c1.webp")) { Write-Host "The art folder is missing. Unzip doitsilly-art.zip into this folder, then run again."; exit 1 }

function Test-Runs($exe, $argsList) { try { & $exe @argsList *> $null; return $LASTEXITCODE -eq 0 } catch { return $false } }

if (Test-Runs "python" @("-c", "import sys; sys.exit(0 if sys.version_info >= (3, 7) else 1)")) { python serve.py $port }
elseif (Test-Runs "py" @("-3", "-c", "import sys")) { py -3 serve.py $port }
elseif (Get-Command npx -ErrorAction SilentlyContinue) { npx --yes http-server -p $port -c-1 --silent -o / . }
else { Write-Host "Install Python 3.7+ (https://www.python.org/downloads/) and tick 'Add python.exe to PATH', then run again." }
