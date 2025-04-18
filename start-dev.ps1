# PowerShell script to start Next.js dev server and ngrok automatically
# Kills any existing ngrok/Next.js processes on port 3000, then starts both

# Kill existing Next.js (node) processes on port 3000
Get-Process -Name node -ErrorAction SilentlyContinue | Where-Object { $_.MainWindowTitle -like '*3000*' } | Stop-Process -Force

# Kill existing ngrok processes
Get-Process -Name ngrok -ErrorAction SilentlyContinue | Stop-Process -Force

# Start Next.js dev server
Start-Process -NoNewWindow -FilePath "npx" -ArgumentList "next dev" -WorkingDirectory "."

Start-Sleep -Seconds 5  # Wait for Next.js to start

# Start ngrok
Start-Process -NoNewWindow -FilePath ".\ngrok.exe" -ArgumentList "http 3000" -WorkingDirectory "."

Write-Host "Next.js and ngrok started. Check your ngrok dashboard for the public URL."
