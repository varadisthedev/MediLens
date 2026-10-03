# Runs the whole stack: Ollama (Gemma) + Next.js dev server.  Usage: .\run.ps1
Set-Location $PSScriptRoot

# Model name comes from .env.local (same source the app uses)
$model = (Select-String -Path .env.local -Pattern '^OLLAMA_MODEL=(.+)$' -ErrorAction SilentlyContinue).Matches.Groups[1].Value
if (-not $model) { $model = 'gemma4-e2b-it-q8-vision' }

# 1. Ollama server (skip if already up)
try { Invoke-RestMethod http://localhost:11434/api/tags -TimeoutSec 2 | Out-Null }
catch {
  Write-Host 'Starting Ollama...'
  Start-Process ollama -ArgumentList 'serve' -WindowStyle Hidden
  1..30 | ForEach-Object {
    try { Invoke-RestMethod http://localhost:11434/api/tags -TimeoutSec 2 | Out-Null; return } catch { Start-Sleep 1 }
  }
}

# 2. Warm up Gemma (loads into memory, keeps it there) so first request isn't slow
if (-not ((ollama list) -match [regex]::Escape($model))) { Write-Error "Ollama model '$model' not found. Create/pull it first."; exit 1 }
Write-Host "Loading $model..."
Invoke-RestMethod http://localhost:11434/api/generate -Method Post -Body (@{ model = $model; keep_alive = '1h' } | ConvertTo-Json) -ContentType 'application/json' | Out-Null

# 3. Next.js app
if (-not (Test-Path node_modules)) { npm install }
npm run dev
