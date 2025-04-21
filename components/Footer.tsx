import React from "react";

export default function Footer() {
  return (
    <footer className="w-full bg-gradient-to-r from-neutral-900 to-neutral-800 text-white py-6 px-4 flex flex-col md:flex-row items-center justify-between gap-4 border-t border-neutral-700 mt-8"
            role="contentinfo">
      <div className="flex items-center gap-2">
        <span className="font-bold">Cascade Project</span>
        <span className="text-xs opacity-70">&copy; {new Date().getFullYear()}</span>
      </div>
      <div className="flex gap-6 text-sm">
        <a href="/" className="hover:underline focus:outline-none focus-visible:ring-2 ring-blue-400" tabIndex={0}>Home</a>
        <a href="/agents" className="hover:underline focus:outline-none focus-visible:ring-2 ring-blue-400" tabIndex={0}>Agent Swarm Dashboard</a>
        <a href="/accessibility" className="hover:underline focus:outline-none focus-visible:ring-2 ring-blue-400" tabIndex={0}>Accessibility</a>
        <a href="https://github.com/subtract0/super-duper-disco" target="_blank" rel="noopener noreferrer" className="hover:underline focus:outline-none focus-visible:ring-2 ring-blue-400">GitHub</a>
      </div>
    </footer>
  );
}
