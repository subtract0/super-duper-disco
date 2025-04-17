import React, { useEffect, useState } from "react";
import AgentBrokerCardDeck, { AgentIdeaCard } from "./AgentBrokerCardDeck";

export default function AgentBrokerPanel() {
  const [cards, setCards] = useState<AgentIdeaCard[]>([]);
  const [loadingId, setLoadingId] = useState<string | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const fetchIdeas = async () => {
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch("/api/broker?n=3");
      const data = await res.json();
      setCards(data.cards || []);
    } catch (e: any) {
      setError("Failed to fetch agent ideas");
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
      const res = await fetch("/api/broker", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ card }),
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
    <div style={{ margin: '32px 0', textAlign: 'center' }}>
      <h2 style={{ fontSize: 28, fontWeight: 800, marginBottom: 18 }}>
        Agent Broker: Choose Your Next Agent
      </h2>
      <p style={{ color: '#555', marginBottom: 18 }}>
        Pick a card to deploy a new agent. New choices will appear after each pick!
      </p>
      <AgentBrokerCardDeck cards={cards} onSelect={handleSelect} loadingId={loadingId} />
      {error && <div style={{ color: 'red', marginTop: 18 }}>{error}</div>}
      {success && <div style={{ color: 'green', marginTop: 18 }}>{success}</div>}
      <button onClick={fetchIdeas} style={{ marginTop: 32, padding: '10px 28px', borderRadius: 8, background: '#222', color: '#fff', fontWeight: 600, fontSize: 16, border: 'none', boxShadow: '0 2px 8px rgba(0,0,0,0.08)', cursor: 'pointer' }}>
        Shuffle Cards
      </button>
    </div>
  );
}
