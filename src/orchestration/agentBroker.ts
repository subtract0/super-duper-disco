// agentBroker.ts
// Agent Broker logic: suggests agent ideas as cards and deploys selected agent.
import { v4 as uuidv4 } from 'uuid';
import { AgentOrchestrator, OrchestratedAgent } from './agentOrchestrator';

export type AgentIdeaCard = {
  id: string;
  name: string;
  description: string;
  image: string;
  config: Record<string, any>;
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

function randomAgentIdeas(n: number = 3): AgentIdeaCard[] {
  // Simple static pool for now, can be upgraded to GPT/DALL-E later
  const ideas = [
    {
      name: 'Summarizer',
      description: 'Summarizes long documents or chats.',
      config: { type: 'summarizer' },
    },
    {
      name: 'Sentiment Analyzer',
      description: 'Detects sentiment in messages.',
      config: { type: 'sentiment' },
    },
    {
      name: 'Task Tracker',
      description: 'Tracks and reminds you of tasks.',
      config: { type: 'task-tracker' },
    },
    {
      name: 'Translator',
      description: 'Translates between languages.',
      config: { type: 'translator' },
    },
    {
      name: 'Joke Bot',
      description: 'Tells a new joke every day.',
      config: { type: 'jokebot' },
    },
  ];
  // Shuffle and pick n
  return Array.from({ length: n }, (_, i) => {
    const idea = ideas[Math.floor(Math.random() * ideas.length)];
    return {
      id: uuidv4(),
      name: idea.name,
      description: idea.description,
      ...randomCardArt(),
      config: idea.config,
    };
  });
}

export class AgentBroker {
  orchestrator: AgentOrchestrator;
  constructor(orchestrator: AgentOrchestrator) {
    this.orchestrator = orchestrator;
  }

  suggestIdeas(n: number = 3): AgentIdeaCard[] {
    return randomAgentIdeas(n);
  }

  async deployIdea(card: AgentIdeaCard, host: string = 'default'): Promise<OrchestratedAgent> {
    return this.orchestrator.launchAgent({
      id: uuidv4(),
      type: card.config.type,
      status: 'pending',
      host,
      config: card.config,
    });
  }
}
