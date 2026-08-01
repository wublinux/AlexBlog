# AlexBlog Worker API

Cloudflare Worker for the private `/admin` content-management interface and
the public, read-only `/api/github-daily` feed.

## One-time Cloudflare setup

1. The current Cloudflare account already has the `alexblog-cms-sessions` KV
   namespace bound in `wrangler.jsonc`. Create a replacement only when deploying
   from a different Cloudflare account.
2. Create a GitHub OAuth App whose callback URL is
   `https://letsgogogogogo.pp.ua/admin/api/auth/callback`.
3. Add the OAuth credentials without committing their values:

   ```sh
   npx wrangler secret put GITHUB_CLIENT_ID
   npx wrangler secret put GITHUB_CLIENT_SECRET
   ```

4. Before the authorized GitHub Daily rollout, create its dedicated cache:

   ```sh
   npx wrangler kv namespace create GITHUB_DAILY
   ```

   Copy only the returned namespace ID into the existing `GITHUB_DAILY`
   binding in `wrangler.jsonc`. Do not reuse the `SESSIONS` namespace: it is
   reserved for OAuth state and authenticated sessions.

Only repository collaborators with `write`, `maintain`, or `admin` permission
can open a CMS session. The OAuth access token is stored only in the session KV
record and expires with the session.

GitHub Daily runs at 01:00 and 08:00 UTC (09:00 and 16:00 Asia/Hong_Kong).
Each run searches public repositories created in the preceding 24 hours, reads
bounded README excerpts, generates Chinese summaries through the Workers AI
binding, and atomically replaces the latest KV snapshot. A failed source refresh
does not overwrite the last successful snapshot.

## Local development

Copy `.dev.vars.example` to `.dev.vars`, fill in local OAuth credentials, and
run `npm run dev`. Never commit `.dev.vars`. Wrangler simulates the KV binding
locally; Workers AI always uses its remote binding and may incur usage.
