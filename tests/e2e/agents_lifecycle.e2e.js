// Run this with: node tests/e2e/agents_lifecycle.e2e.js
// Requires Next.js dev server running on http://localhost:3000
const fetch = require('node-fetch');

(async () => {
  try {
    // 1. Create agent
    let res = await fetch('http://localhost:3000/api/agents', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'test-type', host: 'localhost', config: {} })
    });
    if (res.status !== 201) throw new Error('Failed to create agent: ' + res.status);
    const { agent } = await res.json();
    if (!agent || !agent.id) throw new Error('No agent returned');
    console.log('Agent created:', agent.id);

    // 2. Retrieve agent by ID
    res = await fetch(`http://localhost:3000/api/agents/${agent.id}`);
    if (res.status !== 200) throw new Error('Agent not retrievable: ' + res.status);
    const getAgent = await res.json();
    if (!getAgent.agent || getAgent.agent.id !== agent.id) throw new Error('Agent ID mismatch');
    console.log('Agent retrieved:', getAgent.agent.id);

    // 3. Delete agent
    res = await fetch(`http://localhost:3000/api/agents/${agent.id}`, { method: 'DELETE' });
    if (res.status !== 200) throw new Error('Failed to delete agent: ' + res.status);
    console.log('Agent deleted:', agent.id);

    // 4. Ensure agent is gone
    res = await fetch(`http://localhost:3000/api/agents/${agent.id}`);
    if (res.status !== 404) throw new Error('Agent should be gone, got status: ' + res.status);
    console.log('Agent deletion confirmed (404)');

    console.log('E2E agent lifecycle test PASSED');
    process.exit(0);
  } catch (err) {
    console.error('E2E agent lifecycle test FAILED:', err);
    process.exit(1);
  }
})();
