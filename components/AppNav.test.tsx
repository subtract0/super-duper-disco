import React from "react";
import { render, screen } from "@testing-library/react";
import AppNav from "./AppNav";
import { usePathname } from "next/navigation";

jest.mock("next/navigation", () => ({
  usePathname: jest.fn(),
}));

describe("AppNav", () => {
  it("renders Home and Agent Swarm Dashboard links", () => {
    (usePathname as jest.Mock).mockReturnValue("/");
    render(<AppNav />);
    expect(screen.getByRole("link", { name: /home/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /agent swarm dashboard/i })).toBeInTheDocument();
  });

  it("highlights the current route", () => {
    (usePathname as jest.Mock).mockReturnValue("/agents");
    render(<AppNav />);
    const dashboardLink = screen.getByRole("link", { name: /agent swarm dashboard/i });
    expect(dashboardLink).toHaveClass("bg-blue-600");
    const homeLink = screen.getByRole("link", { name: /home/i });
    expect(homeLink).not.toHaveClass("bg-blue-600");
  });

  it("has accessible skip to content link", () => {
    (usePathname as jest.Mock).mockReturnValue("/");
    render(<AppNav />);
    const skipLink = screen.getByText(/skip to main content/i);
    expect(skipLink).toHaveClass("sr-only");
    skipLink.focus();
    expect(document.activeElement).toBe(skipLink);
  });
});
