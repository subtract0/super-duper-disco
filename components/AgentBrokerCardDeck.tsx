import React, { useState } from "react";
import Image from "next/image";
import AgentCardDetailsModal from "./AgentCardDetailsModal";

// Extensible agent config type for modal/deployment
export type AgentIdeaCard = {
  id: string;
  name: string;
  description: string;
  image: string;
  alt?: string;
  // Config fields for extensibility (unified with backend)
  config?: Record<string, any>;
  role?: string;
};

interface Props {
  cards: AgentIdeaCard[];
  onSelect: (card: AgentIdeaCard) => void;
  loadingId?: string;
}

export default function AgentBrokerCardDeck({ cards, onSelect, loadingId }: Props) {
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedCard, setSelectedCard] = useState<AgentIdeaCard | null>(null);

  const handleCardClick = (card: AgentIdeaCard) => {
    if (loadingId) return;
    setSelectedCard(card);
    setModalOpen(true);
  };
  const handleClose = () => {
    setModalOpen(false);
    setSelectedCard(null);
  };
  const handleDeploy = (card: AgentIdeaCard) => {
    setModalOpen(false);
    onSelect(card);
  };

  // Debug log
  console.log('[AgentBrokerCardDeck] cards prop:', cards);
  return (
    <>
      {(!cards || cards.length === 0) ? (
        <div style={{ color: 'red', marginTop: 40, fontWeight: 600, fontSize: 18 }}>
          No agent cards available. Try creating one with the prompt above!
        </div>
      ) : null}
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
            onClick={() => handleCardClick(card)}
          >
          <Image
            src={card.image}
            alt={card.alt || card.name}
            width={220}
            height={140}
            style={{
              width: '100%',
              height: 140,
              objectFit: 'cover',
              borderTopLeftRadius: 14,
              borderTopRightRadius: 14,
            }}
            priority
            unoptimized={false}
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
      <AgentCardDetailsModal
        card={selectedCard}
        open={modalOpen}
        onClose={handleClose}
        onDeploy={handleDeploy}
      />
    </>
  );
}
