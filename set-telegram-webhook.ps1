# PowerShell script to set Telegram webhook automatically using current ngrok URL
# Reads TELEGRAM_BOT_TOKEN from .env file in project root

# Load .env file
$envPath = Join-Path $PSScriptRoot ".env"
if (!(Test-Path $envPath)) {
  Write-Host ".env file not found in project root. Please create one with TELEGRAM_BOT_TOKEN."
  exit 1
}

$envLines = Get-Content -Path $envPath -Encoding UTF8 | ForEach-Object { $_.Trim() }
$tokenLine = $envLines | Where-Object { $_ -match '^TELEGRAM_BOT_TOKEN=' }
if (-not $tokenLine) {
    Write-Host "TELEGRAM_BOT_TOKEN not found in .env file. Please add it."
    exit 1
}
$tokenLine = $tokenLine -replace '^ ', ''
Write-Host "DEBUG: tokenLine = '$tokenLine'"
$BotToken = $tokenLine -replace '^TELEGRAM_BOT_TOKEN=', ''
$BotToken = $BotToken.Trim()
Write-Host "DEBUG: BotToken = $BotToken"
if (-not $BotToken) {
    Write-Host "TELEGRAM_BOT_TOKEN is empty in .env file."
    exit 1
}

# Get the current ngrok public URL from the local API, retry if not ready
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
  Write-Host "[Cascade] ERROR: Could not connect to ngrok API at $ngrokApiUrl after $($maxRetries * $retryDelay) seconds. Is ngrok running? Wait a few seconds and try again. You can check ngrok status at http://127.0.0.1:4040."
  exit 1
}

$publicUrl = $response.tunnels | Where-Object { $_.proto -eq 'https' } | Select-Object -ExpandProperty public_url

if (-not $publicUrl) {
  Write-Host "[Cascade] ERROR: No HTTPS ngrok tunnel found. Is ngrok running with an https tunnel? Wait a few seconds after starting ngrok, or check http://127.0.0.1:4040."
  exit 1
}

$webhookUrl = "$publicUrl/api/telegram"
$setWebhookUrl = "https://api.telegram.org/bot$BotToken/setWebhook"
Write-Host "Setting Telegram webhook to: $webhookUrl"
Write-Host "DEBUG: setWebhookUrl = $setWebhookUrl"
Write-Host "DEBUG: BotToken = $BotToken"
$response = Invoke-RestMethod -Uri $setWebhookUrl -Method Post -Body @{ url = $webhookUrl }

Write-Host "Telegram API response: $($response | ConvertTo-Json)"
