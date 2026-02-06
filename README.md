# Welcome to your Lovable project

## Project info

**URL**: https://lovable.dev/projects/REPLACE_WITH_PROJECT_ID

## How can I edit this code?

There are several ways of editing your application.

**Use Lovable**

Simply visit the [Lovable Project](https://lovable.dev/projects/REPLACE_WITH_PROJECT_ID) and start prompting.

Changes made via Lovable will be committed automatically to this repo.

**Use your preferred IDE**

If you want to work locally using your own IDE, you can clone this repo and push changes. Pushed changes will also be reflected in Lovable.

The only requirement is having Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

Follow these steps:

```sh
# Step 1: Clone the repository using the project's Git URL.
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory.
cd <YOUR_PROJECT_NAME>

# Step 3: Install the necessary dependencies.
npm i

# Step 4: Start the development server with auto-reloading and an instant preview.
npm run dev
```

**Edit a file directly in GitHub**

- Navigate to the desired file(s).
- Click the "Edit" button (pencil icon) at the top right of the file view.
- Make your changes and commit the changes.

**Use GitHub Codespaces**

- Navigate to the main page of your repository.
- Click on the "Code" button (green button) near the top right.
- Select the "Codespaces" tab.
- Click on "New codespace" to launch a new Codespace environment.
- Edit files directly within the Codespace and commit and push your changes once you're done.

## What technologies are used for this project?

This project is built with:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS

## How can I deploy this project?

Simply open [Lovable](https://lovable.dev/projects/REPLACE_WITH_PROJECT_ID) and click on Share -> Publish.

## InkCloud backend environment variables

The inkCloud backend requires a few additional environment variables so it can handle Discord OAuth, Supabase sessions, and provisioning:

| Environment variable | Purpose |
| --- | --- |
| `DISCORD_CLIENT_ID` | OAuth client ID for your Discord application. |
| `DISCORD_CLIENT_SECRET` | OAuth client secret for your Discord application. |
| `DISCORD_REDIRECT_URI` | Callback URL (e.g. `https://inkcloud.app/api/auth/discord/callback` or local `/api/auth/discord/callback`). |
| `DISCORD_BOT_TOKEN` | Token for the official inkCloud bot that will be provisioned into customer guilds. |
| `INKCLOUD_GUILD_ID` | Guild ID of the official inkCloud support server (used for auto-join). |
| `INKCLOUD_INVITE_FALLBACK_URL` | Fallback invite (or landing) URL used when auto-joining the inkCloud server fails. |
| `PROVISIONER_URL` | URL where the inK provisioner API is reachable (default `http://localhost:8000`). |
| `PROVISIONER_API_KEY` | Optional API key that must be forwarded via `X-API-Key` when hitting the provisioner. |
| `SUPABASE_URL` | Supabase project URL for storing inkCloud metadata. |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key (used server-side to read/write tenants, guilds, users, sessions). |
| `SESSION_SECRET` | Random string used to HMAC session tokens (e.g., `export SESSION_SECRET=$(openssl rand -base64 32)`). |
| `TOKEN_ENCRYPTION_KEY` | 32-byte key used to encrypt Discord OAuth tokens (hex or base64). |
| `BOT_RUNTIME_SHARED_KEY` | Shared key used by the runtime to report guild names back to the site. |
| `TENANT_GUILD_ID` | Optional guild ID to which a runtime should be locked. Only events/commands from this guild will be processed when set. |

### Security tip

- Generate `SESSION_SECRET` with `openssl rand -base64 32`.
- Generate `TOKEN_ENCRYPTION_KEY` with `openssl rand -hex 32` (or base64) and store it securely so the server can decrypt tokens when needed.

## Can I connect a custom domain to my Lovable project?

Yes, you can!

To connect a domain, navigate to Project > Settings > Domains and click Connect Domain.

Read more here: [Setting up a custom domain](https://docs.lovable.dev/features/custom-domain#custom-domain)
# inkfront
# inkfront
