// Cloudflare Workers build (OpenNext adapter), 2026-11-10.
// The site left Vercel when the Hobby plan paused it for Fast Origin Transfer.
//
// - Page cache (ISR + fetch cache) lives in R2, with a per-data-centre copy in
//   the Cache API in front of it so a cached page doesn't read R2 every time.
// - Cache tags (`revalidateTag("market-data")` from the scrape) live in D1.
// - Time-based revalidation (`export const revalidate = 900`) runs through a
//   Durable Object queue, so a stale page is rebuilt once, in the background.
// - Cache interception serves a cached ISR page before Next.js is loaded,
//   which keeps CPU time per request low.
import { defineCloudflareConfig } from "@opennextjs/cloudflare";
import r2IncrementalCache from "@opennextjs/cloudflare/overrides/incremental-cache/r2-incremental-cache";
import { withRegionalCache } from "@opennextjs/cloudflare/overrides/incremental-cache/regional-cache";
import d1NextTagCache from "@opennextjs/cloudflare/overrides/tag-cache/d1-next-tag-cache";
import doQueue from "@opennextjs/cloudflare/overrides/queue/do-queue";

export default defineCloudflareConfig({
  incrementalCache: withRegionalCache(r2IncrementalCache, { mode: "long-lived" }),
  tagCache: d1NextTagCache,
  queue: doQueue,
  enableCacheInterception: true,
});
