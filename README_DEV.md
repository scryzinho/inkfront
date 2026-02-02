# inkCloud Developer Notes

## Dashboard backend wiring

- `inkcloud/server/index.js` already exposes the required APIs (`/api/me`, `/api/bot/status`, `/api/discord/guild/overview`, `/api/dashboard/overview`) that aggregate Supabase, ShardCloud and Discord data. Avoid changing visual components in `src/pages/dashboard/Overview.tsx`; it already fetches `fetchDashboardOverview()` and renders the bot/guild cards with the requested fields.
- The server relies on these environment variables (set them before running `npm run dev` or the backend):
  - `SUPABASE_URL`
  - `SUPABASE_SERVICE_ROLE_KEY`
  - `SHARDCLOUD_API_URL`
  - `SHARDCLOUD_API_KEY`
  - `DISCORD_BOT_TOKEN`
  - `PROVISIONER_URL` / `PROVISIONER_API_KEY`

## Supabase requirements

The dashboard backend assumes the following Supabase tables exist. If you deploy a clean database you can ensure the missing ones are created by running the SQL below. It is written with `IF NOT EXISTS` to avoid re-applying columns that already exist.

```sql
-- Criar cache de guildas (usado por /api/discord/guild/overview)
create table if not exists public.guild_cache (
  guild_id text primary key,
  name text,
  icon text,
  members integer,
  channels integer,
  roles integer,
  boosts integer,
  permissions jsonb default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create index if not exists idx_guild_cache_name on public.guild_cache(name);
create index if not exists idx_guild_cache_members on public.guild_cache(members);
```

Filling `guild_cache` can happen via a scheduled job (e.g., using Supabase Edge Functions or a cron script) that mirrors the data you already fetch from Discord and ShardCloud. The server gracefully falls back to the raw Discord API if the cache is empty, so the table is optional but recommended for performance.

## Running locally

1. Set the env vars above as well as `SESSION_SECRET`, `TOKEN_ENCRYPTION_KEY`, `BOT_RUNTIME_SHARED_KEY`, etc.
2. Start the backend (`node server/index.js`) and the frontend (`npm run dev`). The dashboard hits `http://localhost:9000/api/dashboard/overview` through the server, so the backend must be running with the same host/port values defined in `.env`.
3. Login via Discord to seed the Supabase tables (`users`, `tenants`, `bot_instances`, `auth_sessions`, `guilds`, etc.). Provisioned bots will generate the necessary `shard_app_id` required for the ShardCloud stats endpoints.

## Known gaps / next actions

- Make sure your provisioning workflow (runtime/provisioner/bot master) continues to record `shard_app_id` + `last_heartbeat` into `bot_instances`; the dashboard relies on that data to decide `online`, `uptime`, `token_valid` and to fetch ShardCloud stats.
- If you intend to show the Discord avatar/username in the dashboard header, extend the `bot` object returned by `/api/dashboard/overview` and update `DashboardOverview` accordingly without touching the layout.
