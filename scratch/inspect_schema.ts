
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://azufpxcpbkcrqapfislu.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF6dWZweGNwYmtjcnFhcGZpc2x1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY4OTczMjUsImV4cCI6MjA5MjQ3MzMyNX0.VY0KpiuayrbXcYhVmahRiphye-kOGoMDqWTePByxnqHM';

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  console.log('Testing column existence in duels table...');
  const testColumns = ['preview_a', 'image_a_url', 'photo_a', 'score_a', 'scores', 'reasons', 'reasons_for_win', 'tips', 'weaknesses_of_loser'];
  
  for (const col of testColumns) {
    const { error } = await supabase.from('duels').select(col).limit(1);
    if (!error) {
      console.log(`✅ Column '${col}' EXISTS`);
    } else {
      console.log(`❌ Column '${col}' does NOT exist (${error.message})`);
    }
  }
}

main();
