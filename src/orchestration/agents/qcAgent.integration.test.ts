// Dedicated integration test for QCAgent using dependency injection to avoid real SDK/fetch issues
import { QCAgent } from './qcAgent';
import { EventEmitter } from 'events';

describe('QCAgent', () => {
  it('should review a developer implementation using a mock LangChainAgent', async () => {
    class MockLangChainAgent extends EventEmitter {
      chat = jest.fn().mockResolvedValue('PASS: Looks good!');
      getLogs = jest.fn().mockReturnValue(['mock log']);
    }
    const mockAgent = new MockLangChainAgent();
    const qc = new QCAgent('qc-id', 'dummy-key', mockAgent);
    const ticket = 'Implement login feature';
    const implementation = 'function login() { /* ... */ } // tests pass';
    const result = await qc.reviewImplementation(ticket, implementation);
    expect(result).toContain('PASS');
    expect(mockAgent.chat).toHaveBeenCalledWith(expect.stringContaining('Quality Control'));
  });
});
