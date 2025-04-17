import React from "react";
import { AgentIdeaCard } from "./AgentBrokerCardDeck";

interface Props {
  card: AgentIdeaCard | null;
  open: boolean;
  onClose: () => void;
  onDeploy: (card: AgentIdeaCard) => void;
}

export default function AgentCardDetailsModal({ card, open, onClose, onDeploy }: Props) {
  if (!open || !card) return null;
  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
      background: 'rgba(0,0,0,0.45)', zIndex: 1000,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <div style={{
        background: '#fff', borderRadius: 18, padding: 28, minWidth: 340, maxWidth: 400,
        boxShadow: '0 8px 32px rgba(0,0,0,0.18)', position: 'relative',
      }}>
        <button onClick={onClose} style={{ position: 'absolute', top: 10, right: 12, background: 'transparent', border: 'none', fontSize: 22, cursor: 'pointer' }} aria-label="Close">×</button>
        <img src={card.image} alt={card.alt || card.name} style={{ width: '100%', borderRadius: 12, marginBottom: 18 }} />
        <h2 style={{ fontSize: 26, marginBottom: 8 }}>{card.name}</h2>
        <p style={{ fontSize: 16, color: '#444', marginBottom: 18 }}>{card.description}</p>
        {/* Future: Agent config editing UI here */}
        <button
          onClick={() => onDeploy(card)}
          style={{ width: '100%', padding: '12px 0', borderRadius: 8, background: '#2563eb', color: '#fff', fontWeight: 700, fontSize: 18, border: 'none', marginTop: 10, cursor: 'pointer' }}
        >
          Deploy Agent
        </button>
      </div>
    </div>
  );
}
