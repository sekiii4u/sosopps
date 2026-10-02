# Workspace guidance

- This project is a React + TypeScript single-page application built with Vite.
- Keep posting metrics derived from `Store.posts`; do not add manually maintained daily counters.
- Use Supabase for all application data and auth; do not add an unauthenticated localStorage fallback.
- Enforce admin/client access in Supabase RLS and Edge Functions, not only in React navigation or components.
- Client accounts may only read their own client data and create/update posts tied to their own accounts.
- Keep account credentials out of the UI and localStorage.
- All deletion must remain gated by an authenticated admin session and the `protected-delete` Edge Function; never place its password, bootstrap secret, or Supabase service-role key in browser code.
- Bootstrap/admin and client Auth users are created only by their guarded Edge Functions; there is no public registration flow.
- Run `npm run build` after application changes to verify TypeScript and production bundling.
