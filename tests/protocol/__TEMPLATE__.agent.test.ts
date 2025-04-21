import 'openai/shims/node';
// __TEMPLATE__: Agent test template for protocol and orchestrator tests
// Ensures all agent mocks implement EventEmitter and test-environment guards are respected

import { BaseAgent } from '../../src/orchestration/agents/BaseAgent';
import { EventEmitter } from 'events';

describe('Agent Test Template', () => {
  class DummyAgent extends BaseAgent {
    constructor() {
      super('dummy', 'DummyAgent');
    }
    // Add agent-specific methods here
  }

  let agent: DummyAgent;

  beforeEach(() => {
    agent = new DummyAgent();
  });

  test('should implement EventEmitter interface', () => {
    expect(agent).toBeInstanceOf(EventEmitter);
    expect(typeof agent.on).toBe('function');
    expect(typeof agent.emit).toBe('function');
  });

  test('should not start heartbeat timer in test environment', () => {
    process.env.NODE_ENV = 'test';
    agent.start();
    // Heartbeat timer should not be set
    expect(agent["beatTimer"]).toBeUndefined();
  });

  afterEach(() => {
    agent.stop();
    delete process.env.NODE_ENV;
  });
});
