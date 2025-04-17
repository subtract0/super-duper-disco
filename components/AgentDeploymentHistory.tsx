import React, { useEffect, useState } from "react";

export type AgentDeploymentRecord = {
  agentId: string;
  cardName: string;
  timestamp: number;
  host: string;
  config: Record<string, any>;
};

export default function AgentDeploymentHistory() {
  const [history, setHistory] = useState<AgentDeploymentRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/broker?history=1")
      .then(res => res.json())
      .then(data => setHistory(data.history || []))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div style={{ maxWidth: 520, margin: '32px auto', background: '#fafbfc', borderRadius: 14, boxShadow: '0 2px 12px rgba(0,0,0,0.07)', padding: 24 }}>
      <h2 style={{ fontSize: 22, marginBottom: 16 }}>Recent Agent Deployments</h2>
      {loading ? (
        <div>Loading...</div>
      ) : history.length === 0 ? (
        <div>No deployments yet.</div>
      ) : (
        <ul style={{ listStyle: 'none', padding: 0 }}>
          {history.map((rec, i) => (
            <li key={rec.agentId + rec.timestamp} style={{ marginBottom: 18, borderBottom: '1px solid #e5e7eb', paddingBottom: 10 }}>
              <div style={{ fontWeight: 600 }}>{rec.cardName}</div>
              <div style={{ fontSize: 13, color: '#666', marginBottom: 2 }}>
                {new Date(rec.timestamp).toLocaleString()} on <span style={{ color: '#2563eb' }}>{rec.host}</span>
              </div>
              <div style={{ fontSize: 12, color: '#888' }}>Agent ID: {rec.agentId}</div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
