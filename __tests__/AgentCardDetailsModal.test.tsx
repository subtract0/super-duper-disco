import '@testing-library/jest-dom';
import React from 'react';
import { render, fireEvent, screen } from '@testing-library/react';
import AgentCardDetailsModal from '../components/AgentCardDetailsModal';
import { AgentIdeaCard } from '../components/AgentBrokerCardDeck';

describe('AgentCardDetailsModal', () => {
  const baseCard: AgentIdeaCard = {
    id: '1',
    name: 'Test Agent',
    description: 'A test agent',
    image: '',
  };
  const noop = () => {};

  it('renders with initial values', () => {
    render(
      <AgentCardDetailsModal card={baseCard} open={true} onClose={noop} onDeploy={noop} />
    );
    expect(screen.getByLabelText(/Name/i)).toHaveValue('Test Agent');
    expect(screen.getByLabelText(/Description/i)).toHaveValue('A test agent');
    expect(screen.getByLabelText(/Role/i)).toBeInTheDocument();
  });

  it('renders the extensible agent config fields scaffold', () => {
    render(
      <AgentCardDetailsModal card={baseCard} open={true} onClose={noop} onDeploy={noop} />
    );
    expect(screen.getByTestId('agent-config-fields')).toBeInTheDocument();
    expect(screen.getByText(/More config fields coming soon/i)).toBeInTheDocument();
  });

  it('validates required fields', () => {
    render(
      <AgentCardDetailsModal card={baseCard} open={true} onClose={noop} onDeploy={noop} />
    );
    fireEvent.change(screen.getByLabelText(/Name/i), { target: { value: '' } });
    fireEvent.change(screen.getByLabelText(/Description/i), { target: { value: '' } });
    fireEvent.submit(screen.getByTestId('agent-details-form'));
    expect(screen.getByText(/required/i)).toBeInTheDocument();
  });

  it('validates role selection', () => {
    render(
      <AgentCardDetailsModal card={baseCard} open={true} onClose={noop} onDeploy={noop} />
    );
    // Try to submit without selecting a role
    fireEvent.submit(screen.getByTestId('agent-details-form'));
    expect(screen.getByText(/Role is required/i)).toBeInTheDocument();
  });

  it('calls onDeploy with edited values and propagates config', () => {
    const onDeploy = jest.fn();
    render(
      <AgentCardDetailsModal card={baseCard} open={true} onClose={noop} onDeploy={onDeploy} />
    );
    fireEvent.change(screen.getByLabelText(/Name/i), { target: { value: 'Updated' } });
    fireEvent.change(screen.getByLabelText(/Description/i), { target: { value: 'Desc' } });
    fireEvent.change(screen.getByLabelText(/Role/i), { target: { value: 'Researcher' } });
    // Set tool in config
    fireEvent.change(screen.getByLabelText(/Tool/i), { target: { value: 'summarize' } });
    fireEvent.submit(screen.getByTestId('agent-details-form'));
    expect(onDeploy).toHaveBeenCalledWith({ ...baseCard, name: 'Updated', description: 'Desc', role: 'Researcher', config: { tool: 'summarize' } });
  });

  it('calls onDeploy with empty config if no tool selected', () => {
    const onDeploy = jest.fn();
    render(
      <AgentCardDetailsModal card={baseCard} open={true} onClose={noop} onDeploy={onDeploy} />
    );
    fireEvent.change(screen.getByLabelText(/Name/i), { target: { value: 'Updated' } });
    fireEvent.change(screen.getByLabelText(/Description/i), { target: { value: 'Desc' } });
    fireEvent.change(screen.getByLabelText(/Role/i), { target: { value: 'Coder' } });
    fireEvent.submit(screen.getByTestId('agent-details-form'));
    expect(onDeploy).toHaveBeenCalledWith({ ...baseCard, name: 'Updated', description: 'Desc', role: 'Coder', config: {} });
  });
});
