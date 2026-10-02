import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const allowedTables = new Set(['clients', 'platforms', 'devices', 'accounts', 'posts']);
const json = (body: Record<string, unknown>, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
const sha256 = async (value: string) =>
  new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value)));
const matchesSecret = async (attempt: string, expected: string) => {
  const [left, right] = await Promise.all([sha256(attempt), sha256(expected)]);
  let difference = 0;
  for (let index = 0; index < left.length; index++) difference |= left[index] ^ right[index];
  return difference === 0;
};

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (request.method !== 'POST') return json({ error: 'Method not allowed.' }, 405);

  const expectedPassword = Deno.env.get('DELETE_PASSWORD');
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!expectedPassword || !supabaseUrl || !serviceRoleKey) {
    return json({ error: 'Protected delete is not configured on the server.' }, 503);
  }

  let payload: { table?: unknown; id?: unknown; password?: unknown };
  try {
    payload = await request.json();
  } catch {
    return json({ error: 'Invalid request body.' }, 400);
  }

  const table = typeof payload.table === 'string' ? payload.table : '';
  const id = typeof payload.id === 'string' ? payload.id : '';
  const password = typeof payload.password === 'string' ? payload.password : '';
  if (!allowedTables.has(table) || !id || id.length > 200)
    return json({ error: 'Invalid delete target.' }, 400);
  if (!password || password !== expectedPassword)
    return json({ error: 'Incorrect delete password.' }, 401);

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const clientIp = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
  const { data: blocked, error: rateLimitError } = await admin.rpc('delete_ip_is_blocked', {
    p_client_ip: clientIp,
  });
  if (rateLimitError) return json({ error: 'Delete security check is unavailable.' }, 503);
  if (blocked) return json({ error: 'Too many failed attempts. Try again in 15 minutes.' }, 429);
  if (!(await matchesSecret(password, expectedPassword))) {
    await admin.rpc('record_failed_delete', { p_client_ip: clientIp });
    return json({ error: 'Incorrect delete password.' }, 401);
  }
  const { error } = await admin.from(table).delete().eq('id', id);
  if (error) return json({ error: error.message }, 400);
  await admin.rpc('clear_delete_attempts', { p_client_ip: clientIp });
  return json({ ok: true });
});
