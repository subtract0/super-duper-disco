import { persistentMemory, PersistentMemoryRecord } from './persistentMemory';

/**
 * Save a learning, pitfall, or environment observation to persistent memory.
 * @param type - 'learning', 'pitfall', 'env', etc.
 * @param content - The detailed content/observation
 * @param tags - Optional tags for searchability
 */
export async function saveLearning(type: string, content: string, tags?: string[]) {
  const record: PersistentMemoryRecord = {
    type,
    content,
    tags,
  };
  await persistentMemory.save(record);
}

/**
 * Example: Save a Windows/PowerShell environment pitfall
 */
export async function saveWindowsPitfall() {
  await saveLearning(
    'pitfall',
    'When running shell commands on Windows, avoid using \'&&\' as a command separator in PowerShell. Use sequential commands or scripts instead.',
    ['windows', 'powershell', 'shell', 'command-separator']
  );
}
