import 'openai/shims/node';
// Mock for langchain/chat_models/openai for Jest
class ChatOpenAI {
  constructor() {}
  async call() {
    return { content: 'MOCKED_RESPONSE' };
  }
}
module.exports = { ChatOpenAI };
