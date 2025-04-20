import * as React from "react";
import { useEffect, useState } from "react";
import AgentBrokerCardDeck, { AgentIdeaCard } from "./AgentBrokerCardDeck";

export default function AgentBrokerPanel() {
  const [cards, setCards] = useState<AgentIdeaCard[]>([]);
  const [loadingId, setLoadingId] = useState<string | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [shuffling, setShuffling] = useState(false);
  // For prompt-to-card creation
  const [prompt, setPrompt] = useState("");
  const [promptLoading, setPromptLoading] = useState(false);
  const [promptError, setPromptError] = useState<string | null>(null);

  const fetchIdeas = async () => {
    setError(null);
    setSuccess(null);
    setShuffling(true);
    // Clear cards to force visual refresh
    setCards([]);
    try {
      const res = await fetch("/api/broker?n=3");
      const data = await res.json();
      if (!res.ok) {
        setError(data?.error || 'Failed to fetch agent ideas');
        setCards([]);
        return;
      }
      if (!data.cards || !Array.isArray(data.cards) || data.cards.length === 0) {
        setError('No agent cards returned from the API.');
        setCards([]);
        return;
      }
      setCards(data.cards);
    } catch (e: any) {
      setError("Failed to fetch agent ideas");
    } finally {
      setShuffling(false);
    }
  };

  useEffect(() => {
    fetchIdeas();
  }, []);

  const handleSelect = async (card: AgentIdeaCard) => {
    setLoadingId(card.id);
    setError(null);
    setSuccess(null);
    try {
      const shownCardIds = cards.map(c => c.id);
      const res = await fetch("/api/broker", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ card, shownCardIds }),
      });
      if (res.ok) {
        setSuccess("Agent deployed! Fetching new ideas...");
        setTimeout(() => {
          setLoadingId(undefined);
          setSuccess(null);
          fetchIdeas();
        }, 1200);
      } else {
        const errMsg = await res.text();
        setError("Failed to deploy agent: " + errMsg);
        setLoadingId(undefined);
      }
    } catch (e: any) {
      setError("Error: " + e.message);
      setLoadingId(undefined);
    }
  };

  return (
    <div style={{ margin: '32px 0', textAlign: 'center', background: 'rgba(255,255,255,0.85)', borderRadius: 18, padding: '32px 16px 40px 16px', boxShadow: '0 6px 32px rgba(0,0,0,0.10)', maxWidth: 700, marginLeft: 'auto', marginRight: 'auto' }}>
      <h2 style={{ fontSize: 28, fontWeight: 800, marginBottom: 18 }}>
        Agent Broker: Choose Your Next Agent
      </h2>
      <p style={{ color: '#555', marginBottom: 18 }}>
        Pick a card to deploy a new agent. New choices will appear after each pick!
      </p>
      {/* Prompt-to-card UI */}
      <div style={{ margin: '0 auto 28px', maxWidth: 520, display: 'flex', gap: 8, alignItems: 'center', justifyContent: 'center', background: '#eaf1fb', borderRadius: 8, padding: '10px 12px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
        <input
          value={prompt}
          onChange={e => setPrompt(e.target.value)}
          placeholder="Describe your agent idea (e.g. 'An agent that ...')"
          style={{ flex: 1, padding: '8px 12px', borderRadius: 6, border: '1px solid #ccc', fontSize: 16 }}
          disabled={promptLoading}
        />
        <button
          onClick={async () => {
            setPromptLoading(true);
            setPromptError(null);
            try {
              const res = await fetch("/api/broker/prompt", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ prompt }),
              });
              if (!res.ok) {
                const errMsg = await res.text();
                let msg = errMsg;
                try {
                  const parsed = JSON.parse(errMsg);
                  if (parsed && parsed.error) {
                    msg = parsed.error;
                  }
                } catch {}
                setPromptError(msg);
              } else {
                setPrompt("");
                fetchIdeas();
              }
            } catch (e: any) {
              setPromptError("Error: " + e.message);
            } finally {
              setPromptLoading(false);
            }
          }}
          disabled={promptLoading || !prompt.trim()}
          style={{
            padding: '8px 20px',
            borderRadius: 6,
            background: promptLoading ? '#888' : '#0059b2',
            color: '#fff',
            fontWeight: 600,
            border: 'none',
            fontSize: 16,
            cursor: promptLoading || !prompt.trim() ? 'not-allowed' : 'pointer',
            opacity: promptLoading ? 0.7 : 1
          }}
        >
          {promptLoading ? 'Creating...' : 'Create from Prompt'}
        </button>
      </div>
      {promptError && <div style={{ color: '#b00020', background: '#ffeaea', borderRadius: 6, padding: '8px 14px', marginBottom: 12, fontWeight: 600, fontSize: 16 }}>{promptError}</div>}
      <AgentBrokerCardDeck cards={cards} onSelect={handleSelect} loadingId={loadingId} />
      {error && <div style={{ color: '#b00020', background: '#ffeaea', borderRadius: 6, padding: '8px 14px', marginTop: 18, fontWeight: 600, fontSize: 16 }}>{error}</div>}
      {success && <div style={{ color: '#007e33', background: '#e6fae9', borderRadius: 6, padding: '8px 14px', marginTop: 18, fontWeight: 600, fontSize: 16 }}>{success}</div>}
      <button
        onClick={fetchIdeas}
        disabled={shuffling || loadingId !== undefined}
        style={{
          marginTop: 32,
          padding: '12px 32px',
          borderRadius: 8,
          background: shuffling ? '#b0b7c6' : '#0059b2',
          color: '#fff',
          fontWeight: 700,
          fontSize: 18,
          border: 'none',
          boxShadow: '0 2px 8px rgba(0,0,0,0.10)',
          cursor: shuffling || loadingId !== undefined ? 'not-allowed' : 'pointer',
          opacity: shuffling ? 0.7 : 1,
          letterSpacing: 0.5
        }}
      >
        {shuffling ? 'Shuffling...' : 'Shuffle Cards'}
      </button>
    </div>
  );
}
