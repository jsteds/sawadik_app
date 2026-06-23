const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({path: '.env.local'});
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
supabase.from('stores').insert({name: 'Test Store', code: 'TEST1234'}).select('id').single()
  .then(res => console.log('Result:', res))
  .catch(err => console.error('Error:', err));
