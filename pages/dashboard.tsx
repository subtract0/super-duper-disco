'use client';
import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { OrchestratorState } from '../src/orchestration/orchestrator/types';
import { getHealthDisplay } from '../src/utils/getHealthDisplay';

export default function Dashboard() {
  const [orchState, setOrchState] = useState<OrchestratorState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fromFilter, setFromFilter] = useState<string>('');
  const [toFilter, setToFilter] = useState<string>('');
  const [bodyFilter, setBodyFilter] = useState<string>('');

  // Fetch orchestrator state
  const fetchState = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/orchestrator-state');
      if (!res.ok) throw new Error('Failed to fetch orchestrator state');
      const data = await res.json();
      setOrchState(data);
      setError(null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchState();
    const interval = setInterval(fetchState, 3000);
    return () => clearInterval(interval);
  }, [fetchState]);

  // Memoized filtered messages
  interface AgentMessage {
    id?: string;
    from: string;
    to: string;
    type?: string;
    threadId?: string;
    version?: string;
    body: unknown;
    createdAt?: number;
    protocol?: string;
  }

  const filteredMessages = useMemo(() => {
    if (!orchState?.messages) return [] as AgentMessage[];
    return (orchState.messages as AgentMessage[]).filter((msg: AgentMessage) =>
      (!fromFilter || msg.from === fromFilter) &&
      (!toFilter || msg.to === toFilter) &&
      (!bodyFilter || (typeof msg.body === 'object'
        ? JSON.stringify(msg.body).toLowerCase().includes(bodyFilter.toLowerCase())
        : String(msg.body).toLowerCase().includes(bodyFilter.toLowerCase())
      ))
    );
  }, [orchState, fromFilter, toFilter, bodyFilter]);

  // Export handlers
  const handleExportCSV = useCallback(() => {
    if (!filteredMessages.length) return;
    const csv = [
      Object.keys(filteredMessages[0]).join(','),
      ...filteredMessages.map((msg: AgentMessage) =>
        Object.keys(filteredMessages[0])
          .map((k) => {
            let v = msg[k];
            if (typeof v === 'object') v = JSON.stringify(v);
            if (typeof v === 'string' && v.includes(',')) v = '"' + v.replace(/"/g, '""') + '"';
            return v;
          })
          .join(',')
      )
    ].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `a2a-messages-${Date.now()}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [filteredMessages]);

  const handleExportJSON = useCallback(() => {
    const blob = new Blob([JSON.stringify(filteredMessages, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `a2a-messages-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [filteredMessages]);

  // Agent control handlers
  const handleAgentAction = useCallback(async (id: string, action: 'restart' | 'stop') => {
    await fetch('/api/agent-control', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, id })
    });
    fetchState();
  }, [fetchState]);

  return (
    <div style={{ fontFamily: 'sans-serif', padding: 24, maxWidth: 900, margin: '0 auto' }}>
      <h1>Cascade Orchestrator Dashboard</h1>
      {loading && <p>Loading...</p>}
      {error && <p style={{ color: 'red' }}>Error: {error}</p>}
      {orchState && (
        <>
          <h2>Protocol State: <span style={{ color: '#0070f3' }}>{orchState.state}</span></h2>
          <h3>Agent Health</h3>
          <table style={{ borderCollapse: 'collapse', marginBottom: 24 }}>
            <thead>
              <tr>
                <th style={{ border: '1px solid #ccc', padding: 8 }}>Agent</th>
                <th style={{ border: '1px solid #ccc', padding: 8 }}>Health</th>
                <th style={{ border: '1px solid #ccc', padding: 8 }}>Uptime</th>
                <th style={{ border: '1px solid #ccc', padding: 8 }}>Crash Count</th>
                <th style={{ border: '1px solid #ccc', padding: 8 }}>Last Heartbeat</th>
                <th style={{ border: '1px solid #ccc', padding: 8 }}>Uptime %</th>
                <th style={{ border: '1px solid #ccc', padding: 8 }}>MTTR</th>
                <th style={{ border: '1px solid #ccc', padding: 8 }}>Downtime</th>
                <th style={{ border: '1px solid #ccc', padding: 8 }}>Deployment Status</th>
                <th style={{ border: '1px solid #ccc', padding: 8 }}>Deployment URL</th>
                <th style={{ border: '1px solid #ccc', padding: 8 }}>Deployment Error</th>
                <th style={{ border: '1px solid #ccc', padding: 8 }}>Actions</th>
              </tr>
            </thead>
            <tbody>
               {(orchState.agents || Object.entries(orchState.health)).map((agentOrTuple: any, idx: number) => {
                // Support both new (agents array) and legacy (health map) formats
                let agent: any;
                let id: string;
                let health: any;
                if (Array.isArray(orchState.agents)) {
                  agent = agentOrTuple;
                  id = agent.id;
                  health = orchState.health && orchState.health[id] ? orchState.health[id] : {};
                } else {
                  // legacy fallback
                  [id, health] = agentOrTuple;
                  agent = { id, ...health };
                }
                const display = getHealthDisplay(health);
                return (
                  <tr key={id} style={{ background: display.color }}>
                    <td style={{ border: '1px solid #ccc', padding: 8 }}>{id}</td>
                    <td style={{ border: '1px solid #ccc', padding: 8 }}>{display.status} {display.anomaly && <span style={{ color: '#b00', fontWeight: 600 }}>({display.anomaly})</span>}</td>
                    <td style={{ border: '1px solid #ccc', padding: 8 }}>{typeof health.uptime === 'number' ? (health.uptime / 1000).toFixed(0) + 's' : '-'}</td>
                    <td style={{ border: '1px solid #ccc', padding: 8 }}><span style={display.crashStyle}>{typeof health.crashCount === 'number' ? health.crashCount : '-'}</span></td>
                    <td style={{ border: '1px solid #ccc', padding: 8 }}>{health.lastHeartbeat ? new Date(health.lastHeartbeat).toLocaleTimeString() : '-'}</td>
                    <td style={{ border: '1px solid #ccc', padding: 8 }}>{typeof health.uptimePercent === 'number' ? (health.uptimePercent * 100).toFixed(1) + '%' : '-'}</td>
                    <td style={{ border: '1px solid #ccc', padding: 8 }}>{typeof health.mttr === 'number' ? (health.mttr / 1000).toFixed(1) + 's' : '-'}</td>
                    <td style={{ border: '1px solid #ccc', padding: 8 }}>{typeof health.downtime === 'number' ? (health.downtime / 1000).toFixed(0) + 's' : '-'}</td>
                    {/* Deployment Status */}
                    <td style={{ border: '1px solid #ccc', padding: 8 }}>{agent.deploymentStatus || '-'}</td>
                    {/* Deployment URL */}
                    <td style={{ border: '1px solid #ccc', padding: 8 }}>
                      {agent.deploymentUrl ? (
                        <a href={agent.deploymentUrl} target="_blank" rel="noopener noreferrer">Link</a>
                      ) : '-'}
                    </td>
                    {/* Deployment Error */}
                    <td style={{ border: '1px solid #ccc', padding: 8 }}>
                      {agent.deploymentStatus === 'failed' && agent.lastDeploymentError ? (
                        <span style={{ color: '#b00', fontWeight: 600 }}>{agent.lastDeploymentError}</span>
                      ) : agent.lastDeploymentError ? (
                        <span style={{ color: '#b00' }}>{agent.lastDeploymentError}</span>
                      ) : '-'}
                    </td>
                    <td style={{ border: '1px solid #ccc', padding: 8 }}>
                      <button onClick={() => handleAgentAction(id, 'restart')}>Restart</button>
                      <button onClick={() => handleAgentAction(id, 'stop')}>Stop</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <h3>Recent Logs</h3>
          <div style={{ background: '#f9f9f9', border: '1px solid #eee', padding: 16, maxHeight: 320, overflowY: 'auto' }}>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              {(orchState.logs as string[]).slice(-50).map((log: string, idx: number) => (
                <li key={idx} style={{ fontSize: 14, marginBottom: 4 }}>{log}</li>
              ))}
            </ul>
          </div>
          <h3>Live Agent-to-Agent Messages</h3>
          {/* TODO: Refactor SendTestMessage to call fetchState after sending instead of reloading */}
{/* <SendTestMessage agents={Object.keys(orchState.health)} onSent={fetchState} /> */}
          <div style={{ marginBottom: 12, display: 'flex', gap: 12, alignItems: 'center' }}>
            <label>From:
              <select
                style={{ marginLeft: 4 }}
                value={fromFilter}
                onChange={e => setFromFilter(e.target.value)}
              >
                <option value=''>All</option>
                {[...new Set((orchState.messages as AgentMessage[]).map((m: AgentMessage) => m.from))]
                  .filter(Boolean)
                  .map((from: string) => <option key={from} value={from}>{from}</option>)}
              </select>
            </label>
            <label>To:
              <select
                style={{ marginLeft: 4 }}
                value={toFilter}
                onChange={e => setToFilter(e.target.value)}
              >
                <option value=''>All</option>
                {[...new Set((orchState.messages as AgentMessage[]).map((m: AgentMessage) => m.to))]
                  .filter(Boolean)
                  .map((to: string) => <option key={to} value={to}>{to}</option>)}
              </select>
            </label>
            <input
              type='text'
              placeholder='Search body...'
              value={bodyFilter}
              onChange={e => setBodyFilter(e.target.value)}
              style={{ padding: 4, fontSize: 14, minWidth: 120 }}
            />
            <button
              style={{ marginLeft: 8 }}
              onClick={() => {
                setFromFilter('');
                setToFilter('');
                setBodyFilter('');
              }}
            >Clear</button>
            <button
              style={{ marginLeft: 16 }}
              onClick={handleExportCSV}
            >Export CSV</button>
            <button
              onClick={handleExportJSON}
            >Export JSON</button>
          </div>
          {orchState.messages && orchState.messages.length > 0 && (
            <div style={{ margin: '24px 0 12px 0', padding: 12, background: '#f9f9f9', border: '1px solid #eee', borderRadius: 6 }}>
              <div style={{ marginBottom: 6, fontWeight: 600 }}>A2A Message Volume (last 20 min, per minute)</div>
              <svg width={20 * 22} height={80} style={{ display: 'block', overflow: 'visible' }}>
                {Array(20).fill(0).map((_, i) => (
                  <g key={i}>
                    <rect x={i * 22} y={80} width={18} height={0} fill="#0070f3" rx={3} />
                    <text x={i * 22 + 9} y={78} fontSize={10} fill="#666" textAnchor="middle">{new Date(Date.now() - i * 60 * 1000).toLocaleTimeString()}</text>
                  </g>
                ))}
              </svg>
            </div>
          )}
          <div style={{ background: '#f6f8fa', border: '1px solid #eee', padding: 16, maxHeight: 320, overflowY: 'auto', marginTop: 8 }}>
            {orchState.messages && orchState.messages.length > 0 ? (
              <table style={{ borderCollapse: 'collapse', width: '100%' }}>
                <thead>
                  <tr>
                    <th style={{ border: '1px solid #ccc', padding: 8 }}>From</th>
                    <th style={{ border: '1px solid #ccc', padding: 8 }}>To</th>
                    <th style={{ border: '1px solid #ccc', padding: 8 }}>Type</th>
                    <th style={{ border: '1px solid #ccc', padding: 8 }}>Thread ID</th>
                    <th style={{ border: '1px solid #ccc', padding: 8 }}>Version</th>
                    <th style={{ border: '1px solid #ccc', padding: 8 }}>Body</th>
                    <th style={{ border: '1px solid #ccc', padding: 8 }}>Timestamp</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredMessages
                    .slice(-20)
                    .reverse()
                    .map((msg: AgentMessage, idx: number) => {
                      const rowStyle: React.CSSProperties = {};
                      let note = '';
                      const malformed = !msg.from || !msg.to || typeof msg.body === 'undefined' || msg.protocol !== 'A2A';
                      if (malformed) {
                        rowStyle.background = '#e0e0e0';
                        note = 'Malformed or not A2A';
                      } else if (msg.type === 'error') {
                        rowStyle.background = '#ffeaea';
                        rowStyle.fontWeight = 'bold';
                        note = 'Error';
                      } else if (msg.type === 'warning') {
                        rowStyle.background = '#fffbe6';
                        rowStyle.fontWeight = 'bold';
                        note = 'Warning';
                      }
                      return (
                        <tr key={msg.id || idx} style={rowStyle} title={note}>
                          <td style={{ border: '1px solid #ccc', padding: 8 }}>{msg.from}</td>
                          <td style={{ border: '1px solid #ccc', padding: 8 }}>{msg.to}</td>
                          <td style={{ border: '1px solid #ccc', padding: 8 }}>{msg.type || ''}</td>
                          <td style={{ border: '1px solid #ccc', padding: 8 }}>{msg.threadId || ''}</td>
                          <td style={{ border: '1px solid #ccc', padding: 8 }}>{msg.version || ''}</td>
                          <td style={{ border: '1px solid #ccc', padding: 8 }}>
                            <pre style={{ margin: 0, fontSize: 13, background: 'none', border: 'none', padding: 0 }}>{typeof msg.body === 'object' ? JSON.stringify(msg.body, null, 2) : String(msg.body)}</pre>
                            {note && <div style={{ fontSize: 12, color: '#b00', fontWeight: 'bold' }}>{note}</div>}
                          </td>
                          <td style={{ border: '1px solid #ccc', padding: 8 }}>
                            {msg.createdAt ? new Date(msg.createdAt).toLocaleString() : ''}
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            ) : (
              <span style={{ color: '#888' }}>No messages found.</span>
            )}
          </div>
        </>
      )}
    </div>
  );
}
