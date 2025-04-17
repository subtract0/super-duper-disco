# Quickstart script for Agent API (Windows PowerShell)
# 1. Create a new agent
$response = Invoke-RestMethod -Uri "http://localhost:3000/api/agents" -Method Post -ContentType "application/json" -Body '{"type":"test","host":"localhost","config":{}}'
$agentId = $response.agent.id
Write-Host "Created agent with ID: $agentId"

# 2. Get agent details
Write-Host "Agent details:"
Invoke-RestMethod -Uri "http://localhost:3000/api/agents/$agentId" -Method Get | ConvertTo-Json -Depth 4

# 3. Get agent logs
Write-Host "Agent logs:"
Invoke-RestMethod -Uri "http://localhost:3000/api/agents/$agentId/logs" -Method Get | ConvertTo-Json -Depth 4

# 4. Get agent health
Write-Host "Agent health:"
Invoke-RestMethod -Uri "http://localhost:3000/api/agents/$agentId/health" -Method Get | ConvertTo-Json -Depth 4

# 5. Delete agent
Write-Host "Deleting agent..."
Invoke-RestMethod -Uri "http://localhost:3000/api/agents/$agentId" -Method Delete
Write-Host "Agent deleted."
