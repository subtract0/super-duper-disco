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
              </tr>
            </thead>
            <tbody>
              {Object.entries(orchState.health).map(([id, status]) => (
                <tr key={id}>
                  <td style={{ border: '1px solid #ccc', padding: 8 }}>{id}</td>
                  <td style={{ border: '1px solid #ccc', padding: 8 }}>{status}</td>
                </tr>
              ))}
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
        </>
      )}
    </div>
  );
}
