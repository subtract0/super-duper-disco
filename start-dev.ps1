# PowerShell script to start Next.js dev server and ngrok automatically (Windows robust)
# Tracks PIDs for node/ngrok, validates .env, logs to file, and kills only those started by this script

$logPath = Join-Path $PSScriptRoot "cascade-dev.log"
Start-Transcript -Path $logPath -Append | Out-Null

function Stop-PreviousProcesses {
    $pidFile = Join-Path $PSScriptRoot ".cascade-pids.json"
    if (Test-Path $pidFile) {
        try {
            $pids = Get-Content $pidFile | ConvertFrom-Json
            foreach ($entry in $pids) {
                if ($entry.Name -and $entry.PID) {
                    $proc = Get-Process -Id $entry.PID -ErrorAction SilentlyContinue
                    if ($proc) {
                        Write-Host "[Cascade] Stopping previous $($entry.Name) process (PID=$($entry.PID))..."
                        Stop-Process -Id $entry.PID -Force
                    }
                }
            }
            Remove-Item $pidFile -Force
        } catch {
            Write-Host "[Cascade] Warning: Could not clean up previous PIDs. $_"
        }
    }
}

Stop-PreviousProcesses

Write-Host "[Cascade] Killing existing Next.js (node) processes..."
Get-Process -Name node -ErrorAction SilentlyContinue | Stop-Process -Force

Write-Host "[Cascade] Killing existing ngrok processes..."
Get-Process -Name ngrok -ErrorAction SilentlyContinue | Stop-Process -Force

Write-Host "[Cascade] Starting Next.js dev server (npx next dev)..."
$pidFile = Join-Path $PSScriptRoot ".cascade-pids.json"
$pids = @()
try {
    $nodeProc = Start-Process -NoNewWindow -FilePath "cmd.exe" -ArgumentList "/c npx next dev" -WorkingDirectory "." -PassThru
    $pids += @{ Name = "node"; PID = $nodeProc.Id }
    Write-Host "[Cascade] Next.js dev server started (PID=$($nodeProc.Id))."
} catch {
    Write-Host "[Cascade] ERROR: Failed to start Next.js dev server. Check if npx/next is installed."
}

$maxWaitSeconds = 5
Write-Host "[Cascade] Waiting for $maxWaitSeconds seconds to allow Next.js to start..."
Start-Sleep -Seconds $maxWaitSeconds

Write-Host "[Cascade] Starting ngrok tunnel (ngrok.exe http 3000)..."
$ngrokPath = Resolve-Path -Path ".\ngrok.exe" -ErrorAction SilentlyContinue
if (-not $ngrokPath) {
    Write-Host "[Cascade] ERROR: ngrok.exe not found in project root. Please download it from https://ngrok.com/download and place it here."
    Stop-Transcript | Out-Null
    exit 1
}
# Check for existing ngrok tunnel
$ngrokApiUrl = 'http://127.0.0.1:4040/api/tunnels'
$ngrokTunnelExists = $false
try {
    $existingNgrok = Invoke-RestMethod -Uri $ngrokApiUrl -Method Get -ErrorAction Stop
    if ($existingNgrok.tunnels.Count -gt 0) {
        $ngrokTunnelExists = $true
        Write-Host "[Cascade] Existing ngrok tunnel found. Reusing it."
    }
} catch {
    $ngrokTunnelExists = $false
}
if (-not $ngrokTunnelExists) {
    try {
        $ngrokProc = Start-Process -FilePath $ngrokPath -ArgumentList "http 3000" -WorkingDirectory "." -PassThru
        $pids += @{ Name = "ngrok"; PID = $ngrokProc.Id }
        Write-Host "[Cascade] ngrok started (PID=$($ngrokProc.Id))."
    } catch {
        Write-Host "[Cascade] ERROR: Failed to start ngrok.exe."
        Stop-Transcript | Out-Null
        exit 1
    }
} else {
    Write-Host "[Cascade] Skipping ngrok start since tunnel exists."
}
# Save PIDs
$pids | ConvertTo-Json | Set-Content -Path $pidFile

# --- Automated Telegram webhook setup ---
Write-Host "[Cascade] Waiting for ngrok tunnel to become available..."
$ngrokApiUrl = 'http://127.0.0.1:4040/api/tunnels'
$maxRetries = 15
$retryDelay = 1
$ngrokReady = $false
$response = $null
for ($i = 0; $i -lt $maxRetries; $i++) {
    try {
        $response = Invoke-RestMethod -Uri $ngrokApiUrl -Method Get -ErrorAction Stop
        $ngrokReady = $true
        break
    } catch {
        Start-Sleep -Seconds $retryDelay
    }
}
if (-not $ngrokReady) {
    Write-Host "[Cascade] ERROR: Could not connect to ngrok API at $ngrokApiUrl after $($maxRetries * $retryDelay) seconds. Is ngrok running?"
    exit 1
}
$publicUrl = $response.tunnels | Where-Object { $_.proto -eq 'https' } | Select-Object -ExpandProperty public_url
if (-not $publicUrl) {
    Write-Host "[Cascade] ERROR: No HTTPS ngrok tunnel found."
    exit 1
}
# --- .env validation ---
$envPath = Join-Path $PSScriptRoot ".env"
if (!(Test-Path $envPath)) {
    Write-Host "[Cascade] ERROR: .env file not found!"
    Stop-Transcript | Out-Null
    exit 1
}
$envLines = Get-Content -Path $envPath -Encoding UTF8 | ForEach-Object { $_.Trim() }
$envMap = @{}
foreach ($line in $envLines) {
    if ($line -match "^(.*?)=(.*)$") {
        $envMap[$matches[1]] = $matches[2]
    }
}
$requiredKeys = @(
    'TELEGRAM_BOT_TOKEN',
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'OPENAI_API_KEY',
    'WHISPER_API_KEY'
)
$missing = @()
foreach ($key in $requiredKeys) {
    if (-not $envMap[$key] -or $envMap[$key].Trim() -eq "") {
        $missing += $key
    }
}
if ($missing.Count -gt 0) {
    Write-Host "[Cascade] ERROR: The following required keys are missing or empty in .env: $($missing -join ", ")"
    Stop-Transcript | Out-Null
    exit 1
}
$BotToken = $envMap['TELEGRAM_BOT_TOKEN']
# Write-Host "DEBUG: BotToken = $BotToken"  # Uncomment for troubleshooting
$webhookUrl = "$publicUrl/api/telegram"
$setWebhookUrl = "https://api.telegram.org/bot$BotToken/setWebhook"
Write-Host "[Cascade] Setting Telegram webhook to: $webhookUrl"
# Write-Host "DEBUG: setWebhookUrl = $setWebhookUrl"  # Uncomment for troubleshooting
# Write-Host "DEBUG: BotToken = $BotToken"  # Uncomment for troubleshooting
try {
    $response = Invoke-RestMethod -Uri $setWebhookUrl -Method Post -Body @{ url = $webhookUrl }
    if ($response.ok -eq $true) {
        Write-Host "[Cascade] Telegram webhook set successfully!"
    } else {
        Write-Host "[Cascade] ERROR: Telegram API did not confirm webhook: $($response | ConvertTo-Json)"
        Stop-Transcript | Out-Null
        exit 1
    }
} catch {
    Write-Host "[Cascade] ERROR: Failed to set Telegram webhook via API."
    Write-Host $_
    Stop-Transcript | Out-Null
    exit 1
}
Write-Host "[Cascade] All services started and Telegram webhook set. You can now chat with your bot."
Write-Host ""
Write-Host "[Cascade] --- SUMMARY ---"
Write-Host "Next.js dev server: http://localhost:3000"
Write-Host "ngrok public URL: $publicUrl"
Write-Host "Telegram webhook: $webhookUrl"
Write-Host "To stop all started processes, re-run this script or delete .cascade-pids.json and kill lingering node/ngrok processes."
Stop-Transcript | Out-Null
