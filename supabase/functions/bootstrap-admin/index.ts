import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const respond = (body: Record<string, unknown>, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
const digest = async (value: string) =>
  new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value)));
const equalSecret = async (leftValue: string, rightValue: string) => {
  const [left, right] = await Promise.all([digest(leftValue), digest(rightValue)]);
  let mismatch = 0;
  for (let index = 0; index < left.length; index++) mismatch |= left[index] ^ right[index];
  return mismatch === 0;
};
const emailFor = (username: string) => `admin.${username.toLowerCase()}@socialops.invalid`;

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (request.method !== 'POST') return respond({ error: 'Method not allowed.' }, 405);
  const setupSecret = Deno.env.get('BOOTSTRAP_ADMIN_SECRET');
  const url = Deno.env.get('SUPABASE_URL');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!setupSecret || !url || !serviceKey)
    return respond({ error: 'Admin bootstrap is not configured on the server.' }, 503);

  let body: { setupSecret?: unknown; username?: unknown; password?: unknown };
  try {
    body = await request.json();
  } catch {
    return respond({ error: 'Invalid request.' }, 400);
  }
  const setupAttempt = typeof body.setupSecret === 'string' ? body.setupSecret : '';
  const username = typeof body.username === 'string' ? body.username.trim().toLowerCase() : '';
  const password = typeof body.password === 'string' ? body.password : '';
  if (!(await equalSecret(setupAttempt, setupSecret)))
    return respond({ error: 'Invalid setup secret.' }, 401);
  if (!/^[a-z0-9][a-z0-9._-]{2,31}$/.test(username))
    return respond(
      {
        error:
          'Username must be 3–32 characters using letters, numbers, dots, underscores, or hyphens.',
      },
      400
    );
  if (password.length < 12)
    return respond({ error: 'Use an admin password with at least 12 characters.' }, 400);

  const admin = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { count, error: countError } = await admin
    .from('profiles')
    .select('id', { count: 'exact', head: true })
    .eq('role', 'admin');
  if (countError)
    return respond({ error: `Could not verify admin setup: ${countError.message}` }, 500);
  if ((count ?? 0) > 0)
    return respond(
      { error: 'An admin already exists. Admin bootstrap is permanently closed.' },
      409
    );

  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email: emailFor(username),
    password,
    email_confirm: true,
    user_metadata: { username, role: 'admin' },
  });
  if (createError || !created.user)
    return respond({ error: createError?.message ?? 'Could not create admin.' }, 400);
  const { error: profileError } = await admin
    .from('profiles')
    .insert({ id: created.user.id, username, role: 'admin', client_id: null });
  if (profileError) {
    await admin.auth.admin.deleteUser(created.user.id);
    return respond({ error: `Could not create admin profile: ${profileError.message}` }, 400);
  }
  return respond({ ok: true });
});
