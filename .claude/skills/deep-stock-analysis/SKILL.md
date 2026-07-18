---
name: deep-stock-analysis
description: >
  Generate a comprehensive bilingual (English + Bengali) deep-dive analysis report for one or
  more Dhaka Stock Exchange (DSE) stocks and save it to the deep_analysis MongoDB collection.
  Use when the user asks to generate, write, or refresh deep / premium stock analysis reports —
  a single code, or in RANKING order via "run next N" / "run next" (default 10), which generates
  the next N companies down the leaderboard that don't have a report yet.
---

# Deep Stock Analysis

You (Claude Code) are the analysis engine. For each stock you read a complete **fact pack**
(produced by a Python helper straight from the app's own data) and **write** a long-form,
bilingual, retail-friendly research report, then save it to MongoDB. There is no Anthropic API
key and no per-call cost — the reasoning is yours.

This runs **locally, on demand** (it can't run inside the server's scrape cron). Reports are a
premium feature served later from the `deep_analysis` collection.

## The loop (per stock)

Run these from the **repo root**. Use any working directory for the JSON files (examples use
`_work/`); the paths are explicit.

1. **Dump the fact pack**
   ```bash
   py scripts/deep_analysis/dump_facts.py --code GP --out _work
   ```
   → writes `_work/GP.json`.

2. **Write the report** — read `_work/GP.json`, then write `_work/GP.analysis.json` in the exact
   output format below. This is the actual analysis step: your prose, grounded only in the fact
   pack. **Quote every number from the fact pack's `figures` block** (already in crore / taka) —
   never convert the raw figures yourself.

3. **Save it**
   ```bash
   py scripts/deep_analysis/save_analysis.py --code GP --file _work/GP.analysis.json --facts _work/GP.json
   ```
   It validates the structure and upserts into `deep_analysis`. If it rejects the file, fix the
   reported problem and re-run — never work around the validator.

## The report — structure

The reader gets the thesis in ~20 seconds from the headline + bottom line (a live "value today"
box sits beside them on the page), then the full story in plain words. Target **~1,500–2,000
words of English**, mirrored by a full **Bengali** version. Medium depth — thorough but
mobile-friendly.

### Layer 1 — Snapshot (durable)
- **`headline`** — one plain-word line capturing the durable thesis (quality, dividend, the main
  fundamental caveat). **No price verdict here** ("cheap today", etc.) — that is live.
- **`bottom_line`** — 2–3 sentences: what kind of company it is and who it suits. You may mention
  the value *approach*, but **not** today's price or the cheap/fair/expensive stance.

> You do **not** write the scorecard or the fair-value figures. Those, and every price-relative
> number, are computed **live at serve time** from the current price (Option A), so the report
> never goes stale. You write only the durable narrative — see **Durable vs live** below.

### Layer 2 — The narrative sections (fixed keys, fixed order)

| key | Title (reader question) | Cover, in plain words — durable facts only |
|---|---|---|
| `story` | What does this company do? | The business, what it sells, how long listed, its size/place in the sector. |
| `business_model` | How does it make money? | Where revenue comes from, who pays, what drives sales. |
| `earnings` | Is it actually making money? | Profit/earnings trend over the years (growing, shrinking, bumpy), how well it turns sales into profit. |
| `financial_health` | Is it financially safe? | Debt vs its own money, cash generation, whether it could survive a bad year. |
| `valuation` | How do we judge if it's fairly priced? | Explain the *method* in plain words — comparing the price to how the share has usually been priced, to similar companies, to the value of its assets, and to its dividend — plus durable inputs like profit per share and its own usual pricing level. **Do not state today's price, the current P/E, the dividend yield, specific fair-value figures, or a cheap/fair/expensive verdict** — the live "value today" box carries those. |
| `dividend` | Does it reward shareholders? | Dividend history and how reliable it is, the dividend **amount** and % of face value, and whether the payout looks safe (how much of profit it uses). Cite the dividend amount, **not** today's yield (yield is live). |
| `moat` | What makes it special? | Its edge — market position, brand, scale, and how its margins / size / growth compare with the peers in the fact pack. **Do not cite our score, tier, or sector rank** (those are live). Or honestly say if it has little edge. |
| `bull_case` | Why it could do well | **3–5 bullet points.** Grounded, durable reasons to be positive. |
| `bear_case` | What could go wrong | **3–5 bullet points.** Real risks and watch-outs. |
| `bottom_line` | So, is it for you? | Honest wrap-up: which kind of investor this suits (steady-income, long-term, risk-taker), and the main caveat. |

Each section: a **one-line `takeaway`** (what a skimmer should remember) + **~2–3 short
paragraphs** of `body` (markdown). `bull_case` / `bear_case` bodies are markdown bullet lists.

### Layer 3 — Fine print
`disclaimer` (educational, not investment advice), `as_of_date` (the fact pack's data date), and
an optional `data_note` when the underlying data is old or thin.

## Writing rules (hard)

- **Bilingual**: every text field has a full English (`*_en`) and full everyday-**Bengali**
  (`*_bn`) version. The Bengali is a real translation, not a copy.
- **Simple language, story tone, zero jargon.** Audience: ordinary Bangladeshi readers, not
  finance pros and not strong in English. Never use "P/E", "ROE", "EPS", "NAV", "valuation",
  "moat", "pillar", "DSEF" as bare terms — explain the idea in plain words ("for every 100 taka
  of yearly profit, the market has usually paid about X taka for the share").
- **Bengali numbers use Western digits** — write `9টি`, `+6%`, `৳215`, never Bengali numerals
  (১২৩). (The reader's device renders Bengali numerals broken.)
- **Grounded, no fabrication.** Every number, date, and fact must come from the fact pack. Never
  invent figures, events, or history. If something isn't in the pack, say so plainly or omit it.
- **Durable vs live — the key rule.** Write only what stays true over time. You MAY cite anything
  from the financial statements / history: profit, earnings per share, revenue, cash flow, debt,
  asset value (NAV), the dividend **amount** and % of face value, dividend history, and the
  company's *own historical average* pricing level. You must NOT put anything that moves with the
  daily price into the prose: today's price, the current P/E or P/B, the dividend **yield**, the
  cheap/fair/expensive stance, specific fair-value taka figures, recent returns (1m/3m/1y), the
  52-week position, or momentum. **Also never quote our own score, our tier, our sector rank
  ("Nth of M companies"), or the scorecard words ("rates as okay / strong")** — those are the
  live scorecard / ranking and would contradict the live box the moment a score moves. When you
  discuss competitive position, argue it from **real figures instead** — its margins, size, and
  growth versus the peers listed in the fact pack. All of the above are shown live beside the
  report; refer to "the live value estimate" rather than quoting a number.
- **Numbers — copy from `figures`, never compute.** The fact pack has a **`figures`** block with
  every key number already converted to **crore taka** or **taka per share**, rounded and labelled
  (`figures.per_year`, `figures.latest`, `figures.growth`, `figures.profile`, `figures.ownership`).
  Quote those values directly. Do **not** do your own arithmetic on the raw `financials` /
  `extended_financials` — they show the trend, not numbers to convert by hand; converting raw taka
  yourself is exactly what causes magnitude errors (e.g. writing "a few hundred crore" for an
  ৳82-crore figure). If a number you want isn't in `figures`, describe it in words, don't compute it.
- **Educational, not advice.** Describe and explain; give both the bull and bear sides. Never
  tell the reader to buy or sell, and never predict future prices. The app's current Buy/Sell
  signal is shown **live** beside the report — do not bake a specific buy/sell/hold verdict into
  the prose (it moves with the price), and never derive your own.
- End every report with the disclaimer.

## Output format (exactly what `save_analysis.py` accepts)

Write this JSON to `<CODE>.analysis.json`. It is the **durable narrative only** — no price,
scorecard, or fair-value figures (those are served live).

```json
{
  "trading_code": "GP",
  "company_name": "Grameenphone Ltd.",
  "lang": "both",
  "headline_en": "…", "headline_bn": "…",
  "bottom_line_en": "…", "bottom_line_bn": "…",
  "sections": [
    { "key": "story",            "title_en": "What does this company do?", "takeaway_en": "…", "body_en": "…",
      "title_bn": "…", "takeaway_bn": "…", "body_bn": "…" },
    { "key": "business_model",   "…": "…" },
    { "key": "earnings",         "…": "…" },
    { "key": "financial_health", "…": "…" },
    { "key": "valuation",        "…": "…" },
    { "key": "dividend",         "…": "…" },
    { "key": "moat",             "…": "…" },
    { "key": "bull_case",        "…": "…" },
    { "key": "bear_case",        "…": "…" },
    { "key": "bottom_line",      "…": "…" }
  ],
  "disclaimer_en": "This is educational information, not investment advice.",
  "disclaimer_bn": "এটি শিক্ষামূলক তথ্য, বিনিয়োগ পরামর্শ নয়।",
  "as_of_date": "…",             // from the fact pack's as_of_price_date (the data date)
  "data_note_en": null, "data_note_bn": null   // short caution when data is old / thin
}
```

The 10 `sections` must be present, in order, each with all six fields non-empty.
`save_analysis.py` fills `source_hash`, `data_completeness`, `schema_version`, `model` and
`generated_at` — pass `--facts <CODE>.json` so the first two come from the fact pack.

## Running in ranking order: "run next N"

Reports are generated top-down through our leaderboard (the `/dsestockranking` order — highest
score first). **"run next N"** generates the next N companies down the ranking that don't have a
report yet; **"run next"** with no number means **N = 10**. Progress tracks itself — the
`deep_analysis` collection is the bookmark, so successive runs march ranks 1–10, 11–20, … with
no stored counter and pick up where you left off across sessions.

1. **Pick the batch** (prints the next N codes by rank, using the latest ranking):
   ```bash
   py scripts/deep_analysis/next_batch.py --n 10
   ```
2. **Generate them** with the fan-out workflow (one agent per code → adversarial number-check):
   run the **Workflow** tool with `scriptPath: "scripts/deep_analysis/batch_workflow.js"` and
   `args: { codes: [ …the codes from step 1… ], workdir: "_work" }`.
   (For a single code, use the three-step loop at the top instead.)
3. **Report back**: which codes were saved, any the verify pass flagged, and what the next batch
   would be (re-run `next_batch.py`).

Never-done companies are covered first; a company that already has a report is skipped even if
its facts later changed — that is a stale refresh (below), kept separate so "run next N" keeps
advancing coverage instead of looping back.

## Single stock

"analyze GP" (or any single code) → run the three-step loop once for that code. Before saving,
re-read the report against the fact pack: every figure grounded, nothing price-relative in the
prose, nothing reads as advice. Then tell the user what was saved.

## Refresh stale reports (separate from "run next")

When fundamentals change, a stored report's `source_hash` stops matching the current facts:
```bash
py scripts/deep_analysis/status.py --list      # shows missing / stale / up-to-date
```
Regenerate the `stale` codes the same way (single loop, or the workflow with those codes).

## Cost gate

Each report stores the `source_hash` of the facts it was built from, so an unchanged stock is
never regenerated: `next_batch.py` skips anything already in `deep_analysis`, and `status.py`
skips anything whose facts are unchanged.
