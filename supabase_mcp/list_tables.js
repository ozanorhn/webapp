import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://pw.eom.de';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyAgCiAgICAicm9sZSI6ICJzZXJ2aWNlX3JvbGUiLAogICAgImlzcyI6ICJzdXBhYmFzZS1kZW1vIiwKICAgICJpYXQiOiAxNjQxNzY5MjAwLAogICAgImV4cCI6IDE3OTk1MzU2MDAKfQ.DaYlNEoUrrEn2Ig7tqibS-PHK5vgusbcbo7X36XVt4Q';

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

async function listTables() {
  try {
    console.log('Verbinde zu:', SUPABASE_URL);
    console.log('-----------------------------------\n');

    // Abfrage aller Tabellen aus public schema
    const { data, error } = await supabase
      .from('information_schema.tables')
      .select('table_name, table_schema')
      .eq('table_schema', 'public');

    if (error) {
      console.error('Fehler:', error.message || error);
      return;
    }

    console.log('✅ Alle Tabellen in der Datenbank:\n');

    if (data && data.length > 0) {
      data.forEach((table, index) => {
        console.log(`${index + 1}. ${table.table_name}`);
      });
      console.log(`\n📊 Insgesamt: ${data.length} Tabellen`);
    } else {
      console.log('❌ Keine Tabellen gefunden.');
    }
  } catch (err) {
    console.error('❌ Fehler:', err.message);
  }
}

listTables();
