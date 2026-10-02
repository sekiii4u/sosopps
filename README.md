# Social Ops Control Center

A full-stack-ready social media operations dashboard. Clients, platforms, devices, accounts, and post activity are stored in Supabase when configured; dashboard metrics are calculated from post records. Without Supabase credentials the app runs as a local browser preview with sample data.

## Connect a Supabase project

1. Create a Supabase project.
2. Open the SQL Editor in that project and run [`supabase/schema.sql`](supabase/schema.sql). It creates the five operational tables, relationships, indexes, and row-level security policies.
3. Copy `.env.example` to `.env.local`. Set `VITE_SUPABASE_URL` to the project URL and `VITE_SUPABASE_ANON_KEY` to the project's anon/publishable key. These browser values are public by design; never use the service-role key in a `VITE_` variable.
4. In the Supabase CLI, authenticate and link this project, then set the delete password as a server-side secret and deploy the function:

   ```sh
   supabase login
   supabase link --project-ref YOUR_PROJECT_REF
   supabase secrets set DELETE_PASSWORD='use-a-long-unique-passphrase'
   supabase functions deploy protected-delete
   ```

   Supabase provides `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` to Edge Functions. Keep both server-side. Do not commit `.env.local` or share the delete passphrase.

5. Restart the Vite server with `npm run dev`. The header should show “Supabase connected”. Records created in the app are then shared through that project.

## Access model and security

There are no sign-in screens. The schema intentionally permits unauthenticated visitors with the public Supabase key to read, create, and update the operational rows. **That makes the database publicly accessible—not limited to your team.** Anyone who obtains the app URL and public key can make those operations, so do not put confidential client contacts, account details, or private business data here unless you are comfortable with that exposure. For a team-only production deployment, add Supabase Auth and tighten the RLS policies before using real data.

Direct deletion is denied to browser clients by both SQL grants and RLS. Deletes go through the `protected-delete` Edge Function, which checks a password kept only in Supabase server secrets, throttles repeated failures, and uses the server-only service-role key. The password is entered only for the delete request and is not saved in browser storage. Use a long, unique passphrase. This protects the delete action; it does not make public read/create/update access private.

## Run locally

- `npm install`
- `npm run dev`
- `npm run lint`
- `npm run build`

`npm run build` creates the production assets; `npm run preview` serves them locally. Without `.env.local`, the sample preview uses browser localStorage. Shared Supabase mode reads and writes the configured database.
