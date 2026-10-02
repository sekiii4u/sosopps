import type { Session } from '@supabase/supabase-js';
import type { Section } from '../types';
import { supabase } from './supabase';

export type UserRole = 'admin' | 'client';
export type AppProfile = { id: string; role: UserRole; username: string; clientId: string | null };

export function usernameToAuthEmail(username: string, role: UserRole) {
  const safeUsername = username
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]/g, '');
  return `${role}.${safeUsername}@socialops.invalid`;
}

export async function getAppProfile(userId: string): Promise<AppProfile> {
  if (!supabase) throw new Error('Supabase is not configured.');
  const { data, error } = await supabase
    .from('profiles')
    .select('id, role, username, client_id')
    .eq('id', userId)
    .single();
  if (error) throw error;
  if (data.role !== 'admin' && data.role !== 'client')
    throw new Error('This account does not have an application role.');
  return { id: data.id, role: data.role, username: data.username, clientId: data.client_id };
}

export async function signInWithUsername(username: string, password: string, role: UserRole) {
  if (!supabase)
    throw new Error('Add your Supabase project URL and publishable key to .env.local first.');
  const { data, error } = await supabase.auth.signInWithPassword({
    email: usernameToAuthEmail(username, role),
    password,
  });
  if (error) throw error;
  const profile = await getAppProfile(data.user.id);
  if (profile.role !== role) {
    await supabase.auth.signOut();
    throw new Error('This username is not registered for the selected access type.');
  }
  return profile;
}

export async function signOut() {
  if (!supabase) return;
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export async function bootstrapAdmin(setupSecret: string, username: string, password: string) {
  if (!supabase) throw new Error('Supabase is not configured.');
  const { data, error } = await supabase.functions.invoke('bootstrap-admin', {
    body: { setupSecret, username, password },
  });
  if (error) throw await functionError(error);
  if (data?.error) throw new Error(data.error);
  const { error: signInError } = await supabase.auth.signInWithPassword({
    email: usernameToAuthEmail(username, 'admin'),
    password,
  });
  if (signInError) throw signInError;
}

export async function provisionClient(
  name: string,
  username: string,
  password: string,
  dailyTarget: number
) {
  if (!supabase) throw new Error('Supabase is not configured.');
  const { data, error } = await supabase.functions.invoke('provision-client', {
    body: { name, username, password, dailyTarget },
  });
  if (error) throw await functionError(error);
  if (data?.error) throw new Error(data.error);
  return data as { clientId: string; username: string; name: string };
}

export async function functionError(error: { message: string; context?: unknown }) {
  const context = error.context;
  if (context instanceof Response) {
    try {
      const payload = await context.clone().json();
      if (typeof payload.error === 'string') return new Error(payload.error);
    } catch {
      /* fall through to the SDK message */
    }
  }
  return new Error(error.message);
}

export type AuthenticatedSession = Session | null;
export function appSection(role: UserRole): Section {
  return role === 'admin' ? 'Dashboard' : 'Posting log';
}
