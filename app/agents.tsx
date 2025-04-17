import React from "react";
import dynamic from "next/dynamic";

const AgentDeploymentHistory = dynamic(() => import("../components/AgentDeploymentHistory"), { ssr: false });

export default function AgentSwarmDashboard() {
  return (
    <main style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #f5f7fa, #c3cfe2 90%)', padding: 32 }}>
      <h1 style={{ fontSize: 34, fontWeight: 800, marginBottom: 18 }}>Agent Swarm Dashboard</h1>
      {/* Other dashboard components (card deck, etc.) would go here */}
      <AgentDeploymentHistory />
    </main>
  );
}
