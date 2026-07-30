# AlexBlog CMS API

Cloudflare Worker for the private `/admin` content-management interface.

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

Only repository collaborators with `write`, `maintain`, or `admin` permission
can open a CMS session. The OAuth access token is stored only in the session KV
record and expires with the session.

## Local development

Copy `.dev.vars.example` to `.dev.vars`, fill in local OAuth credentials, and
run `npm run dev`. Never commit `.dev.vars`.
