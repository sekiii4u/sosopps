# Workspace guidance

- This project is a React + TypeScript single-page application built with Vite.
- Keep posting metrics derived from `Store.posts`; do not add manually maintained daily counters.
- Use Supabase for shared persistence when `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are configured; keep localStorage only as the unconfigured preview fallback.
- Keep account credentials out of the UI and localStorage.
- All deletion must remain gated by the `protected-delete` Edge Function; never place its password or the Supabase service-role key in browser code.
- The current Supabase schema intentionally exposes anonymous read/insert/update. Warn before widening that access or storing sensitive client data.
- Run `npm run build` after application changes to verify TypeScript and production bundling.
