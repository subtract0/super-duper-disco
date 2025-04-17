import axios from 'axios';

const OPENAI_API_KEY = process.env.OPENAI_API_KEY!;

type Message = { role: string; content: string };

export async function callOpenAIGPT(messages: Message[]): Promise<string> {
  // Format messages for OpenAI API
  const formattedMessages = (messages || [])
    .reverse()
    .filter((msg) => msg && typeof msg.role === 'string' && typeof msg.content === 'string')
    .map((msg) => ({
      role: msg.role === 'agent' ? 'assistant' : 'user',
      content: msg.content,
    }));
  formattedMessages.unshift({
    role: 'system',
    content: 'You are a helpful assistant for a Telegram user. Respond concisely and clearly.',
  });
  const response = await axios.post(
    'https://api.openai.com/v1/chat/completions',
    {
      model: 'gpt-4o-mini',
      messages: formattedMessages,
      max_tokens: 1024,
      temperature: 0.7,
    },
    {
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
    }
  ) as { data: { choices: { message: { content: string } }[] } };
  return response.data.choices[0].message.content.trim();
}
