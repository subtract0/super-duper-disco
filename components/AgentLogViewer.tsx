import React, { useEffect, useState } from "react";

export type AgentLogEntry = {
  id: string;
  timestamp: string;
  level: 'info' | 'warning' | 'error' | 'debug';
  message: string;
};

export default function AgentLogViewer() {
  const [logs, setLogs] = useState<AgentLogEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/agent-logs")
      .then(res => res.json())
      .then(data => setLogs(data.logs || []))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div style={{ maxWidth: 600, margin: '32px auto', background: '#f8fafc', borderRadius: 14, boxShadow: '0 2px 12px rgba(0,0,0,0.08)', padding: 24 }}>
      <h2 style={{ fontSize: 22, marginBottom: 16 }}>Agent Logs</h2>
      {loading ? (
        <div>Loading...</div>
      ) : logs.length === 0 ? (
        <div>No logs found.</div>
      ) : (
        <ul style={{ listStyle: 'none', padding: 0, maxHeight: 320, overflowY: 'auto' }}>
          {logs.map((entry, idx) => (
            <li key={idx} style={{ marginBottom: 10, borderBottom: '1px solid #e5e7eb', paddingBottom: 7, display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ fontWeight: 600, color: '#64748b', minWidth: 88 }}>{entry.timestamp}</span>
              <span style={{ fontWeight: 700, color: logLevelColor(entry.level), minWidth: 62 }}>{entry.level.toUpperCase()}</span>
              <span style={{ flex: 1 }}>{entry.message}</span>
              <span style={{ fontSize: 12, color: '#a3a3a3' }}>{entry.id}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function logLevelColor(level: AgentLogEntry['level']) {
  switch (level) {
    case 'info': return '#2563eb';
    case 'warning': return '#f59e42';
    case 'error': return '#dc2626';
    case 'debug': return '#059669';
    default: return '#6b7280';
  }
}
