// Jest manual mock for @langchain/openai/dist/chat_models.cjs
class ChatOpenAI {
  constructor() {}
  async call() {
    return { content: 'MOCKED_RESPONSE' };
  }
}
module.exports = { ChatOpenAI };
