import { AgentManager } from "../src/orchestration/agentManager";
import { LangChainAgent } from "../src/orchestration/langchainAgent";
import { AutoGenAgent } from "../src/orchestration/autoGenAgent";

const agentManager = new AgentManager();

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
    const langchainInstance = langchainAgentInfo.instance as LangChainAgent;
    const reply = await langchainInstance.chat("Hello, who are you?");
    console.log("LangChain Agent reply:", reply);
    console.log("LangChain Agent logs:", langchainInstance.getLogs());
  }

  // Interact with AutoGen agent
  const autogenAgentInfo = agentManager.agents.get("autogen1");
  if (autogenAgentInfo && autogenAgentInfo.instance && autogenAgentInfo.type === "autogen") {
    const autogenInstance = autogenAgentInfo.instance as AutoGenAgent;
    const reply = await autogenInstance.receiveMessage("tester", "What is your function?");
    console.log("AutoGen Agent reply:", reply);
    console.log("AutoGen Agent logs:", autogenInstance.getLogs());
  }
}

demo().catch(console.error);
