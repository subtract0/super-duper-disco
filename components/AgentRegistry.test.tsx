import React from "react";
import { render, act, screen, waitFor } from "@testing-library/react";
import AgentRegistry from "./AgentRegistry";

jest.useFakeTimers();

describe("AgentRegistry UI notifications", () => {
  it("shows a toast when agent status changes to recovered, restarting, or recovery_failed", async () => {
    // Sequence of agent states to simulate backend status changes
    const agentStates = [
      [{ id: "a1", type: "test", status: "healthy", host: "localhost", config: {} }],
      [{ id: "a1", type: "test", status: "recovered", host: "localhost", config: {} }],
      [{ id: "a1", type: "test", status: "restarting", host: "localhost", config: {} }],
      [{ id: "a1", type: "test", status: "recovery_failed", host: "localhost", config: {} }],
    ];
    let fetchCall = 0;
    (global as any).fetch = jest.fn(() =>
      Promise.resolve({
        json: () => Promise.resolve({ agents: agentStates[Math.min(fetchCall++, agentStates.length - 1)] })
      })
    );
    render(<AgentRegistry />);

    // Initial fetch (healthy)
    await waitFor(() => expect(screen.getByText(/agent registry/i)).toBeInTheDocument());

    // Simulate refresh to 'recovered'
    const refreshBtn = screen.getByTitle(/refresh/i);
    await act(async () => {
      refreshBtn.click();
      jest.advanceTimersByTime(100);
    });
    await waitFor(() => expect(screen.getByText('Agent a1 recovered successfully')).toBeInTheDocument());

    // Simulate refresh to 'restarting'
    await act(async () => {
      refreshBtn.click();
      jest.advanceTimersByTime(100);
    });
    await waitFor(() => expect(screen.getByText('Agent a1 is restarting...')).toBeInTheDocument());

    // Simulate refresh to 'recovery_failed'
    await act(async () => {
      refreshBtn.click();
      jest.advanceTimersByTime(100);
    });
    await waitFor(() => expect(screen.getByText('Agent a1 recovery failed')).toBeInTheDocument());

    // Toasts auto-dismiss after 4s
    // Dismiss each toast individually (since each is removed after 4s)
    const toastMessages = [
      'Agent a1 recovered successfully',
      'Agent a1 is restarting...',
      'Agent a1 recovery failed',
    ];
    for (const msg of toastMessages) {
      await act(async () => {
        jest.advanceTimersByTime(4000);
        jest.runOnlyPendingTimers();
      });
      await waitFor(() => {
        expect(screen.queryByText(msg)).not.toBeInTheDocument();
      });
    }
    // Assert all toasts are gone
    toastMessages.forEach(msg => {
      expect(screen.queryByText(msg)).not.toBeInTheDocument();
    });
  });
});
