import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import AgentBrokerPanel from '../components/AgentBrokerPanel';

// Mock fetch for cards and prompt creation
beforeEach(() => {
  global.fetch = jest.fn((url, opts) => {
    if (url?.toString().includes('/api/broker') && (!opts || opts.method === 'GET')) {
      return Promise.resolve({
        ok: true,
        json: async () => ({ cards: [
          { id: '1', name: 'Test Agent', description: 'Test Desc', image: '', config: { type: 'test' } },
          { id: '2', name: 'Test Agent 2', description: 'Test Desc 2', image: '', config: { type: 'test2' } }
        ] })
      });
    }
    if (url?.toString().includes('/api/broker/prompt')) {
      return Promise.resolve({ ok: true, json: async () => ({ ok: true }) });
    }
    if (opts && opts.method === 'POST') {
      return Promise.resolve({ ok: true, json: async () => ({ ok: true }) });
    }
    return Promise.reject('Unknown fetch');
  }) as any;
});

afterEach(() => {
  jest.resetAllMocks();
});

test('renders cards and allows shuffle', async () => {
  render(<AgentBrokerPanel />);
  expect(await screen.findByText(/Test Agent/)).toBeInTheDocument();
  fireEvent.click(screen.getByText(/Shuffle Cards/));
  // Should show loading and then cards again
  await waitFor(() => expect(screen.getByText(/Test Agent/)).toBeInTheDocument());
});

test('creates agent card from prompt', async () => {
  render(<AgentBrokerPanel />);
  const input = screen.getByPlaceholderText(/Describe your agent idea/);
  fireEvent.change(input, { target: { value: 'A custom agent for Reddit marketing' } });
  fireEvent.click(screen.getByText(/Create from Prompt/));
  await waitFor(() => expect(input).toHaveValue(''));
});

test('handles backend error gracefully', async () => {
  (global.fetch as any).mockImplementationOnce(() => Promise.resolve({ ok: false, text: async () => 'fail' }));
  render(<AgentBrokerPanel />);
  await waitFor(() => expect(screen.getByText(/Failed to fetch agent ideas/)).toBeInTheDocument());
});
