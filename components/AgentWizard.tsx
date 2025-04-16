import React, { useState, useEffect } from "react";

const AGENT_TYPES = [
  { value: "telegram", label: "Telegram" },
  { value: "voice", label: "Voice" },
  { value: "file", label: "File" },
  // Add more agent types as needed
];

// AgentWizard component
export default function AgentWizard({ onDeployed }: { onDeployed?: () => void }) {
  // State for wizard steps, agent config, loading, error, and feedback
  const [hosts, setHosts] = useState<{ id: string; name: string }[]>([]);
  const [agentType, setAgentType] = useState(AGENT_TYPES[0].value);
  const [host, setHost] = useState("");
  const [config, setConfig] = useState("");
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Fetch hosts on mount
  useEffect(() => {
    fetch("/api/hosts")
      .then((res) => res.json())
      .then((data) => setHosts(data.hosts || []));
  }, []);

  // Handle deploy button click
  const handleDeploy = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setStatus(null);
    setError(null);
    try {
      const res = await fetch("/api/agents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: agentType, host, config: config ? JSON.parse(config) : {} }),
      });
      if (res.ok) {
        const agent = await res.json();
        setStatus("Agent deployed successfully! Checking health...");
        setAgentType(AGENT_TYPES[0].value);
        setHost("");
        setConfig("");
        if (onDeployed) onDeployed();
        // Poll health for 10s
        if (agent && agent.id) {
          let health = 'pending';
          let checks = 0;
          const poll = async () => {
            try {
              const res = await fetch(`/api/agents/${agent.id}health`);
              const data = await res.json();
              health = data.status || 'pending';
            } catch {}
            checks++;
            if (health === 'healthy' || checks >= 5) {
              setStatus(`Agent deployed successfully! Health: ${health.charAt(0).toUpperCase() + health.slice(1)}`);
            } else {
              setTimeout(poll, 2000);
            }
          };
          poll();
        }
      } else {
        const errMsg = await res.text();
        setError("Failed to deploy agent: " + errMsg);
        setStatus(null);
      }
    } catch (err: any) {
      setError("Error: " + err.message);
      setStatus(null);
    } finally {
      setLoading(false);
    }
  };

  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (step < 2) {
      setStep(step + 1);
    } else {
      handleDeploy(e);
    }
  };

  return (
    <div style={{ marginBottom: 32, border: '1px solid #eee', padding: 16 }}>
      <h2>Deploy New Agent</h2>
      {/* Multi-step form for agent deployment */}
      <form onSubmit={handleSubmit}>
        {step === 0 && (
          <label>
            Agent Type:
            <select value={agentType} onChange={e => setAgentType(e.target.value)}>
              {AGENT_TYPES.map(type => (
                <option key={type.value} value={type.value}>{type.label}</option>
              ))}
            </select>
          </label>
        )}
        {step === 1 && (
          <label>
            Host:
            <select value={host} onChange={e => setHost(e.target.value)}>
              <option value="">Select a host</option>
              {hosts.map(h => (
                <option key={h.id} value={h.id}>{h.name}</option>
              ))}
            </select>
          </label>
        )}
        {step === 2 && (
          <label>
            Config (JSON):
            <textarea
              value={config}
              onChange={e => setConfig(e.target.value)}
              rows={3}
              placeholder={"{\n  \"env\": {\n    \"OPENAI_API_KEY\": \"sk-...\"\n  }\n}"}
            />
          </label>
        )}
        <button type="submit" disabled={loading}>
          {step < 2 ? "Next" : loading ? "Deploying..." : "Deploy Agent"}
        </button>
        {step > 0 && (
          <button type="button" onClick={() => setStep(step - 1)} disabled={loading} style={{ marginLeft: 8 }}>
            Back
          </button>
        )}
      </form>
      {/* User feedback for success or error */}
      {status && <div style={{ color: 'green', marginTop: 12 }}>{status}</div>}
      {error && <div style={{ color: 'red', marginTop: 12 }}>{error}</div>}
    </div>
  );
}
