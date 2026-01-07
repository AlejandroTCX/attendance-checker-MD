import { createClient } from '@supabase/supabase-js';

export function supabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  console.log('SUPABASE_URL exists?', !!url);
  console.log('SERVICE_ROLE exists?', !!key);

  if (!url || !key) throw new Error('Missing Supabase env vars');

  return createClient(url, key, { auth: { persistSession: false } });
}
