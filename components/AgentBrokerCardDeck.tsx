import React from "react";

export type AgentIdeaCard = {
  id: string;
  name: string;
  description: string;
  image: string;
};

interface Props {
  cards: AgentIdeaCard[];
  onSelect: (card: AgentIdeaCard) => void;
  loadingId?: string;
}

export default function AgentBrokerCardDeck({ cards, onSelect, loadingId }: Props) {
  return (
    <div style={{ display: 'flex', gap: 24, justifyContent: 'center', marginTop: 32 }}>
      {cards.map(card => (
        <div
          key={card.id}
          style={{
            width: 220,
            border: '2px solid #333',
            borderRadius: 16,
            background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
            boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
            cursor: loadingId ? 'not-allowed' : 'pointer',
            opacity: loadingId === card.id ? 0.5 : 1,
            transition: 'opacity 0.2s',
            position: 'relative',
          }}
          onClick={() => !loadingId && onSelect(card)}
        >
          <img
            src={card.image}
            alt={card.name}
            style={{
              width: '100%',
              height: 140,
              objectFit: 'cover',
              borderTopLeftRadius: 14,
              borderTopRightRadius: 14,
            }}
          />
          <div style={{ padding: 16 }}>
            <h3 style={{ fontFamily: 'serif', fontWeight: 700, fontSize: 20, marginBottom: 8 }}>{card.name}</h3>
            <p style={{ fontSize: 15, color: '#333', minHeight: 48 }}>{card.description}</p>
          </div>
          {loadingId === card.id && (
            <div style={{
              position: 'absolute',
              top: 0, left: 0, right: 0, bottom: 0,
              background: 'rgba(255,255,255,0.7)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 600,
              fontSize: 18,
              borderRadius: 16,
            }}>
              Deploying...
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
