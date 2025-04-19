# PowerShell script to start Next.js dev server and ngrok automatically (Windows robust)
# Kills any existing ngrok/Next.js processes, then starts both with error handling

Write-Host "[Cascade] Killing existing Next.js (node) processes..."
Get-Process -Name node -ErrorAction SilentlyContinue | Stop-Process -Force

Write-Host "[Cascade] Killing existing ngrok processes..."
Get-Process -Name ngrok -ErrorAction SilentlyContinue | Stop-Process -Force

Write-Host "[Cascade] Starting Next.js dev server (npx next dev)..."
try {
    Start-Process -NoNewWindow -FilePath "cmd.exe" -ArgumentList "/c npx next dev" -WorkingDirectory "."
    Write-Host "[Cascade] Next.js dev server started."
} catch {
    Write-Host "[Cascade] ERROR: Failed to start Next.js dev server. Check if npx/next is installed."
}

Start-Sleep -Seconds 8  # Give Next.js more time to start

Write-Host "[Cascade] Starting ngrok tunnel (ngrok.exe http 3000)..."
if (!(Test-Path ".\ngrok.exe")) {
    Write-Host "[Cascade] ERROR: ngrok.exe not found in project root. Please download it from https://ngrok.com/download and place it here."
    exit 1
}
try {
    Start-Process -FilePath ".\ngrok.exe" -ArgumentList "http 3000" -WorkingDirectory "."
    Write-Host "[Cascade] ngrok started in a new window."
} catch {
    Write-Host "[Cascade] ERROR: Failed to start ngrok.exe."
}

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
# Read TELEGRAM_BOT_TOKEN from .env
$envPath = Join-Path $PSScriptRoot ".env"
$envLines = Get-Content -Path $envPath -Encoding UTF8 | ForEach-Object { $_.Trim() }
$tokenLine = $envLines | Where-Object { $_ -match '^TELEGRAM_BOT_TOKEN=' }
if (-not $tokenLine) {
    Write-Host "[Cascade] ERROR: TELEGRAM_BOT_TOKEN not found in .env file. Please add it."
    exit 1
}
Write-Host "DEBUG: tokenLine = '$tokenLine'"
$BotToken = $tokenLine -replace '^TELEGRAM_BOT_TOKEN=', ''
$BotToken = $BotToken.Trim()
Write-Host "DEBUG: BotToken = $BotToken"
if (-not $BotToken) {
    Write-Host "[Cascade] ERROR: TELEGRAM_BOT_TOKEN is empty in .env file."
    exit 1
}
$webhookUrl = "$publicUrl/api/telegram"
$setWebhookUrl = "https://api.telegram.org/bot$BotToken/setWebhook"
Write-Host "[Cascade] Setting Telegram webhook to: $webhookUrl"
Write-Host "DEBUG: setWebhookUrl = $setWebhookUrl"
Write-Host "DEBUG: BotToken = $BotToken"
try {
    $response = Invoke-RestMethod -Uri $setWebhookUrl -Method Post -Body @{ url = $webhookUrl }
    if ($response.ok -eq $true) {
        Write-Host "[Cascade] Telegram webhook set successfully!"
    } else {
        Write-Host "[Cascade] ERROR: Telegram API did not confirm webhook: $($response | ConvertTo-Json)"
        exit 1
    }
} catch {
    Write-Host "[Cascade] ERROR: Failed to set Telegram webhook via API."
    Write-Host $_
    exit 1
}
Write-Host "[Cascade] All services started and Telegram webhook set. You can now chat with your bot."
