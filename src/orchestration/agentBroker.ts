// agentBroker.ts
// Agent Broker logic: suggests agent ideas as cards and deploys selected agent.
import { v4 as uuidv4 } from 'uuid';
import { AgentOrchestrator, OrchestratedAgent } from './agentOrchestrator';
import { agentHistoryStore } from './agentHistory';
import { fetchAgentCards, insertAgentCard, updateEloForCardSet, AgentIdeaCard as PersistentAgentIdeaCard } from './supabaseAgentCards';

export type AgentIdeaCard = {
  id: string;
  name: string;
  description: string;
  image: string;
  config: Record<string, any>;
  elo?: number;
  times_shown?: number;
  times_picked?: number;
  created_at?: string;
};

import fs from 'fs';
import path from 'path';

function getAvailableCardImages(): string[] {
  const dir = path.join(process.cwd(), 'public', 'card-art');
  try {
    const files = fs.readdirSync(dir);
    return files.filter(f => /\.(png|jpg|jpeg)$/i.test(f)).map(f => `/card-art/${f}`);
  } catch {
    return [];
  }
}

function randomCardArt(): { image: string; alt: string } {
  const images = getAvailableCardImages();
  if (images.length === 0) {
    return { image: '/card-art-fallback.png', alt: 'Default agent card art' };
  }
  const pick = images[Math.floor(Math.random() * images.length)];
  return { image: pick, alt: path.basename(pick, path.extname(pick)).replace(/[-_]/g, ' ') + ' art' };
}

import axios from 'axios';

const staticIdeas = [
  { name: 'Summarizer', description: 'Summarizes long documents or chats.', config: { type: 'summarizer' } },
  { name: 'Sentiment Analyzer', description: 'Detects sentiment in messages.', config: { type: 'sentiment' } },
  { name: 'Task Tracker', description: 'Tracks and reminds you of tasks.', config: { type: 'task-tracker' } },
  { name: 'Translator', description: 'Translates between languages.', config: { type: 'translator' } },
  { name: 'Joke Bot', description: 'Tells a new joke every day.', config: { type: 'jokebot' } },
];

const cachedIdeas: AgentIdeaCard[] | null = null;

async function fetchAgentIdeasFromLLM(n: number = 3): Promise<AgentIdeaCard[]> {
  try {
    const prompt = `Generate ${n} creative, useful, and novel agent ideas for a software agent platform. For each, provide a catchy name, a one-sentence description, and a unique agent type string. Format as JSON array: [{ name, description, type }].`;
    const resp = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: 'gpt-4',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.9,
        max_tokens: 400,
      },
      {
        headers: {
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
          'Content-Type': 'application/json',
        },
      },
    );
    const data: any = resp.data;
    const content = data.choices[0].message.content;
    const parsed = JSON.parse(content);
    return parsed.map((idea: any) => ({
      id: uuidv4(),
      name: idea.name,
      description: idea.description,
      ...randomCardArt(),
      config: { type: idea.type },
    }));
  } catch (e) {
    return [];
  }
}

// Persistent smart agent idea fetcher with ELO and learning
export async function smartAgentIdeas(n: number = 3): Promise<AgentIdeaCard[]> {
  // Always generate n new ideas from LLM
  const newIdeas = await fetchAgentIdeasFromLLM(n);
  const cards: AgentIdeaCard[] = [];
  for (const idea of newIdeas) {
    // Insert into Supabase and get the real card (with id, elo, etc)
    const newCard = await insertAgentCard({
      name: idea.name,
      description: idea.description,
      image: idea.image,
      type: idea.config.type
    });
    cards.push({ ...newCard, config: { type: newCard.type } });
  }
  // If not enough cards, fill with static
  while (cards.length < n) {
    const fallback = {
      name: 'Fallback Agent',
      description: 'A fallback agent card.',
      image: '/card-art-fallback.png',
      type: 'fallback-' + Math.random().toString(36).substring(2, 8)
    };
    const inserted = await insertAgentCard(fallback);
    cards.push({ ...inserted, config: { type: inserted.type } });
  }
  // Shuffle cards for randomness
  for (let i = cards.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [cards[i], cards[j]] = [cards[j], cards[i]];
  }
  return cards.slice(0, n);
}

// Stub: feedback loop for user like/dislike (to be implemented in UI)
export function submitIdeaFeedback(cardId: string, feedback: 'like' | 'dislike') {
  // TODO: store feedback for future personalization
  return true;
}


export class AgentBroker {
  orchestrator: AgentOrchestrator;
  constructor(orchestrator: AgentOrchestrator) {
    this.orchestrator = orchestrator;
  }

  async suggestIdeas(n: number = 3): Promise<AgentIdeaCard[]> {
    return smartAgentIdeas(n);
  }

  async deployIdea(card: AgentIdeaCard, host: string = 'default'): Promise<OrchestratedAgent> {
    const agent = await this.orchestrator.launchAgent({
      id: uuidv4(),
      type: card.config.type,
      config: card.config,
    });
    await agentHistoryStore.save({
      agentId: agent.id,
      cardName: card.name,
      timestamp: Date.now(),
      host,
      config: card.config,
    });
    return agent;
  }

  getDeploymentHistory(limit: number = 20) {
    return agentHistoryStore.getDeployments(limit);
  }

  // ELO learning: update ELO for picked and unpicked cards
  async updateEloLearning(pickedId: string, shownIds: string[]): Promise<void> {
    if (!pickedId || !shownIds || shownIds.length === 0) return;
    await updateEloForCardSet(pickedId, shownIds);
  }
}

