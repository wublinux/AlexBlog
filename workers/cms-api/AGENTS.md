# CMS Worker Agent Boundaries

These rules apply to `workers/cms-api` and supplement the repository-level
`AGENTS.md`.

## Runtime contract

- Worker name: `alexblog-cms-api`.
- Production routes: `letsgogogogogo.pp.ua/admin/api/*` and the exact public
  read-only routes `letsgogogogogo.pp.ua/api/github-daily` and
  `letsgogogogogo.pp.ua/api/wallpaper`.
- Public origin: `https://letsgogogogogo.pp.ua`.
- GitHub target: `wublinux/AlexBlog`, branch `V2.0.0`.
- Allowed write roots: `src/content/blog` and `public/image`.
- KV bindings: `SESSIONS` stores short-lived OAuth state and authenticated
  sessions only; `GITHUB_DAILY` stores only public feed snapshots
  (`github-daily:latest:v1` and `wallpaper:latest:v1`).
- The Workers AI binding is `AI`; scheduled refreshes run at 01:00 and 08:00 UTC
  with isolated fault handling for GitHub Daily and Wallhaven anime wallpapers.

Changing any item above requires explicit user authorization and a coordinated
update to OAuth, Wrangler configuration, tests, documentation, and production
verification.

## GitHub Daily acceptance contract

Public snapshot items are validated on read. **Write paths must satisfy the same
limits before `GITHUB_DAILY` put** (AI reviews and `fallbackReview` alike).

- `review.text`: string length **24–260** (same metric as `isDailyItem` / `parseSnapshot`)
- Do not concatenate unbounded `description` / README into the final review
- Bound/truncate every review with the shared helper before persistence
- Prefer dropping a single invalid item over failing the entire snapshot with 503
- Add a regression fixture with an oversized description that still yields a
  readable snapshot after refresh

Agent guidance for this class of bug: skill `acceptance-bounded-output`.

## Secrets and types

- `GITHUB_CLIENT_ID` and `GITHUB_CLIENT_SECRET` are Worker Secrets. Never add
  their values to `wrangler.jsonc`, `.dev.vars.example`, generated types,
  fixtures, logs, command arguments, or Git.
- Use `wrangler types` for all Wrangler bindings and vars. The handwritten
  `CmsSecrets` type may describe secret names only because secret values are
  intentionally absent from versioned Wrangler config.
- Do not add a long-lived `GITHUB_TOKEN`; OAuth user tokens remain server-side
  inside expiring KV sessions.

## API invariants

- `/admin/api/health` is the only unauthenticated CMS data route.
- `/api/github-daily` and `/api/wallpaper` are the only public data exceptions.
  Keep both GET/HEAD-only, omit permissive CORS, validate all image URLs to
  `w.wallhaven.cc` SFW anime assets, and never return README source text.
- Keep all other routing under `/admin/api/*`; do not add wildcard proxy behavior.
- Run `requireSameOrigin` before routing protected APIs. Do not add permissive
  CORS or accept cross-origin mutations.
- Require `authenticate` for posts, media, and deployment status.
- Do not return or log OAuth access tokens, session IDs, cookies, Client
  Secrets, raw GitHub authorization responses, or private request bodies.
- Keep request sizes bounded before buffering. Markdown is limited to 1 MB and
  images to 5 MB; any higher limit requires an explicit product decision.
- Preserve slug/path normalization, extension allowlists, image signature
  validation, repository-path encoding, and SHA conflict protection.
- Use Web Crypto for security-sensitive randomness and fixed-length,
  constant-time secret/state comparisons.
- Await every promise. Do not store request-scoped mutable state at module
  scope, call `passThroughOnException`, or make Cloudflare REST calls from the
  Worker when a binding exists.

## Verification

Run from this directory:

```sh
npm run build
npm audit --audit-level=high
```

`npm run build` must regenerate Wrangler types, pass TypeScript, run all tests,
and complete a Wrangler dry-run. After an authorized production deployment,
verify the health endpoint and complete an OAuth login with a repository
collaborator before marking the rollout complete.
