import { Intent } from './types';

export function parse(text: string): Intent | null {
  const t = text.trim().toLowerCase();

  if (/^\/?status\b/.test(t)) return { kind: 'status' };
  if (/^\/?help\b/.test(t)) return { kind: 'help' };

  const mStop = t.match(/^\/?stop(?:\s+(?:my|the))?\s*agent?\s*(\S+)?/);
  if (mStop) return { kind: 'stop', agentId: mStop[1] };

  const mRestart = t.match(/^\/?restart\s+(\S+)/);
  if (mRestart) return { kind: 'restart', agentId: mRestart[1] };

  const mLaunch = t.match(/^\/?launch\s+(\S+)(?:\s+as\s+(\S+))?/);
  if (mLaunch) return { kind: 'launch', agentId: mLaunch[1], launchType: mLaunch[2] };

  const mDelete = t.match(/^\/?delete\s+(\S+)/);
  if (mDelete) return { kind: 'delete', agentId: mDelete[1] };

  const mCfg = t.match(/^\/?update\s+config\s+for\s+agent\s+(\S+)\s+to\s+([\s\S]+)/);
  if (mCfg) {
    try {
      return { kind: 'update-config', agentId: mCfg[1], config: JSON.parse(mCfg[2]) };
    } catch {
      return { kind: 'update-config', agentId: mCfg[1] };
    }
  }
  return null;
}
