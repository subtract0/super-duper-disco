import { callOpenAIGPT } from '../../../utils/telegram/openai';

export class BuilderAgent {
  id: string;
  logs: string[];

  constructor(id: string) {
    this.id = id;
    this.logs = [];
  }

  async receiveRequest(request: string): Promise<string[]> {
    this.logs.push(`[${new Date().toISOString()}] Received request: ${request}`);
    // Use OpenAI to break down the feature request into tickets
    const systemPrompt = 'Break down the following feature request into discrete development tickets.';
    const messages = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: request },
    ];
    const response = await callOpenAIGPT(messages as any);
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
