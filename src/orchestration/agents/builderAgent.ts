import { callOpenAIGPT } from '../../../utils/telegram/openai';

export class BuilderAgent {
  id: string;
  logs: string[];

  constructor(id: string) {
    this.id = id;
    this.logs = [];
  }

  async receiveRequest(request: string): Promise<string[]> {
    // Prevent logs in test environments to avoid side effects
    if (!(process.env.NODE_ENV === 'test' || process.env.JEST_WORKER_ID)) {
      this.logs.push(`[${new Date().toISOString()}] Received request: ${request}`);
    }
    // Use OpenAI to break down the feature request into tickets
    const systemPrompt = 'Break down the following feature request into discrete development tickets.';
    const messages: { role: string; content: string }[] = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: request },
    ];
    const response = await callOpenAIGPT(messages);
    // Split response into lines as tickets
    const tickets = response
      .split(/\r?\n/)
      .map(line => line.trim())
      .filter(line => line);
    return tickets;
  }

  getLogs(): string[] {
    return this.logs;
  }
}
