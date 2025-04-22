import { Intent } from './types';

export function parse(text: string): Intent | null {
  const t = text.trim();

  // /msg <agent> <message>
  const mMsg = t.match(/^\/?msg\s+(\S+)\s+([\s\S]+)/i);
  if (mMsg) return { kind: 'msg', agentId: mMsg[1], message: mMsg[2] };

  const tLower = t.toLowerCase();
  if (/^\/?status\b/.test(tLower)) return { kind: 'status' };
  if (/^\/?help\b/.test(tLower)) return { kind: 'help' };

  const mStop = tLower.match(/^\/?stop(?:\s+(?:my|the))?\s*agent?\s*(\S+)?/);
  if (mStop) return { kind: 'stop', agentId: mStop[1] };

  const mRestart = tLower.match(/^\/?restart\s+(\S+)/);
  if (mRestart) return { kind: 'restart', agentId: mRestart[1] };

  const mLaunch = tLower.match(/^\/?launch\s+(\S+)(?:\s+as\s+(\S+))?/);
  if (mLaunch) return { kind: 'launch', agentId: mLaunch[1], launchType: mLaunch[2] };

  const mDelete = tLower.match(/^\/?delete\s+(\S+)/);
  if (mDelete) return { kind: 'delete', agentId: mDelete[1] };

  const mCfg = tLower.match(/^\/?update\s+config\s+for\s+agent\s+(\S+)\s+to\s+([\s\S]+)/);
  if (mCfg) {
    try {
      return { kind: 'update-config', agentId: mCfg[1], config: JSON.parse(mCfg[2]) };
    } catch {
      return { kind: 'update-config', agentId: mCfg[1] };
    }
  }
  return null;
}
