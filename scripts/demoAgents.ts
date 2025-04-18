import { agentManager } from "../build/src/orchestration/agentManager.js";

/**
 * This script demonstrates how to deploy and interact with both LangChain and AutoGen agents
 * using the unified agentManager interface.
 */

async function demo() {
  // Deploy a LangChain agent
  agentManager.deployAgent("langchain1", "LangChain Agent", "langchain", {
    openAIApiKey: process.env.OPENAI_API_KEY || "sk-...",
  });
  // Deploy an AutoGen agent
  agentManager.deployAgent("autogen1", "AutoGen Agent", "autogen");

  // Interact with LangChain agent
  const langchainAgentInfo = agentManager.agents.get("langchain1");
  if (langchainAgentInfo && langchainAgentInfo.instance && langchainAgentInfo.type === "langchain") {
    const reply = await langchainAgentInfo.instance.chat("Hello, who are you?");
    console.log("LangChain Agent reply:", reply);
    console.log("LangChain Agent logs:", langchainAgentInfo.instance.getLogs());
  }

  // Interact with AutoGen agent
  const autogenAgentInfo = agentManager.agents.get("autogen1");
  if (autogenAgentInfo && autogenAgentInfo.instance && autogenAgentInfo.type === "autogen") {
    const reply = await autogenAgentInfo.instance.receiveMessage("tester", "What is your function?");
    console.log("AutoGen Agent reply:", reply);
    console.log("AutoGen Agent logs:", autogenAgentInfo.instance.getLogs());
  }
}

demo().catch(console.error);
