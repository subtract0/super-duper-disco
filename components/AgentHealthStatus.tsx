import * as React from "react";
import { useEffect, useState } from "react";

export type AgentHealthStatus = 'healthy' | 'unresponsive' | 'crashed' | 'pending' | 'restarting' | 'recovered' | 'recovery_failed';

export type AgentHealthEntry = {
  id: string;
  status: AgentHealthStatus;
};

export default function AgentHealthStatusList() {
  const [health, setHealth] = useState<AgentHealthEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/agent-health")
      .then(res => res.json())
      .then(data => setHealth(data.health || []))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div style={{ maxWidth: 520, margin: '32px auto', background: '#f8fafc', borderRadius: 14, boxShadow: '0 2px 12px rgba(0,0,0,0.08)', padding: 24 }}>
      <h2 style={{ fontSize: 22, marginBottom: 16 }}>Agent Health Status</h2>
      {loading ? (
        <div>Loading...</div>
      ) : health.length === 0 ? (
        <div>No agents found.</div>
      ) : (
        <ul style={{ listStyle: 'none', padding: 0 }}>
          {health.map((entry) => (
            <li key={entry.id} style={{ marginBottom: 14, borderBottom: '1px solid #e5e7eb', paddingBottom: 8, display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ fontWeight: 600 }}>{entry.id}</span>
              <span style={{ fontSize: 13, color: statusColor(entry.status) }}>{entry.status}</span>
              <span style={{ width: 12, height: 12, borderRadius: '50%', background: statusDot(entry.status), display: 'inline-block' }} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function statusColor(status: AgentHealthStatus) {
  switch (status) {
    case 'healthy': return '#059669';
    case 'recovered': return '#2563eb';
    case 'pending': return '#f59e42';
    case 'restarting': return '#6366f1';
    case 'crashed': return '#dc2626';
    case 'recovery_failed': return '#991b1b';
    case 'unresponsive': return '#eab308';
    default: return '#6b7280';
  }
}

function statusDot(status: AgentHealthStatus) {
  switch (status) {
    case 'healthy': return '#34d399';
    case 'recovered': return '#60a5fa';
    case 'pending': return '#fbbf24';
    case 'restarting': return '#a5b4fc';
    case 'crashed': return '#f87171';
    case 'recovery_failed': return '#991b1b';
    case 'unresponsive': return '#fde047';
    default: return '#d1d5db';
  }
}
