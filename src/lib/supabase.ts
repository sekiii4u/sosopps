import { createClient } from '@supabase/supabase-js';
import type { Account, Client, Device, Platform, Post, Store } from '../types';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);
export const supabase = supabaseConfigured ? createClient(supabaseUrl, supabaseAnonKey) : null;

const emptyStore = (): Store => ({
  clients: [],
  platforms: [],
  devices: [],
  accounts: [],
  posts: [],
});
const unwrap = <T>(result: { data: T | null; error: { message: string } | null }) => {
  if (result.error) throw new Error(result.error.message);
  return result.data ?? [];
};

const mapClient = (row: any): Client => ({
  id: row.id,
  name: row.name,
  contact: row.contact ?? '',
  dailyTarget: row.daily_target,
  status: row.status,
  remarks: row.remarks ?? '',
});
const mapPlatform = (row: any): Platform => ({
  id: row.id,
  name: row.name,
  active: row.active,
  color: row.color ?? '#536fe4',
  dailyTarget: row.daily_target ?? 0,
  notes: row.notes ?? '',
});
const mapDevice = (row: any): Device => ({
  id: row.id,
  name: row.name,
  type: row.type,
  assignedTo: row.assigned_to ?? '',
  status: row.status,
  remarks: row.remarks ?? '',
});
const mapAccount = (row: any): Account => ({
  id: row.id,
  clientId: row.client_id,
  platformId: row.platform_id,
  name: row.name,
  deviceId: row.device_id ?? '',
  phone: row.phone ?? '',
  email: row.email ?? '',
  status: row.status,
  dailyTarget: row.daily_target,
  remarks: row.remarks ?? '',
});
const mapPost = (row: any): Post => ({
  id: row.id,
  date: row.post_date,
  time: row.post_time.slice(0, 5),
  clientId: row.client_id,
  accountId: row.account_id,
  platformId: row.platform_id,
  deviceId: row.device_id ?? '',
  contentId: row.content_id ?? '',
  contentType: row.content_type,
  status: row.status,
  operator: row.operator ?? '',
  url: row.url ?? '',
  remark: row.remark ?? '',
});

export async function fetchRemoteStore(): Promise<Store> {
  if (!supabase) throw new Error('Supabase is not configured.');
  const [clientsResult, platformsResult, devicesResult, accountsResult, postsResult] =
    await Promise.all([
      supabase.from('clients').select('*').order('name'),
      supabase.from('platforms').select('*').order('name'),
      supabase.from('devices').select('*').order('name'),
      supabase.from('accounts').select('*').order('name'),
      supabase
        .from('posts')
        .select('*')
        .order('post_date', { ascending: false })
        .order('post_time', { ascending: false }),
    ]);
  return {
    clients: unwrap(clientsResult).map(mapClient),
    platforms: unwrap(platformsResult).map(mapPlatform),
    devices: unwrap(devicesResult).map(mapDevice),
    accounts: unwrap(accountsResult).map(mapAccount),
    posts: unwrap(postsResult).map(mapPost),
  };
}

export async function saveRemoteStore(store: Store): Promise<void> {
  if (!supabase) return;
  const upsert = async (table: string, rows: unknown[]) => {
    if (rows.length === 0) return;
    const { error } = await supabase.from(table).upsert(rows);
    if (error) throw new Error(error.message);
  };
  await Promise.all([
    upsert(
      'clients',
      store.clients.map((row) => ({
        id: row.id,
        name: row.name,
        contact: row.contact || null,
        daily_target: row.dailyTarget,
        status: row.status,
        remarks: row.remarks || null,
      }))
    ),
    upsert(
      'platforms',
      store.platforms.map((row) => ({
        id: row.id,
        name: row.name,
        active: row.active,
        color: row.color,
        daily_target: row.dailyTarget,
        notes: row.notes || null,
      }))
    ),
    upsert(
      'devices',
      store.devices.map((row) => ({
        id: row.id,
        name: row.name,
        type: row.type,
        assigned_to: row.assignedTo || null,
        status: row.status,
        remarks: row.remarks || null,
      }))
    ),
  ]);
  await upsert(
    'accounts',
    store.accounts.map((row) => ({
      id: row.id,
      client_id: row.clientId,
      platform_id: row.platformId,
      name: row.name,
      device_id: row.deviceId || null,
      phone: row.phone || null,
      email: row.email || null,
      status: row.status,
      daily_target: row.dailyTarget,
      remarks: row.remarks || null,
    }))
  );
  await upsert(
    'posts',
    store.posts.map((row) => ({
      id: row.id,
      post_date: row.date,
      post_time: row.time,
      client_id: row.clientId,
      account_id: row.accountId,
      platform_id: row.platformId,
      device_id: row.deviceId || null,
      content_id: row.contentId || null,
      content_type: row.contentType,
      status: row.status,
      operator: row.operator || null,
      url: row.url || null,
      remark: row.remark || null,
    }))
  );
}

export async function saveRemotePost(post: Post): Promise<void> {
  if (!supabase) return;
  const { error } = await supabase.from('posts').upsert({
    id: post.id,
    post_date: post.date,
    post_time: post.time,
    client_id: post.clientId,
    account_id: post.accountId,
    platform_id: post.platformId,
    device_id: post.deviceId || null,
    content_id: post.contentId || null,
    content_type: post.contentType,
    status: post.status,
    operator: post.operator || null,
    url: post.url || null,
    remark: post.remark || null,
  });
  if (error) throw new Error(error.message);
}

export async function saveRemoteRecord(
  type: 'clients' | 'accounts' | 'platforms' | 'devices',
  value: any
): Promise<void> {
  if (!supabase) return;
  const payload =
    type === 'clients'
      ? {
          id: value.id,
          name: value.name,
          contact: value.contact || null,
          daily_target: value.dailyTarget,
          status: value.status,
          remarks: value.remarks || null,
        }
      : type === 'platforms'
        ? {
            id: value.id,
            name: value.name,
            active: value.active,
            color: value.color,
            daily_target: value.dailyTarget,
            notes: value.notes || null,
          }
        : type === 'devices'
          ? {
              id: value.id,
              name: value.name,
              type: value.type,
              assigned_to: value.assignedTo || null,
              status: value.status,
              remarks: value.remarks || null,
            }
          : {
              id: value.id,
              client_id: value.clientId,
              platform_id: value.platformId,
              name: value.name,
              device_id: value.deviceId || null,
              phone: value.phone || null,
              email: value.email || null,
              status: value.status,
              daily_target: value.dailyTarget,
              remarks: value.remarks || null,
            };
  const client = supabase as any;
  const { error } = await client.from(type).upsert(payload);
  if (error) throw new Error(error.message);
}

export async function requestProtectedDelete(
  table: string,
  id: string,
  password: string
): Promise<void> {
  if (!supabase) throw new Error('Connect Supabase before enabling protected deletes.');
  const { data, error } = await supabase.functions.invoke('protected-delete', {
    body: { table, id, password },
  });
  if (error) {
    const context = error.context;
    if (context instanceof Response) {
      try {
        const responseBody = await context.clone().json();
        if (typeof responseBody.error === 'string') throw new Error(responseBody.error);
      } catch (responseError) {
        if (
          responseError instanceof Error &&
          responseError.message !== 'Unexpected end of JSON input'
        )
          throw responseError;
      }
    }
    throw new Error(error.message);
  }
  if (data?.error) throw new Error(data.error);
}

export const emptyRemoteStore = emptyStore;
