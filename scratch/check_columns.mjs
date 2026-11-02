import { createClient } from '@supabase/supabase-js';

const supabase = createClient('https://jvqbtwkqdrardyabwsgy.supabase.co', 'sb_publishable_S0y0r441ua7NSzbnpl-bRQ_gV8liNBa');

async function listColumns() {
  const { data, error } = await supabase
    .from('databasesantri')
    .select('*')
    .limit(1);

  if (error) {
    console.error(error);
    return;
  }

  if (data && data.length > 0) {
    console.log(JSON.stringify(Object.keys(data[0])));
  } else {
    console.log("No data found to infer columns");
  }
}

listColumns();
