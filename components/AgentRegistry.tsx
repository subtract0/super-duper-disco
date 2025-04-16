import React, { useEffect, useState } from "react";
import type { Agent } from "../types/agent";

export default function AgentRegistry() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [modalAgent, setModalAgent] = useState<Agent | null>(null);

  const handleStop = async (agentId: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/agents/${agentId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to stop agent');
      await fetchAgents();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const [logs, setLogs] = useState<any[]>([]);

  // Poll logs and health for the open modal agent every 2s
  const [health, setHealth] = useState<string>('pending');
  useEffect(() => {
    if (!modalAgent) return;
    let active = true;
    const fetchLogsAndHealth = async () => {
      try {
        const res = await fetch(`/api/agents/${modalAgent.id}logs`);
        const data = await res.json();
        if (active) setLogs(data.logs || []);
      } catch {
        if (active) setLogs([]);
      }
      try {
        const res = await fetch(`/api/agents/${modalAgent.id}health`);
        const data = await res.json();
        if (active) setHealth(data.status || 'pending');
      } catch {
        if (active) setHealth('pending');
      }
    };
    fetchLogsAndHealth();
    const interval = setInterval(fetchLogsAndHealth, 2000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [modalAgent]);

  const handleView = async (agentId: string) => {
    const agent = agents.find(a => a.id === agentId);
    if (agent) setModalAgent(agent);
  };


  const fetchAgents = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/agents");
      const data = await res.json();
      setAgents(data.agents || []);
    } catch (err: any) {
      setError("Failed to fetch agents.");
    } finally {
      setLoading(false);
    }
  };

  // State for manual refresh (used for agent list reloads)
  const [refresh, setRefresh] = useState<number>(0);

  useEffect(() => {
    fetchAgents();
  }, [refresh]);

  return (
    <div style={{ padding: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <h2 style={{ margin: 0 }}>Agent Registry</h2>
        <button
          onClick={() => setRefresh(r => r + 1)}
          style={{ padding: '2px 12px', borderRadius: 6, fontSize: 14, background: '#f3f3f3', border: '1px solid #ccc', cursor: 'pointer' }}
          title="Refresh agent list"
        >
          ⟳ Refresh
        </button>
      </div>
      {/* Error message */}
      {error && <div style={{ color: 'red', marginBottom: 8 }}>{error}</div>}
      {/* Loading state */}
      {loading ? (
        <div style={{ color: '#666', fontStyle: 'italic' }}>Loading agents...</div>
      ) : agents.length === 0 ? (
        <div style={{ color: '#888' }}>No agents found.</div>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 8 }}>
          <thead>
            <tr>
              <th style={{ textAlign: 'left' }}>Type</th>
              <th>Status</th>
              <th>Host</th>
              <th>Actions</th>
              {/* Future: Controls (start/stop/restart), logs */}
            </tr>
          </thead>
          <tbody>
            {agents.map((agent) => (
              <tr key={agent.id}>
                <td>{agent.type}</td>
                <td>{agent.status}</td>
                <td>{agent.host}</td>
                <td>
                  <button onClick={() => handleView(agent.id)} style={{marginRight: 8}}>View</button>
                  <button onClick={() => handleStop(agent.id)} style={{color: 'red'}}>Stop</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {/* Modal for agent details */}
      {modalAgent && (
        <div style={{
          position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
        }}>
          <div style={{ background: '#fff', padding: 24, borderRadius: 8, minWidth: 320, maxWidth: 480, boxShadow: '0 4px 16px rgba(0,0,0,0.2)' }}>
            <h3>Agent Details</h3>
            <div style={{ marginBottom: 8 }}>
              <span style={{ fontWeight: 500 }}>Health:&nbsp;</span>
              <span style={{
                display: 'inline-block',
                minWidth: 70,
                padding: '2px 10px',
                borderRadius: 12,
                background: health === 'healthy' ? '#d4f7d4' : health === 'crashed' ? '#ffd4d4' : '#ffe8b2',
                color: health === 'healthy' ? '#1c7c1c' : health === 'crashed' ? '#b70000' : '#a67c00',
                fontWeight: 600,
                fontSize: 13,
                textAlign: 'center',
              }}>{health.charAt(0).toUpperCase() + health.slice(1)}</span>
            </div>
            <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-all', background: '#f8f8f8', padding: 12, borderRadius: 4, fontSize: 13 }}>
              {JSON.stringify(modalAgent, null, 2)}
            </pre>
            <h4 style={{ marginTop: 18, marginBottom: 8 }}>Recent Logs</h4>
            <div style={{ maxHeight: 200, overflowY: 'auto', background: '#f4f4f4', borderRadius: 4, padding: 8, fontSize: 13 }}>
              {logs.length === 0 ? (
                <div style={{ color: '#888', fontStyle: 'italic' }}>No logs found.</div>
              ) : (
                logs.map((log, idx) => (
                  <div key={idx} style={{ marginBottom: 4 }}>
                    <span style={{ color: '#999', fontSize: 11 }}>{new Date(log.timestamp).toLocaleString()} </span>
                    <span style={{ color: log.level === 'error' ? 'red' : log.level === 'warn' ? '#d6a100' : '#333', fontWeight: log.level === 'error' ? 600 : undefined }}>
                      [{log.level.toUpperCase()}]
                    </span>{' '}
                    <span>{log.message}</span>
                  </div>
                ))
              )}
            </div>
            <button onClick={() => setModalAgent(null)} style={{ marginTop: 12 }}>Close</button>
          </div>
        </div>
      )}
    </div>
  );
}
