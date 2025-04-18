import { supabase } from '../../utils/supabaseClient';
import { v4 as uuidv4 } from 'uuid';

export interface AgentIdeaCard {
  id: string;
  name: string;
  description: string;
  image: string;
  type: string;
  elo: number;
  times_shown: number;
  times_picked: number;
  created_at: string;
  config?: { type: string };
}

// Fetch N cards ordered by ELO (with some randomness)
export async function fetchAgentCards(n: number): Promise<AgentIdeaCard[]> {
  const { data, error } = await supabase
    .from('agent_idea_cards')
    .select('*')
    .order('elo', { ascending: false })
    .limit(n);
  if (error) {
    console.error('[supabaseAgentCards] fetchAgentCards error:', error);
    // Fallback static card with config
    const fallback = [{
      id: 'static-fallback',
      name: 'Sample Agent',
      description: 'This is a fallback card. If you see this, Supabase may be empty or broken.',
      image: '/card-art-fallback.png',
      type: 'static-fallback',
      elo: 1000,
      times_shown: 0,
      times_picked: 0,
      created_at: '2023-01-01T00:00:00.000Z',
      config: { type: 'static-fallback' }
    }];
    console.log('[supabaseAgentCards] Returning fallback card:', fallback);
    return fallback;
  }
  let cards = data || [];
  // If no cards, fallback
  if (cards.length === 0) {
    const fallback = [{
      id: 'static-fallback',
      name: 'Sample Agent',
      description: 'This is a fallback card. If you see this, Supabase may be empty or broken.',
      image: '/card-art-fallback.png',
      type: 'static-fallback',
      elo: 1000,
      times_shown: 0,
      times_picked: 0,
      created_at: '2023-01-01T00:00:00.000Z',
      config: { type: 'static-fallback' }
    }];
    console.log('[supabaseAgentCards] Returning fallback card:', fallback);
    return fallback;
  }
  // Patch: ensure all cards have config property
  cards = cards.map(card => ({ ...card, config: { type: card.type } }));
  console.log('[supabaseAgentCards] Returning cards:', cards);
  return cards;
}

// Insert a new card
export async function insertAgentCard(card: Omit<AgentIdeaCard, 'id' | 'elo' | 'times_shown' | 'times_picked' | 'created_at'>): Promise<AgentIdeaCard> {
  // Ensure required fields
  const toInsert = {
    ...card,
    type: card.type || (card.config?.type) || 'custom',
    config: card.config || { type: card.type || 'custom' },
    elo: 1500,
    times_shown: 0,
    times_picked: 0,
    created_at: '2023-01-01T00:00:00.000Z',
  };
  try {
    const { data, error } = await supabase
      .from('agent_idea_cards')
      .insert([toInsert])
      .select()
      .single();
    if (error) {
      console.error('[supabaseAgentCards] insertAgentCard error:', error, 'card:', toInsert);
      throw error;
    }
    return data;
  } catch (err) {
    console.error('[supabaseAgentCards] insertAgentCard exception:', err, 'card:', toInsert);
    throw err;
  }
}

// ELO calculation utility
export function calculateElo(current: number, opponent: number, score: 0 | 1, k = 32): number {
  const expected = 1 / (1 + Math.pow(10, (opponent - current) / 400));
  return Math.round(current + k * (score - expected));
}

// Batch update ELO for a set of cards
export async function updateEloForCardSet(
  pickedId: string,
  shownIds: string[],
): Promise<void> {
  // Fetch all cards
  const { data: allCards, error } = await supabase
    .from('agent_idea_cards')
    .select('*')
    .in('id', shownIds);
  if (error || !allCards) { console.error('[supabaseAgentCards] updateEloForCardSet error:', error); throw error || new Error('Could not fetch cards for ELO update'); }
  const pickedCard = allCards.find((c: any) => c.id === pickedId);
  const unpickedCards = allCards.filter((c: any) => c.id !== pickedId);
  // Use average ELO of unpicked as "opponent"
  const avgUnpickedElo = unpickedCards.length > 0 ? unpickedCards.reduce((a: number, c: any) => a + c.elo, 0) / unpickedCards.length : 1000;
  // Update picked card
  const newPickedElo = calculateElo(pickedCard.elo, avgUnpickedElo, 1);
  await supabase
    .from('agent_idea_cards')
    .update({ elo: newPickedElo, times_picked: pickedCard.times_picked + 1, times_shown: pickedCard.times_shown + 1 })
    .eq('id', pickedId);
  // Update unpicked cards
  for (const card of unpickedCards) {
    const newElo = calculateElo(card.elo, pickedCard.elo, 0);
    await supabase
      .from('agent_idea_cards')
      .update({ elo: newElo, times_shown: card.times_shown + 1 })
      .eq('id', card.id);
  }
}
