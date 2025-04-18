"use client";
import dynamic from "next/dynamic";
const AgentBrokerPanel = dynamic(() => import("../../components/AgentBrokerPanel"), { ssr: false });
const AgentDeploymentHistory = dynamic(() => import("../../components/AgentDeploymentHistory"), { ssr: false });
const AgentHealthStatusList = dynamic(() => import("../../components/AgentHealthStatus"), { ssr: false });
const AgentLogViewer = dynamic(() => import("../../components/AgentLogViewer"), { ssr: false });

export default function AgentDashboardClient() {
  return (
    <main style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #f5f7fa, #c3cfe2 90%)', padding: 32 }}>
      <h1 style={{ fontSize: 34, fontWeight: 800, marginBottom: 18 }}>Agent Swarm Dashboard</h1>
      <AgentBrokerPanel />
      <AgentHealthStatusList />
      <AgentDeploymentHistory />
      <AgentLogViewer />
    </main>
  );
}
