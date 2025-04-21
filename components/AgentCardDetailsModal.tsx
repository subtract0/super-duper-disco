import React from "react";
import Image from "next/image";
import { AgentIdeaCard } from "./AgentBrokerCardDeck";

interface Props {
  card: AgentIdeaCard | null;
  open: boolean;
  onClose: () => void;
  onDeploy: (card: AgentIdeaCard) => void;
}

export default function AgentCardDetailsModal({ card, open, onClose, onDeploy }: Props) {
  const [editName, setEditName] = React.useState(card?.name || '');
  const [editDesc, setEditDesc] = React.useState(card?.description || '');
  const [editRole, setEditRole] = React.useState('');
  // Extensible agent config fields (object for future extensibility)
  // Extensible agent config fields (type-safe, generic for future extension)
  // Remove editConfig state for now (not used until config fields are enabled)
  type AgentConfig = Record<string, any>;
  const [editConfig, setEditConfig] = React.useState<AgentConfig>(typeof card?.config === 'object' && card?.config !== null ? card.config : {});
  const [validationError, setValidationError] = React.useState('');

  React.useEffect(() => {
    setEditName(card?.name || '');
    setEditDesc(card?.description || '');
    setEditRole(''); // Reset role on open
    setEditConfig(typeof card?.config === 'object' && card?.config !== null ? card.config : {}); // Reset config on open
    setValidationError('');
  }, [card, open]);

  if (!open || !card) return null;
  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
      background: 'rgba(0,0,0,0.45)', zIndex: 1000,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <div style={{
        background: '#fff', borderRadius: 18, padding: 28, minWidth: 340, maxWidth: 400,
        boxShadow: '0 8px 32px rgba(0,0,0,0.18)', position: 'relative',
      }}>
        <button onClick={onClose} style={{ position: 'absolute', top: 10, right: 12, background: 'transparent', border: 'none', fontSize: 22, cursor: 'pointer' }} aria-label="Close">×</button>
        <Image src={card.image} alt={card.alt || card.name} width={400} height={240} style={{ width: '100%', borderRadius: 12, marginBottom: 18 }} />
        <h2 style={{ fontSize: 26, marginBottom: 8 }}>{card.name}</h2>
        <p style={{ fontSize: 16, color: '#444', marginBottom: 18 }}>{card.description}</p>
        {/* Agent config editing UI (scaffold) */}
        <form
          data-testid="agent-details-form"
          style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 12 }}
          onSubmit={e => {
            e.preventDefault();
            if (!editName.trim() || !editDesc.trim()) {
              setValidationError('Name and description are required.');
              return;
            }
            if (!editRole) {
              setValidationError('Role is required.');
              return;
            }
            setValidationError('');
            // Pass edited card config to onDeploy, including role and config (extensible)
            onDeploy({
              ...card,
              name: editName.trim(),
              description: editDesc.trim(),
              role: editRole,
              config: editConfig && Object.keys(editConfig).length > 0 ? editConfig : {},
            });
          }}
        >
          <label htmlFor="agent-name" style={{ fontWeight: 600 }}>Name*</label>
          <input
            id="agent-name"
            type="text"
            value={editName}
            onChange={e => setEditName(e.target.value)}
            required
            aria-required="true"
            style={{ padding: 8, borderRadius: 6, border: '1px solid #bbb', fontSize: 16 }}
            maxLength={60}
            autoFocus
          />
          <label htmlFor="agent-desc" style={{ fontWeight: 600 }}>Description*</label>
          <textarea
            id="agent-desc"
            value={editDesc}
            onChange={e => setEditDesc(e.target.value)}
            required
            aria-required="true"
            style={{ padding: 8, borderRadius: 6, border: '1px solid #bbb', fontSize: 15, resize: 'vertical' }}
            maxLength={250}
            rows={3}
          />
          <label htmlFor="agent-role" style={{ fontWeight: 600 }}>Role*</label>
          <select
            id="agent-role"
            value={editRole}
            onChange={e => setEditRole(e.target.value)}
            required
            aria-required="true"
            style={{ padding: 8, borderRadius: 6, border: '1px solid #bbb', fontSize: 16 }}
          >
            <option value="" disabled>Select a role</option>
            <option value="Planner">Planner</option>
            <option value="Researcher">Researcher</option>
            <option value="Coder">Coder</option>
            <option value="Reviewer">Reviewer</option>
          </select>
          {/* Extensible agent config fields scaffold */}
          <fieldset style={{ border: '1px solid #eee', borderRadius: 8, padding: 10, marginBottom: 10 }} data-testid="agent-config-fields">
            <legend style={{ fontWeight: 600, fontSize: 15 }}>Advanced Config (Extensible)</legend>
            {/* Example: Tool selection (future extension) */}
            <label htmlFor="agent-tool">Tool</label>
            <select
              id="agent-tool"
              aria-label="Tool"
              value={editConfig.tool || ''}
              onChange={e => setEditConfig(cfg => ({ ...cfg, tool: e.target.value }))}
              style={{ padding: 6, borderRadius: 6, border: '1px solid #bbb', fontSize: 15 }}
            >
              <option value="">Select tool (future)</option>
              <option value="search">Search</option>
              <option value="summarize">Summarize</option>
            </select>
            <span style={{ color: '#888', fontSize: 13 }}>More config fields coming soon...</span>
          </fieldset>
          {validationError && (
            <div style={{ color: 'red', fontWeight: 600, marginBottom: 4 }}>{validationError}</div>
          )}
          <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
            <button
              type="submit"
              style={{ flex: 1, padding: '12px 0', borderRadius: 8, background: '#2563eb', color: '#fff', fontWeight: 700, fontSize: 18, border: 'none', cursor: 'pointer' }}
            >
              Deploy Agent
            </button>
            <button
              type="button"
              onClick={onClose}
              style={{ flex: 1, padding: '12px 0', borderRadius: 8, background: '#eee', color: '#333', fontWeight: 600, fontSize: 18, border: 'none', cursor: 'pointer' }}
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
