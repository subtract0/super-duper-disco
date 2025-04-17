import React from "react";
import Link from "next/link";

export default function AppNav() {
  return (
    <nav style={{
      width: '100%',
      padding: '16px 0',
      background: 'linear-gradient(90deg, #222 0%, #444 100%)',
      color: '#fff',
      display: 'flex',
      justifyContent: 'center',
      gap: 32,
      fontSize: 18,
      fontWeight: 700,
      letterSpacing: 1,
      boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
      zIndex: 100,
    }}>
      <Link href="/" style={{ color: '#fff', textDecoration: 'none' }}>Home</Link>
      <Link href="/agents" style={{ color: '#fff', textDecoration: 'none' }}>Agent Swarm Dashboard</Link>
    </nav>
  );
}
