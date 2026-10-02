# Social Ops Control Center

Social Ops is a Supabase-backed operations app with separate **Admin** and **Client** sign-ins. Admins manage workspace records and issue client access. Clients can see and update posting records for their own client only. Post metrics are calculated from the posting log.

## Supabase setup

1. Project URL and publishable key are in the ignored `.env.local` for this workspace. For another environment, copy `.env.example` to `.env.local` and use the URL plus anon/publishable key from Supabase → Project Settings → API. These two `VITE_` values are browser-visible. **Never put the Supabase service-role key in a `VITE_` variable or frontend file.**
2. In the Supabase SQL Editor, run [`supabase/schema.sql`](supabase/schema.sql). This creates the relational tables, demo platform records, profiles, role-aware RLS, and a private failed-password counter. It does not insert sample clients or posts.
3. In Supabase Authentication settings, disable public sign-ups. Admin and client identities are created only by the guarded server functions; existing users created from Auth settings will not have a workspace role profile.
4. Install/use the Supabase CLI and link the same project. Set two distinct, long, unique server-side secrets, then deploy all three Edge Functions:

   ```sh
   supabase login
   supabase link --project-ref YOUR_PROJECT_REF
   supabase secrets set BOOTSTRAP_ADMIN_SECRET='PASTE_LONG_RANDOM_SETUP_SECRET' DELETE_PASSWORD='PASTE_A_DIFFERENT_LONG_RANDOM_DELETE_SECRET'
   supabase functions deploy bootstrap-admin
   supabase functions deploy provision-client
   supabase functions deploy protected-delete
   ```

   Replace both placeholder values locally with separately generated random secrets and save them in your password manager—the bootstrap secret is needed only for initial admin setup. Supabase provides the service-role key to Edge Functions. Do not copy it into `.env.local`, the browser, or a client login.

5. Restart the web app with `npm run dev`. Select **Admin → First time here? Set up the admin**, enter the bootstrap secret, and choose the initial admin username and a password of at least 12 characters. The setup endpoint permanently closes after the first admin profile is created.
6. Sign in as Admin, open **Clients**, then **Create client login**. The app generates a client name, username, and password; you can edit the name/username before creating access. Copy the credentials from the one-time result screen and securely give them to that client. Admins can add accounts for the client separately. The client can then sign in and create/update posts for their assigned client only.

The browser app creates synthetic, non-deliverable Supabase Auth email identifiers from each username, so no email or public signup flow is needed. Do not create these users manually in Supabase Auth; create the first admin with the in-app bootstrap and create client users from the Admin → Clients workflow.

## Permissions and security

- **Admin:** can view and create/update all clients, accounts, platforms, devices, and posts. Deletes require an authenticated admin session plus the separate delete passphrase.
- **Client:** can read the client record, accounts, platforms, devices and posting history scoped to their own client. They can create and edit posts only for accounts belonging to that client. They cannot access admin directories, provision users, or delete records.
- **Unauthenticated visitors:** cannot read or modify the operational tables. Row-level security is the enforcement layer; hiding screens in the UI is not considered sufficient authorization.
- Auth passwords are handled by Supabase Auth and are never saved in app localStorage. Generated client passwords are displayed only once by the provisioning screen.

The `DELETE_PASSWORD` is checked by the server-only `protected-delete` Edge Function and failed attempts are throttled. The service-role key and bootstrap secret also remain server-side. Use HTTPS and a strong unique password for every admin/client account. Rotate these secrets if they are exposed.

## Run and validate

- `npm install`
- `npm run dev`
- `npm run lint`
- `npm run build`
- `npm run preview`

There is no unauthenticated local-data fallback. If Supabase schema/functions are not configured, the login screen reports the setup needed rather than exposing demo data.
