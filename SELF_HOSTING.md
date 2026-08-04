# Self-Hosting Guide

Run your own instance of BugDrop with your own ClickUp destination.

## Prerequisites

- Node.js 22+
- Cloudflare account (free tier works)
- A ClickUp account with a List you want BugDrop tasks to land in

## 1. Get a ClickUp API Token and List ID

1. Log into ClickUp
2. Click your avatar (bottom left) → **Settings**
3. In the left sidebar, under **Integrations & ClickApps**, click **ClickUp API**
4. Click **Generate** (or **Regenerate** if one already exists)
5. Copy the token — it starts with `pk_`
6. Open the List where BugDrop tasks should be created and copy its **List ID**:
   - The ID is the numeric segment in the URL, e.g.
     `https://app.clickup.com/9012345/v/li/901234567` → List ID is `901234567`
   - Or right-click the List in the sidebar → **Copy link**, then take the trailing ID

### Rotating the Token

ClickUp has no built-in concept of a "service account" — every API token, personal or
OAuth-authorized, belongs to a real member. If you're using your own personal token, plan for
what happens when that person changes roles or leaves:

1. Have the new token holder log into ClickUp and generate their own personal token (steps
   above).
2. Confirm they (or their account) still have access to the destination List.
3. Run `wrangler secret put CLICKUP_API_TOKEN` again with the new token.

That's the whole procedure — no code changes, no downtime beyond the few seconds it takes
Cloudflare to roll out the new secret. `CLICKUP_LIST_ID` doesn't need to change since it isn't
tied to any particular member.

## 2. Clone, Install, and Configure

```bash
# Clone and install
git clone https://github.com/YOUR_USERNAME/bugdrop
cd bugdrop
make install

# Configure environment
cp .dev.vars.example .dev.vars
```

Edit `.dev.vars` with your ClickUp credentials:

```bash
CLICKUP_API_TOKEN=pk_your_token_here
CLICKUP_LIST_ID=901234567
```

Keep local configuration in `.dev.vars` (git-ignored) rather than editing the committed `wrangler.toml`, so your fork doesn't accumulate noisy diffs. The committed `wrangler.toml` contains the upstream development defaults used by this repository.

## 3. Build the Widget

The widget source must be compiled before the dev server can serve it (the built files are not checked into git):

```bash
make build-widget
```

## 4. Run Locally

```bash
make dev
# Opens http://localhost:8787
```

Visit http://localhost:8787/test/ to try the widget.

## 5. Set Up Rate Limiting (Optional)

Rate limiting slows down spam and abuse. It uses Cloudflare KV for distributed, per-IP storage.

For local development, you can leave rate limiting unconfigured. BugDrop disables rate limiting when no `RATE_LIMIT` binding is present or when `ENVIRONMENT` is `development`.

For production, create your own KV namespaces and update your deployment configuration with the IDs from Wrangler. Do not reuse the upstream IDs committed in this repository.

```bash
# Create KV namespaces
npx wrangler kv:namespace create RATE_LIMIT
npx wrangler kv:namespace create RATE_LIMIT --preview
```

Copy the IDs from the output and update your production deployment configuration:

```toml
[[kv_namespaces]]
binding = "RATE_LIMIT"
id = "<your-production-id>"
preview_id = "<your-preview-id>"
```

**Default limit:**

- 20 requests per 15 minutes per IP, applied to `/api/feedback`

To customize the limit, edit `src/middleware/rateLimit.ts` and the middleware config in `src/routes/api.ts`.

> **Note:** If you skip this step, rate limiting is disabled but the app still works.

## 6. Deploy to Cloudflare

### Manual Deploy

If your fork is a **private** repo, the simplest path is to add `ALLOWED_ORIGINS` and
`CLICKUP_LIST_ID` directly to `[env.production].vars` in `wrangler.toml` (neither is a secret —
they're just a domain list and a destination ID) and commit them.

If your fork is **public** and you'd rather not publish your internal domain names, set them as
secrets instead — Cloudflare Workers reads `ALLOWED_ORIGINS`/`CLICKUP_LIST_ID` the same way
whether they come from `[vars]` or a secret, so this needs no code changes:

```bash
# Required
wrangler secret put CLICKUP_API_TOKEN --env production
wrangler secret put CLICKUP_LIST_ID --env production
wrangler secret put ALLOWED_ORIGINS --env production
# Optional: require signed host-app auth tokens before accepting feedback
wrangler secret put AUTH_TOKEN_SECRET --env production

# Deploy
wrangler deploy --env production
```

(`make deploy` runs `wrangler deploy` with no `--env` flag, which uses the top-level config
meant for the upstream project's own infrastructure — use the `wrangler deploy --env production`
command above instead for a self-hosted deployment.)

### Auto-Deploy via GitHub Releases

The CI workflow automatically deploys to Cloudflare when you publish a GitHub Release. This gives you explicit control over when updates go to production.

**Setup (one-time):**

1. Get your Cloudflare credentials:
   - Go to [Cloudflare Dashboard](https://dash.cloudflare.com) → Profile → API Tokens
   - Create a token with **Workers Scripts: Edit** permission
   - Note your **Account ID** from the Workers overview page

2. Add secrets to your GitHub repository:
   - Go to your repo → Settings → Secrets and variables → Actions
   - Add these repository secrets:
     - `CLOUDFLARE_API_TOKEN` - Your Cloudflare API token
     - `CLOUDFLARE_ACCOUNT_ID` - Your Cloudflare account ID

**To deploy a new version:**

1. Merge your PRs to `main` (tests run, but no deploy)
2. Go to your repo → Releases → **Create a new release**
3. Create a new tag (e.g., `v1.2.0`) following semver
4. Add release notes describing changes
5. Click **Publish release**
6. CI will automatically build and deploy to Cloudflare

The release tag (e.g., `v1.2.0`) becomes the version number for the widget files.

## 7. Add the Widget to Your Site

```html
<script src="https://bugdrop.your-subdomain.workers.dev/widget.js"></script>
```

BugDrop no longer needs a `data-repo` attribute — every submission goes to the single ClickUp List configured on the Worker (`CLICKUP_LIST_ID`). If you want to give a local browser a stable identity (e.g. for your own analytics), set `data-project`; it defaults to the page's host.

## Configuration

### Environment Variables

| Variable                        | Required | Description                                                                                   |
| ------------------------------- | -------- | --------------------------------------------------------------------------------------------- |
| `CLICKUP_API_TOKEN`             | Yes      | ClickUp personal API token (starts with `pk_`)                                                |
| `CLICKUP_LIST_ID`               | Yes      | Destination List ID for BugDrop tasks                                                         |
| `ENVIRONMENT`                   | No       | `development` disables rate limiting; `production` enables all checks                         |
| `ALLOWED_ORIGINS`               | No       | Comma-separated allowed domains (default: `*`)                                                |
| `MAX_SCREENSHOT_SIZE_MB`        | No       | Max screenshot size in MB (default: `5`)                                                      |
| `ROOT_REDIRECT_URL`             | No       | Landing page URL for `/` redirects (default: `https://bugdrop.dev`)                           |
| `AUTH_TOKEN_SECRET`             | No       | HMAC secret that requires signed host-app tokens for `/feedback`                              |
| `AUTH_TOKEN_ADDITIONAL_SECRETS` | No       | Comma/newline-separated extra HMAC secrets accepted during rotation or multi-app self-hosting |
| `AUTH_TOKEN_AUDIENCE`           | No       | Expected token `aud` claim, usually your BugDrop worker hostname                              |
| `AUTH_TOKEN_ISSUER`             | No       | Expected token `iss` claim, usually your app hostname                                         |
| `AUTH_TOKEN_REQUIRED_FOR_CHECK` | No       | Set to `true` to require auth tokens for `/check` too                                         |
| `RATE_LIMIT`                    | No       | KV namespace binding for rate limiting (see section 5)                                        |

Every task BugDrop creates is tagged `bugdrop`, the feedback category (`bug`, `feature`, or `question`), and — when the submitting page's URL parses into a valid hostname — that hostname (e.g. `chargeback.example.com`). The task title is also prefixed with the hostname (e.g. `[chargeback.example.com] Checkout button fails`). This is aimed at self-hosters routing feedback from many sites into a single shared List: use ClickUp's tag filters, saved views, or automations to group or route tasks by source site. There is currently no server-side mapping from category to a custom ClickUp field or status.

### Locking Down Allowed Origins (Recommended)

> **Security:** When self-hosting, you should always set `ALLOWED_ORIGINS` to only the domains where you embed the widget. The default `"*"` allows any website to submit requests to your worker — meaning anyone who discovers your worker URL could create tasks in your ClickUp List (subject to rate limits).

For self-hosted deployments, restrict origins to your known domains:

```toml
[vars]
ENVIRONMENT = "production"
ALLOWED_ORIGINS = "https://mysite.com,https://app.mysite.com"
CLICKUP_LIST_ID = "901234567"
```

List the exact origins (scheme + host) of sites where you embed the BugDrop widget. The worker validates the `Origin` header on incoming requests and rejects any not in this list.

If the widget is embedded across many subdomains of a domain you control (e.g. a growing set of per-site subdomains), use a wildcard-subdomain pattern instead of listing each one individually:

```toml
[vars]
ALLOWED_ORIGINS = "https://*.mysite.com,https://app.mysite.com"
```

`https://*.mysite.com` matches any subdomain (`https://a.mysite.com`, `https://a.b.mysite.com`,
...) but **not** the bare apex (`https://mysite.com`) — list the apex separately if it also
embeds the widget. The scheme in the pattern must match exactly (a `https://*.mysite.com`
pattern will not match `http://a.mysite.com`).

> **Note:** `ALLOWED_ORIGINS` is a CORS-level check — it only blocks browser-based cross-origin requests. Direct API calls (curl, scripts) don't send an `Origin` header and bypass CORS entirely. Rate limiting (section 5) is your primary defense against non-browser abuse.

### Requiring Host-App Auth Tokens (Recommended for Private Apps)

For self-hosted deployments embedded in authenticated apps, add a short-lived signed token so the worker only accepts feedback from users your app has already authorized. This is stronger than CORS alone because direct API callers must also produce a valid token.

Set a long random secret on the BugDrop worker:

```bash
wrangler secret put AUTH_TOKEN_SECRET
```

Use the exact same secret bytes in the host app that mints BugDrop tokens. The worker and
host-app signing secret must be byte-for-byte identical, including whitespace. Prefer a long
random no-newline value, and avoid shell or file flows that append a trailing newline. For
example, when setting a known value with Wrangler:

```bash
printf '%s' "$secret" | wrangler secret put AUTH_TOKEN_SECRET
```

Use an equivalent no-newline secret-setting flow for your host app platform. If your host app
successfully returns a `bd1` token but the worker logs `Invalid token signature`, check for a
secret mismatch, trailing newline, or quoting difference before debugging token claims.

Then set optional claim checks in your worker vars:

```toml
[vars]
AUTH_TOKEN_AUDIENCE = "bugdrop.your-subdomain.workers.dev"
AUTH_TOKEN_ISSUER = "app.yourdomain.com"
AUTH_TOKEN_REQUIRED_FOR_CHECK = "true"
```

When `AUTH_TOKEN_SECRET` or `AUTH_TOKEN_ADDITIONAL_SECRETS` is set, `/feedback` requires an `Authorization: Bearer <token>` header. `/check` remains public by default for backwards compatibility; set `AUTH_TOKEN_REQUIRED_FOR_CHECK = "true"` if even destination-configured status should be visible only to authenticated users.

Use `AUTH_TOKEN_ADDITIONAL_SECRETS` when rotating tokens or when one self-hosted worker is shared by multiple authenticated host apps. Keep the existing `AUTH_TOKEN_SECRET` as the primary secret, then add comma- or newline-separated additional secrets so newly migrated apps can verify without breaking apps that still sign with the primary value.

Your application should expose a same-origin endpoint that returns a token only after checking its own session:

```js
window.getBugDropToken = async function getBugDropToken() {
  const response = await fetch('/api/bugdrop-token', { credentials: 'include' });
  if (!response.ok) throw new Error('Unable to create BugDrop token');
  const { token } = await response.json();
  return token;
};
```

Then point the widget at that global function:

```html
<script
  src="https://bugdrop.your-subdomain.workers.dev/widget.js"
  data-auth-token-provider="getBugDropToken"
></script>
```

Tokens use a compact HMAC-SHA256 format with a `bd1` prefix. The payload is JSON with these claims:

```json
{
  "iss": "app.yourdomain.com",
  "aud": "bugdrop.your-subdomain.workers.dev",
  "sub": "user_123",
  "repo": "901234567",
  "iat": 1779700000,
  "exp": 1779700300,
  "jti": "unique-token-id"
}
```

Use short expirations, usually 5 minutes or less. Despite the field name (`repo`, kept for backwards compatibility with the token format), this claim must exactly match your worker's `CLICKUP_LIST_ID` value. `sub` and `jti` are not persisted by BugDrop today, but including them gives you useful audit material in your own token issuer logs.

### Root URL Redirect

By default, the worker redirects `/` to `https://bugdrop.dev` (the upstream landing page). For self-hosted deployments, set `ROOT_REDIRECT_URL` instead of editing source code.

`ROOT_REDIRECT_URL` must be an `http` or `https` URL. Invalid values are ignored with a worker log warning, and `/` falls back to `https://bugdrop.dev`.

Local `.dev.vars`:

```bash
ROOT_REDIRECT_URL=https://example.com
```

Production `wrangler.toml`:

```toml
[vars]
ROOT_REDIRECT_URL = "https://example.com"
```

## Commands

```bash
make help        # Show all commands
make dev         # Start dev server (localhost:8787)
make check       # Run lint, typecheck, knip
make test        # Run unit tests
make test-e2e    # Run E2E tests
make ci          # Run full CI pipeline
make build-all   # Build widget + worker
make deploy      # Deploy to Cloudflare
```

## Project Structure

```
src/
├── index.ts           # Worker entry
├── routes/api.ts      # API endpoints
├── lib/clickup.ts     # ClickUp API client
└── widget/            # Client widget
    ├── index.ts       # Entry point
    ├── ui.ts          # UI + theming
    ├── screenshot.ts  # Capture
    ├── picker.ts      # Element selection
    └── annotator.ts   # Drawing tools
```

## Tech Stack

- **Runtime**: Cloudflare Workers + Hono
- **Ticket destination**: ClickUp API (personal API token)
- **Widget**: TypeScript IIFE in Shadow DOM
- **Testing**: Vitest + Playwright
