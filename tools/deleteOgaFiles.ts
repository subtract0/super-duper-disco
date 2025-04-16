// tools/deleteOgaFiles.ts
// Skript zum Löschen aller .oga-Dateien aus dem Supabase Storage-Bucket "voice".
// ACHTUNG: Service-Role-Key erforderlich!

import { createClient } from '@supabase/supabase-js';

// Trage hier deine Supabase-URL und den Service-Role-Key ein:
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

async function deleteOgaFiles() {
  const { data, error } = await supabase.storage.from('voice').list('', { limit: 1000 });
  if (error) {
    console.error('Fehler beim Listen:', error);
    return;
  }

  const ogaFiles = (data || []).filter(file => file.name.endsWith('.oga')).map(file => file.name);

  if (ogaFiles.length > 0) {
    const { error: delError } = await supabase.storage.from('voice').remove(ogaFiles);
    if (delError) {
      console.error('Fehler beim Löschen:', delError);
    } else {
      console.log('Alle OGA-Dateien gelöscht!');
    }
  } else {
    console.log('Keine OGA-Dateien gefunden.');
  }
}

// Direkt ausführen
if (require.main === module) {
  deleteOgaFiles();
}
