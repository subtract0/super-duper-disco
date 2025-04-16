import React, { useState } from "react";
import AgentRegistry from "../../components/AgentRegistry";
import AgentWizard from "../../components/AgentWizard";

export default function AgentsDashboard() {
  const [refresh, setRefresh] = useState(0);

  return (
    <div style={{ padding: 32 }}>
      <h1>Agent Swarm Dashboard</h1>
      <AgentWizard onDeployed={() => setRefresh(r => r + 1)} />
      <AgentRegistry refresh={refresh} />
    </div>
  );
}
