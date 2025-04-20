import { useEffect, useState } from 'react';

interface OrchestratorState {
  state: string;
  health: Record<string, string>;
  logs: string[];
}

export default function Dashboard() {
  const [orchState, setOrchState] = useState<OrchestratorState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    const fetchState = async () => {
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
    };
    fetchState();
    interval = setInterval(fetchState, 3000);
    return () => clearInterval(interval);
  }, []);

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
                <th style={{ border: '1px solid #ccc', padding: 8 }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(orchState.health).map(([id, health]) => {
                // health can be string or object (from orchestrator-state API)
                let status = typeof health === 'string' ? health : health.status;
                let lastHeartbeat = typeof health === 'object' && health.lastHeartbeat;
                let uptime = typeof health === 'object' && typeof health.uptime === 'number' ? health.uptime : null;
                let crashCount = typeof health === 'object' && typeof health.crashCount === 'number' ? health.crashCount : null;
                let anomaly = '';
                let color = '';
                if (status === 'crashed') {
                  color = '#ffeaea';
                  anomaly = 'Crashed';
                } else if (status === 'stopped') {
                  color = '#fffbe6';
                  anomaly = 'Stopped';
                } else if (status === 'running') {
                  // Check heartbeat (missing > 2 min)
                  if (lastHeartbeat && Date.now() - lastHeartbeat > 2 * 60 * 1000) {
                    color = '#e0e0e0';
                    anomaly = 'No heartbeat >2min';
                  } else {
                    color = '#eaffea';
                  }
                } else {
                  color = '#e0e0e0';
                  anomaly = 'Unknown';
                }
                // Highlight high crash count or low uptime
                let crashStyle = crashCount !== null && crashCount > 2 ? { color: '#b00', fontWeight: 600 } : {};
                let uptimeStyle = uptime !== null && uptime < 60000 ? { color: '#b00', fontWeight: 600 } : {};
                return (
                  <tr key={id} style={{ background: color }} title={anomaly}>
                    <td style={{ border: '1px solid #ccc', padding: 8 }}>{id}</td>
                    <td style={{ border: '1px solid #ccc', padding: 8 }}>
                      {status}
                      {anomaly && <span style={{ color: '#b00', marginLeft: 8, fontWeight: 500, fontSize: 13 }}>{anomaly}</span>}
                    </td>
                    <td style={{ border: '1px solid #ccc', padding: 8 }}>
                      {uptime !== null ? <span style={uptimeStyle}>{Math.floor(uptime / 1000)}s</span> : ''}
                      {uptime !== null && uptime < 60000 && <span style={{ color: '#b00', fontWeight: 500, marginLeft: 6 }}>(low)</span>}
                    </td>
                    <td style={{ border: '1px solid #ccc', padding: 8 }}>
                      {crashCount !== null ? <span style={crashStyle}>{crashCount}</span> : ''}
                      {crashCount !== null && crashCount > 2 && <span style={{ color: '#b00', fontWeight: 500, marginLeft: 6 }}>(high)</span>}
                    </td>
                    <td style={{ border: '1px solid #ccc', padding: 8 }}>
                      {lastHeartbeat ? new Date(lastHeartbeat).toLocaleTimeString() : ''}
                    </td>
                    <td style={{ border: '1px solid #ccc', padding: 8 }}>
                      {typeof health.uptimePercent === 'number' ? (
                        <span style={{ color: health.uptimePercent < 0.95 ? '#b00' : undefined, fontWeight: health.uptimePercent < 0.95 ? 600 : undefined }}>
                          {(health.uptimePercent * 100).toFixed(1)}%
                        </span>
                      ) : ''}
                    </td>
                    <td style={{ border: '1px solid #ccc', padding: 8 }}>
                      {typeof health.mttr === 'number' ? (
                        <span style={{ color: health.mttr > 120000 ? '#b00' : undefined, fontWeight: health.mttr > 120000 ? 600 : undefined }}>
                          {(health.mttr / 1000).toFixed(1)}s
                        </span>
                      ) : ''}
                    </td>
                    <td style={{ border: '1px solid #ccc', padding: 8 }}>
                      {typeof health.downtime === 'number' ? (
                        <span>
                          {(health.downtime / 1000).toFixed(1)}s
                        </span>
                      ) : ''}
                    </td>
                    <td style={{ border: '1px solid #ccc', padding: 8 }}>
                      <button style={{ marginRight: 6, fontSize: 13 }} onClick={async () => {
                        await fetch('/api/agent-control', {
                          method: 'POST', headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ action: 'restart', id })
                        });
                        setTimeout(() => window.location.reload(), 600);
                      }}>Restart</button>
                      <button style={{ fontSize: 13 }} onClick={async () => {
                        await fetch('/api/agent-control', {
                          method: 'POST', headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ action: 'stop', id })
                        });
                        setTimeout(() => window.location.reload(), 600);
                      }}>Stop</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <h3>Recent Logs</h3>
          <div style={{ background: '#f9f9f9', border: '1px solid #eee', padding: 16, maxHeight: 320, overflowY: 'auto' }}>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              {orchState.logs.slice(-50).map((log, idx) => (
                <li key={idx} style={{ fontSize: 14, marginBottom: 4 }}>{log}</li>
              ))}
            </ul>
          </div>
          <h3>Live Agent-to-Agent Messages</h3>
          {/* Send Test Message Button & Modal */}
          {/* Inline component for sending test A2A messages */}
          {(() => {
            function SendTestMessage({ agents, onSent }: { agents: string[]; onSent: () => void }) {
              const [open, setOpen] = useState(false);
              const [from, setFrom] = useState('');
              const [to, setTo] = useState('');
              const [type, setType] = useState('agent-message');
              const [body, setBody] = useState('{}');
              const [sending, setSending] = useState(false);
              const [err, setErr] = useState<string | null>(null);
              return <>
                <button style={{ marginBottom: 8 }} onClick={() => setOpen(true)}>
                  Send Test Message
                </button>
                {open && (
                  <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.18)', zIndex: 1000 }}>
                    <div style={{ background: '#fff', padding: 24, borderRadius: 8, maxWidth: 400, margin: '60px auto', boxShadow: '0 4px 18px #0002' }}>
                      <h4>Send Test A2A Message</h4>
                      <div style={{ marginBottom: 8 }}>
                        <label>From: <select value={from} onChange={e => setFrom(e.target.value)}><option value=''>Select</option>{agents.map(a => <option key={a} value={a}>{a}</option>)}</select></label>
                      </div>
                      <div style={{ marginBottom: 8 }}>
                        <label>To: <select value={to} onChange={e => setTo(e.target.value)}><option value=''>Select</option>{agents.map(a => <option key={a} value={a}>{a}</option>)}</select></label>
                      </div>
                      <div style={{ marginBottom: 8 }}>
                        <label>Type: <input value={type} onChange={e => setType(e.target.value)} style={{ width: 120 }} /></label>
                      </div>
                      <div style={{ marginBottom: 8 }}>
                        <label>Body (JSON):<br />
                          <textarea value={body} onChange={e => setBody(e.target.value)} rows={4} style={{ width: '100%' }} />
                        </label>
                      </div>
                      {err && <div style={{ color: 'red', marginBottom: 8 }}>{err}</div>}
                      <button disabled={sending} onClick={async () => {
                        setSending(true); setErr(null);
                        let parsedBody;
                        try { parsedBody = JSON.parse(body); } catch {
                          setErr('Body must be valid JSON'); setSending(false); return;
                        }
                        const resp = await fetch('/api/send-a2a-message', {
                          method: 'POST', headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ from, to, type, body: parsedBody })
                        });
                        if (resp.ok) {
                          setOpen(false); setSending(false); setFrom(''); setTo(''); setBody('{}'); setType('agent-message');
                          onSent();
                        } else {
                          const data = await resp.json();
                          setErr(data.error || 'Failed to send'); setSending(false);
                        }
                      }}>Send</button>
                      <button style={{ marginLeft: 12 }} onClick={() => setOpen(false)}>Cancel</button>
                    </div>
                  </div>
                )}
              </>;
            }
            return <SendTestMessage agents={Object.keys(orchState.health)} onSent={() => setTimeout(() => window.location.reload(), 600)} />;
          })()}

          {/* Filtering Controls */}
          <div style={{ marginBottom: 12, display: 'flex', gap: 12, alignItems: 'center' }}>
            <label>From:
              <select
                style={{ marginLeft: 4 }}
                value={orchState._fromFilter || ''}
                onChange={e => setOrchState((prev: any) => ({ ...prev, _fromFilter: e.target.value }))}
              >
                <option value=''>All</option>
                {[...new Set((orchState.messages || []).map((m: any) => m.from))]
                  .filter(Boolean)
                  .map((from: string) => <option key={from} value={from}>{from}</option>)}
              </select>
            </label>
            <label>To:
              <select
                style={{ marginLeft: 4 }}
                value={orchState._toFilter || ''}
                onChange={e => setOrchState((prev: any) => ({ ...prev, _toFilter: e.target.value }))}
              >
                <option value=''>All</option>
                {[...new Set((orchState.messages || []).map((m: any) => m.to))]
                  .filter(Boolean)
                  .map((to: string) => <option key={to} value={to}>{to}</option>)}
              </select>
            </label>
            <input
              type='text'
              placeholder='Search body...'
              value={orchState._bodyFilter || ''}
              onChange={e => setOrchState((prev: any) => ({ ...prev, _bodyFilter: e.target.value }))}
              style={{ padding: 4, fontSize: 14, minWidth: 120 }}
            />
            <button
              style={{ marginLeft: 8 }}
              onClick={() => setOrchState((prev: any) => ({ ...prev, _fromFilter: '', _toFilter: '', _bodyFilter: '' }))}
            >Clear</button>
            {/* Export Buttons */}
            <button
              style={{ marginLeft: 16 }}
              onClick={() => {
                // Compute filtered messages
                const filtered = (orchState.messages || [])
                  .filter((msg: any) =>
                    (!orchState._fromFilter || msg.from === orchState._fromFilter) &&
                    (!orchState._toFilter || msg.to === orchState._toFilter) &&
                    (!orchState._bodyFilter ||
                      (typeof msg.body === 'object'
                        ? JSON.stringify(msg.body).toLowerCase().includes(orchState._bodyFilter.toLowerCase())
                        : String(msg.body).toLowerCase().includes(orchState._bodyFilter.toLowerCase()))
                    )
                  );
                const csv = [
                  Object.keys(filtered[0] || {}).join(','),
                  ...filtered.map((msg: any) =>
                    Object.keys(filtered[0] || {})
                      .map(k => {
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
              }}
            >Export CSV</button>
            <button
              onClick={() => {
                const filtered = (orchState.messages || [])
                  .filter((msg: any) =>
                    (!orchState._fromFilter || msg.from === orchState._fromFilter) &&
                    (!orchState._toFilter || msg.to === orchState._toFilter) &&
                    (!orchState._bodyFilter ||
                      (typeof msg.body === 'object'
                        ? JSON.stringify(msg.body).toLowerCase().includes(orchState._bodyFilter.toLowerCase())
                        : String(msg.body).toLowerCase().includes(orchState._bodyFilter.toLowerCase()))
                    )
                  );
                const blob = new Blob([JSON.stringify(filtered, null, 2)], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `a2a-messages-${Date.now()}.json`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
              }}
            >Export JSON</button>
          </div>
          {/* Message Volume Chart */}
          {orchState.messages && orchState.messages.length > 0 && (() => {
            // Chart data: messages per minute (last 20 min)
            const now = Date.now();
            const bucketSize = 60 * 1000; // 1 min
            const numBuckets = 20;
            const buckets: number[] = Array(numBuckets).fill(0);
            const bucketLabels: string[] = [];
            for (let i = numBuckets - 1; i >= 0; i--) {
              const t = new Date(now - i * bucketSize);
              bucketLabels.push(`${t.getHours()}:${String(t.getMinutes()).padStart(2, '0')}`);
            }
            (orchState.messages as any[]).forEach(msg => {
              if (!msg.createdAt) return;
              const bucketIdx = Math.floor((now - msg.createdAt) / bucketSize);
              if (bucketIdx >= 0 && bucketIdx < numBuckets) buckets[numBuckets - 1 - bucketIdx]++;
            });
            const maxCount = Math.max(1, ...buckets);
            return (
              <div style={{ margin: '24px 0 12px 0', padding: 12, background: '#f9f9f9', border: '1px solid #eee', borderRadius: 6 }}>
                <div style={{ marginBottom: 6, fontWeight: 600 }}>A2A Message Volume (last 20 min, per minute)</div>
                <svg width={numBuckets * 22} height={80} style={{ display: 'block', overflow: 'visible' }}>
                  {buckets.map((count, i) => (
                    <g key={i}>
                      <rect x={i * 22} y={80 - (count / maxCount) * 60} width={18} height={(count / maxCount) * 60} fill="#0070f3" rx={3} />
                      <text x={i * 22 + 9} y={78} fontSize={10} fill="#666" textAnchor="middle">{bucketLabels[i]}</text>
                      {count > 0 && <text x={i * 22 + 9} y={70 - (count / maxCount) * 60} fontSize={10} fill="#222" textAnchor="middle">{count}</text>}
                    </g>
                  ))}
                </svg>
              </div>
            );
          })()}
          <div style={{ background: '#f6f8fa', border: '1px solid #eee', padding: 16, maxHeight: 320, overflowY: 'auto', marginTop: 8 }}>
            {orchState.messages && orchState.messages.length > 0 ? (() => {
              // Determine which protocol columns to show
              const msgs = orchState.messages;
              const showType = msgs.some((m: any) => m.type);
              const showThread = msgs.some((m: any) => m.threadId);
              const showVersion = msgs.some((m: any) => m.version);
              return (
                <table style={{ borderCollapse: 'collapse', width: '100%' }}>
                  <thead>
                    <tr>
                      <th style={{ border: '1px solid #ccc', padding: 8 }}>From</th>
                      <th style={{ border: '1px solid #ccc', padding: 8 }}>To</th>
                      {showType && <th style={{ border: '1px solid #ccc', padding: 8 }}>Type</th>}
                      {showThread && <th style={{ border: '1px solid #ccc', padding: 8 }}>Thread ID</th>}
                      {showVersion && <th style={{ border: '1px solid #ccc', padding: 8 }}>Version</th>}
                      <th style={{ border: '1px solid #ccc', padding: 8 }}>Body</th>
                      <th style={{ border: '1px solid #ccc', padding: 8 }}>Timestamp</th>
                    </tr>
                  </thead>
                  <tbody>
                    {msgs
                      .filter((msg: any) =>
                        (!orchState._fromFilter || msg.from === orchState._fromFilter) &&
                        (!orchState._toFilter || msg.to === orchState._toFilter) &&
                        (!orchState._bodyFilter ||
                          (typeof msg.body === 'object'
                            ? JSON.stringify(msg.body).toLowerCase().includes(orchState._bodyFilter.toLowerCase())
                            : String(msg.body).toLowerCase().includes(orchState._bodyFilter.toLowerCase()))
                        )
                      )
                      .slice(-20)
                      .reverse()
                      .map((msg: any, idx: number) => (
                        {(() => {
                          // Highlighting logic
                          let rowStyle: React.CSSProperties = {};
                          let note = '';
                          // Malformed: missing required fields or protocol violation
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
                              {showType && <td style={{ border: '1px solid #ccc', padding: 8 }}>{msg.type || ''}</td>}
                              {showThread && <td style={{ border: '1px solid #ccc', padding: 8 }}>{msg.threadId || ''}</td>}
                              {showVersion && <td style={{ border: '1px solid #ccc', padding: 8 }}>{msg.version || ''}</td>}
                              <td style={{ border: '1px solid #ccc', padding: 8 }}>
                                <pre style={{ margin: 0, fontSize: 13, background: 'none', border: 'none', padding: 0 }}>{typeof msg.body === 'object' ? JSON.stringify(msg.body, null, 2) : String(msg.body)}</pre>
                                {note && <div style={{ fontSize: 12, color: '#b00', fontWeight: 'bold' }}>{note}</div>}
                              </td>
                              <td style={{ border: '1px solid #ccc', padding: 8 }}>
                                {msg.createdAt ? new Date(msg.createdAt).toLocaleString() : ''}
                              </td>
                            </tr>
                          );
                        })()}

                      ))}
                  </tbody>
                </table>
              );
            })() : (
              <span style={{ color: '#888' }}>No messages found.</span>
            )}
          </div>
        </>
      )}
    </div>
  );
}
