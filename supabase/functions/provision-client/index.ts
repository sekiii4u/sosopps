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
const emailFor = (username: string) => `client.${username.toLowerCase()}@socialops.invalid`;

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (request.method !== 'POST') return respond({ error: 'Method not allowed.' }, 405);
  const url = Deno.env.get('SUPABASE_URL');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
  const authorization = request.headers.get('authorization');
  if (!url || !serviceKey || !authorization)
    return respond({ error: 'Admin authorization is required.' }, 401);

  const admin = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  if (!anonKey) return respond({ error: 'The public Supabase key is not configured.' }, 503);
  const token = authorization.replace(/^Bearer\s+/i, '');
  const { data: caller, error: callerError } = await admin.auth.getUser(token);
  if (callerError || !caller.user)
    return respond({ error: 'Your session is invalid. Please sign in again.' }, 401);
  const { data: callerProfile, error: profileError } = await admin
    .from('profiles')
    .select('role')
    .eq('id', caller.user.id)
    .single();
  if (profileError || callerProfile?.role !== 'admin')
    return respond({ error: 'Only an admin can create client access.' }, 403);

  let body: { name?: unknown; username?: unknown; password?: unknown; dailyTarget?: unknown };
  try {
    body = await request.json();
  } catch {
    return respond({ error: 'Invalid request.' }, 400);
  }
  const name = typeof body.name === 'string' ? body.name.trim() : '';
  const username = typeof body.username === 'string' ? body.username.trim().toLowerCase() : '';
  const password = typeof body.password === 'string' ? body.password : '';
  const dailyTarget = Number(body.dailyTarget);
  if (name.length < 2 || name.length > 100)
    return respond({ error: 'Client display name must be 2–100 characters.' }, 400);
  if (!/^[a-z0-9][a-z0-9._-]{2,31}$/.test(username))
    return respond(
      {
        error:
          'Username must be 3–32 characters using letters, numbers, dots, underscores, or hyphens.',
      },
      400
    );
  if (password.length < 12)
    return respond({ error: 'Generated client passwords must be at least 12 characters.' }, 400);
  if (!Number.isSafeInteger(dailyTarget) || dailyTarget < 0 || dailyTarget > 10000)
    return respond({ error: 'Daily target is invalid.' }, 400);

  const clientId = `CLI-${crypto.randomUUID()}`;
  const { data: authUser, error: authError } = await admin.auth.admin.createUser({
    email: emailFor(username),
    password,
    email_confirm: true,
    user_metadata: { username, role: 'client', client_id: clientId },
  });
  if (authError || !authUser.user)
    return respond({ error: authError?.message ?? 'Could not create client login.' }, 400);

  const { error: clientError } = await admin
    .from('clients')
    .insert({
      id: clientId,
      name,
      contact: null,
      daily_target: dailyTarget,
      status: 'Active',
      remarks: '',
    });
  if (clientError) {
    await admin.auth.admin.deleteUser(authUser.user.id);
    return respond({ error: `Could not create client record: ${clientError.message}` }, 400);
  }
  const { error: insertProfileError } = await admin
    .from('profiles')
    .insert({ id: authUser.user.id, username, role: 'client', client_id: clientId });
  if (insertProfileError) {
    await admin.from('clients').delete().eq('id', clientId);
    await admin.auth.admin.deleteUser(authUser.user.id);
    return respond({ error: `Could not create client access: ${insertProfileError.message}` }, 400);
  }
  return respond({ ok: true, clientId, username, name });
});
