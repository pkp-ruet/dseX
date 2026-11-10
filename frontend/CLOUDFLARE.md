# Frontend on Cloudflare Workers

Since 2026-11-10 the Next.js frontend runs on a Cloudflare Worker through the
OpenNext adapter (`@opennextjs/cloudflare`). It left Vercel when the Hobby plan
paused the site for going over Fast Origin Transfer. The backend (Render) and
the database (Atlas) did not move.

| Piece | Where |
|---|---|
| The site (server code) | Worker `topstockbd`, config in `wrangler.jsonc` |
| Page cache (ISR + fetch cache) | R2 bucket `topstockbd-cache` |
| Cache tags (`revalidateTag("market-data")`) | D1 database `topstockbd-tags` |
| Background page rebuilds | Durable Object `DOQueueHandler` |
| Adapter options | `open-next.config.ts` |
| Deploy | GitHub Action "Deploy frontend (Cloudflare)" (every push to `main` that touches `frontend/`, or by hand) |

Cost: Workers Paid, $5 a month. It includes 10 million requests and 30 million
CPU-milliseconds a month; R2 and D1 stay inside their free allowances at this
site's size. There is no bandwidth charge.

## One-time setup

Run these in `frontend/` on your PC. `wrangler` opens the browser once to log in.

1. **Workers Paid.** Cloudflare dashboard → Workers & Pages → Plans →
   Workers Paid ($5/month). The free plan can't run this site: 3 MB of code
   and 10 ms of CPU per request.
2. **Log in.**
   ```bash
   npx wrangler login
   ```
3. **The cache bucket.**
   ```bash
   npx wrangler r2 bucket create topstockbd-cache
   ```
4. **The tag database.** Done 2026-11-10; its `database_id` is in
   `wrangler.jsonc`. (For a new account: copy the id it prints there. Answer
   "n" when wrangler offers to add the bucket / database to the config — it
   would add them under the wrong binding names.)
   ```bash
   npx wrangler d1 create topstockbd-tags
   ```
5. **An API token for GitHub.** Dashboard → My Profile → API Tokens → Create
   Token → template "Edit Cloudflare Workers" → add the permission
   *Account · D1 · Edit* → your account and the topstockbd.com zone → Create.
6. **GitHub secrets** (repo → Settings → Secrets and variables → Actions):
   - `CLOUDFLARE_API_TOKEN`: the token from step 5
   - `CLOUDFLARE_ACCOUNT_ID`: dashboard → Workers & Pages, right-hand side
   - `REVALIDATE_SECRET`: the same value as on Render
   - `NEXT_PUBLIC_GA_ID`, `NEXT_PUBLIC_GOOGLE_CLIENT_ID`: the values Vercel had
   - `VAPID_PUBLIC_KEY`: probably there already (the morning brief uses it)
7. **First deploy.** GitHub → Actions → "Deploy frontend (Cloudflare)" → Run
   workflow. When it's green, the site answers at
   `https://topstockbd.<your-subdomain>.workers.dev`. Google sign-in won't work
   on that address (Google only allows topstockbd.com); everything else should.
8. **The secret on the Worker** (once the Worker exists):
   ```bash
   npx wrangler secret put REVALIDATE_SECRET
   ```
   Paste the same value as on Render. Without it the scrape can't clear the
   page cache, and the site's backend requests count against the rate limits.
9. **Move the domain.** Dashboard → DNS for topstockbd.com: delete the `www`
   record that points at Vercel. Then Workers & Pages → topstockbd → Settings →
   Domains & Routes → Add → Custom domain → `www.topstockbd.com`.
   For the bare domain: Rules → Redirect Rules → template "Redirect from root
   to WWW" (keep the path and query). If `topstockbd.com` also points at
   Vercel, change its record to a proxied `A 192.0.2.1` so the rule can run.
10. **Check.** Open www.topstockbd.com, a stock page, sign in with Google, and
    check that the next scrape's purge works (the Render log line for
    `/api/revalidate` should say 200).

Nothing changes on Render: `FRONTEND_REVALIDATE_URL` stays
`https://www.topstockbd.com/api/revalidate`.

## Day to day

- Deploy: push to `main`, or run the Action by hand.
- Deploy from your PC: use WSL (OpenNext doesn't fully support Windows):
  `npm run deploy`.
- Logs: dashboard → Workers & Pages → topstockbd → Logs, or
  `npx wrangler tail`.
- Roll back: dashboard → topstockbd → Deployments → pick an older version.
