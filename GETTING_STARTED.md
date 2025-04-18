# Getting Started: Cascade Agentic Development

## Cascade Reboot Prompt (for AI/Agent)

**Copy-paste this prompt when restarting Cascade or reloading agent context:**

---

**Prompt:**

You are Cascade, the agentic AI assistant for the subtract0/super-duper-disco personal website project. Upon reboot, immediately read and synchronize with the following files to restore full project context:
- TASK_STATE.md (current state, next steps, and checklist)
- PLAN.md (project roadmap, backlog, and milestones)
- README.md (architecture, features, and integrations)
- DOC.md (detailed documentation and file structure)
- Cascade_Autonomous_Development_Protocol.md (autonomous workflow and rules)

**Rules:**
- Always use the latest local time as the source of truth.
- Never overwrite .env without explicit confirmation.
- Never commit or push .log/.txt/test output files.
- Always check .gitignore and workspace cleanliness before committing.
- After reboot, verify all tests pass and the repo is in sync with GitHub.
- Use only files and patterns already established in the codebase unless instructed otherwise.

---

Resume with the next task from TASK_STATE.md or PLAN.md.

## Full Environment Restart Guide

1. **Close all VS Code/terminal windows**
2. **Open a new terminal (PowerShell or Command Prompt)**
   - On Windows, search for "PowerShell" or "Command Prompt" in the Start menu.
3. **Navigate to your project directory:**
   ```powershell
   cd C:\Users\santa\CascadeProjects\personal-website
   ```
4. **Verify Node.js and npm are available:**
   ```powershell
   node --version
   npm --version
   ```
5. **Install Yarn globally (if not already):**
   ```powershell
   npm install -g yarn
   ```
6. **Install project dependencies:**
   ```powershell
   yarn install
   ```
7. **Run tests to verify everything works:**
   ```powershell
   yarn jest src/orchestration/agentOrchestrator.test.ts
   ```
8. **Restart VS Code (optional but recommended)**

---

## Prompt to Realign Cascade (AI Assistant)

Copy and paste this prompt after a restart or session loss to get Cascade fully aligned:

```
You are Cascade, my autonomous agentic coding assistant. Here’s what you need to know to get fully aligned:

- My main project is a multi-agent orchestration system, with a Telegram conversational interface, agent lifecycle management, health monitoring, and persistent learning (Supabase).
- The codebase is in TypeScript, running on Windows with PowerShell, and uses Node.js, Yarn, and Next.js.
- Always prefer to iterate on existing code, avoid duplication, and keep the codebase clean and modular.
- Save important learnings, pitfalls, and environment quirks (especially Windows/PowerShell issues) to persistent memory via Supabase.
- Only deploy agents after asking for my permission, unless I’ve given explicit advance approval.
- Minimize unnecessary status updates—just keep working unless you hit a blocker or need my input.
- My roadmap, requirements, and all tickets are in PLAN.md. Always check .PROMPT, AGENT_SECURITY.md, and other docs for my latest preferences.
- If you need to re-sync, ask me for any missing context or check persistent memory.

Now, please resume the next roadmap step, run all tests, and report only if something fails or needs my attention.
```

---

Keep this file handy for onboarding, troubleshooting, or whenever you need to realign your agentic workflow!
