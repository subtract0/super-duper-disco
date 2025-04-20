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
  const cards = data || [];
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
  // Patch: ensure all cards have config property and match AgentIdeaCard interface
  const agentCards: AgentIdeaCard[] = [];
  for (const card of cards) {
    agentCards.push({
      id: typeof card.id === 'string' ? card.id : '',
      name: typeof card.name === 'string' ? card.name : '',
      description: typeof card.description === 'string' ? card.description : '',
      image: typeof card.image === 'string' ? card.image : '',
      type: typeof card.type === 'string' ? card.type : '',
      elo: typeof card.elo === 'number' ? card.elo : 0,
      times_shown: typeof card.times_shown === 'number' ? card.times_shown : 0,
      times_picked: typeof card.times_picked === 'number' ? card.times_picked : 0,
      created_at: typeof card.created_at === 'string' ? card.created_at : '',
      config: { type: typeof card.type === 'string' ? card.type : '' }
    });
  }
  console.log('[supabaseAgentCards] Returning cards:', agentCards);
  return agentCards;
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
      // Log relevant env for debugging
      console.error('[supabaseAgentCards] Supabase URL:', process.env.NEXT_PUBLIC_SUPABASE_URL);
      console.error('[supabaseAgentCards] Supabase ANON KEY:', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? '[REDACTED]' : '[MISSING]');
      throw new Error(`[supabaseAgentCards] Failed to insert agent card: ${error.message || error}`);
    }
    return {
      id: typeof data.id === 'string' ? data.id : '',
      name: typeof data.name === 'string' ? data.name : '',
      description: typeof data.description === 'string' ? data.description : '',
      image: typeof data.image === 'string' ? data.image : '',
      type: typeof data.type === 'string' ? data.type : '',
      elo: typeof data.elo === 'number' ? data.elo : 0,
      times_shown: typeof data.times_shown === 'number' ? data.times_shown : 0,
      times_picked: typeof data.times_picked === 'number' ? data.times_picked : 0,
      created_at: typeof data.created_at === 'string' ? data.created_at : '',
      config: { type: typeof data.type === 'string' ? data.type : '' }
    };
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
  if (!pickedCard) {
    throw new Error(`[supabaseAgentCards] updateEloForCardSet: pickedCard not found for id ${pickedId}`);
  }
  const unpickedCards = allCards.filter((c: any) => c.id !== pickedId);
  // Use average ELO of unpicked as "opponent"
  const avgUnpickedElo = unpickedCards.length > 0 ? unpickedCards.reduce((a: number, c: any) => a + c.elo, 0) / unpickedCards.length : 1000;
  // Update picked card
  const pickedElo = typeof pickedCard.elo === 'number' ? pickedCard.elo : 0;
  const newPickedElo = calculateElo(pickedElo, avgUnpickedElo, 1);
  const pickedTimesPicked = typeof pickedCard.times_picked === 'number' ? pickedCard.times_picked : 0;
  const pickedTimesShown = typeof pickedCard.times_shown === 'number' ? pickedCard.times_shown : 0;
  await supabase
    .from('agent_idea_cards')
    .update({ elo: newPickedElo, times_picked: pickedTimesPicked + 1, times_shown: pickedTimesShown + 1 })
    .eq('id', pickedId);
  // Update unpicked cards
  for (const card of unpickedCards) {
    const cardElo = typeof card.elo === 'number' ? card.elo : 0;
    const cardTimesShown = typeof card.times_shown === 'number' ? card.times_shown : 0;
    const cardId = typeof card.id === 'string' ? card.id : '';
    const newElo = calculateElo(cardElo, pickedElo, 0);
    await supabase
      .from('agent_idea_cards')
      .update({ elo: newElo, times_shown: cardTimesShown + 1 })
      .eq('id', cardId);
  }
}
