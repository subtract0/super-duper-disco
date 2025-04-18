# PowerShell script to set Telegram webhook automatically using current ngrok URL
# Usage: .\set-telegram-webhook.ps1 <BOT_TOKEN>

param(
  [Parameter(Mandatory=$true)]
  [string]$BotToken
)

# Get the current ngrok public URL from the local API
$ngrokApiUrl = 'http://127.0.0.1:4040/api/tunnels'
$response = Invoke-RestMethod -Uri $ngrokApiUrl -Method Get
$publicUrl = $response.tunnels | Where-Object { $_.proto -eq 'https' } | Select-Object -ExpandProperty public_url

if (-not $publicUrl) {
  Write-Host "No HTTPS ngrok tunnel found. Is ngrok running?"
  exit 1
}

$webhookUrl = "$publicUrl/api/telegram"
$setWebhookUrl = "https://api.telegram.org/bot$BotToken/setWebhook?url=$webhookUrl"

Write-Host "Setting Telegram webhook to: $webhookUrl"

$response = Invoke-RestMethod -Uri $setWebhookUrl -Method Get
Write-Host "Telegram API response: $($response | ConvertTo-Json)"
