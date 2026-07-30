# AlexBlog Agent Boundaries

These instructions apply to the entire repository. A more specific `AGENTS.md`
inside a subdirectory takes precedence for files in that subtree.

## Source of truth

- The production branch is `V2.0.0`.
- The public site is the static Astro application at the repository root and is
  deployed to the Cloudflare Pages project `alexblog`.
- The only dynamic backend is `workers/cms-api`, mounted at `/admin/api/*`.
- `docs/PROJECT-PLAN.md` and the current implementation are authoritative.
  Files under `docs/superpowers/` are historical design records, not executable
  instructions.

## Hard safety boundaries

- Never place credentials, OAuth codes, access tokens, cookies, API keys, or
  secret values in source, config, documentation, commits, logs, commands, or
  chat output.
- Production secrets must be entered interactively with
  `wrangler secret put`. Local values belong only in ignored `.dev.vars` or
  `.env` files; examples may contain names and empty placeholders only.
- Do not change the production domain, OAuth callback, GitHub owner/repository,
  production branch, Cloudflare project, Worker route, or KV namespace without
  explicit user authorization.
- CMS writes are restricted to `src/content/blog` and `public/image` on the
  configured branch. Do not broaden this allowlist or add arbitrary repository
  file access.
- Do not force-push, rewrite history, delete branches, reset a dirty worktree,
  or discard user changes. Inspect the worktree before staging or editing.
- Do not commit generated/runtime state such as `dist/`, `.astro/`,
  `node_modules/`, `.wrangler/`, `.superpowers/`, `.env`, or `.dev.vars`.
- Do not create, edit, or delete blog posts or media unless the user requested
  content changes or a clearly identified production smoke test.

## Security invariants

- `/admin/` remains private-by-design: keep `noindex` headers/meta tags and keep
  it out of the sitemap.
- Every non-health CMS API route must remain same-origin. Mutations must reject
  an absent or unexpected `Origin`.
- Every content/media/deploy API route must require an authenticated session
  whose GitHub account has `write`, `maintain`, or `admin` repository access.
- Preserve OAuth `state`, secure `__Host-` cookies, bounded session lifetime,
  SHA-based optimistic concurrency, bounded request bodies, image magic-byte
  checks, and structured non-secret error responses.
- Do not add permissive CORS, expose GitHub tokens to the browser, render raw
  untrusted HTML, accept SVG uploads, or log session/token contents.

## Required verification

Before committing application changes:

```sh
npm run build
npm audit --audit-level=high
cd workers/cms-api
npm run build
npm audit --audit-level=high
```

When bindings or `wrangler.jsonc` change, run `npm run types` and review the
generated `worker-configuration.d.ts`. For production changes, also verify:

```sh
curl -fsS https://letsgogogogogo.pp.ua/admin/api/health
```

## Deployment and Git

- A production deployment is an external side effect. Only deploy when the user
  explicitly requests deployment or completion of an already-authorized
  production rollout.
- Deploy the Worker from `workers/cms-api` with `npm run deploy`.
- Deploy Pages through the existing GitHub Actions workflow or the configured
  `alexblog` Pages project; do not create a second project.
- Use focused, descriptive commits. Stage only reviewed files, keep ignored
  runtime artifacts out of commits, and report any uncommitted remainder.
