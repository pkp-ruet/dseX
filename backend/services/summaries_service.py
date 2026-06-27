"""
Plain-Bengali "এক নজরে" (at a glance) stock summaries.

Each scored Dhaka Stock Exchange company gets a 3–5 sentence summary in
everyday spoken Bangla — what the company does, whether the share looks cheap
or expensive, whether it is profitable, whether it pays dividends, and a calm
plain-language bottom line. It is written for ordinary Bangladeshi readers who
are not finance experts.

Generation mirrors the score snapshot and daily tips: summaries are computed
once per scrape (see `cmd_scrape_all` / `generate-summaries` in the root
`main.py`) from the facts we already compute, and stored in the
`stock_summaries` collection. The public read path (`/api/company/{code}`)
only reads the cached text.

Two backends (chosen by the `SUMMARY_BACKEND` env var):
  * "template" (DEFAULT) — pure-Python Bengali sentence templates, the same
    matrix idea as `verdict_service.py`. Free, instant, offline, deterministic,
    no API key and no `anthropic` dependency.
  * "ai" — render the facts with Claude for more natural prose (needs
    ANTHROPIC_API_KEY + the `anthropic` package). Off by default.

Cost/skip gate: each summary stores a `source_hash` of the facts that produced
it, so only stocks whose facts changed are regenerated.

The summary is deliberately built from neutral facts (score, valuation,
dividend, profitability) rather than the buy/hold/wait `verdict` — the "এক
নজরে" block is educational, not investment advice.
"""
import hashlib
import json
import math
import os
from datetime import datetime, timezone
from typing import Optional

from pymongo import ASCENDING, UpdateOne

from backend.services.db_service import get_db, load_companies, _ttl_cache
from backend.services.scoring_service import build_scores_df

COLLECTION = "stock_summaries"

# "template" (default, no AI) or "ai" (Claude). See module docstring.
SUMMARY_BACKEND = os.getenv("SUMMARY_BACKEND", "template").strip().lower()

# Only used when SUMMARY_BACKEND == "ai".
MODEL = "claude-sonnet-4-6"
MAX_OUTPUT_TOKENS = 600


def ensure_summaries_indexes() -> None:
    get_db()[COLLECTION].create_index([("trading_code", ASCENDING)], unique=True)


# ---------------------------------------------------------------------------
# Facts — a compact, deterministic snapshot of what matters, read straight off
# the score row. Everything is rounded so the source hash is stable across runs.
# ---------------------------------------------------------------------------

def _safe(v):
    if v is None:
        return None
    if isinstance(v, float) and (math.isnan(v) or math.isinf(v)):
        return None
    return v


def _round(v, n=1):
    v = _safe(v)
    return round(v, n) if isinstance(v, (int, float)) else None


def _quality_word(score: Optional[float]) -> str:
    if score is None:
        return "unrated"
    if score >= 75:
        return "strong"
    if score >= 60:
        return "good"
    if score >= 45:
        return "average"
    return "weak"


def _facts_from_row(rec: dict, company_name: str) -> dict:
    score = _round(rec.get("score"), 0)

    pe = _round(rec.get("current_pe"))
    if pe is None:
        ltp, eps_raw = _safe(rec.get("ltp")), _safe(rec.get("eps"))
        if isinstance(ltp, (int, float)) and isinstance(eps_raw, (int, float)) and eps_raw > 0:
            pe = round(ltp / eps_raw, 1)

    return {
        "code": rec.get("trading_code"),
        "name": company_name,
        "sector": rec.get("sector"),
        "quality": _quality_word(score),
        "score": score,
        "rank": _safe(rec.get("overall_rank")),
        "total": _safe(rec.get("total_scored")),
        "pe": pe,
        "sector_pe": _round(rec.get("sector_median_pe")),
        "own_avg_pe": _round(rec.get("own_avg_pe")),
        "div_yield_pct": _round(rec.get("div_yield_pct")),
        "eps": _round(rec.get("eps"), 2),
        "eps_yoy_pct": _round(rec.get("eps_yoy_pct"), 0),
        "roe_pct": _round(rec.get("roe_pct"), 0),
        # area scores, 0–10, higher is better
        "area_profitability": _round(rec.get("p1_biz")),
        "area_health": _round(rec.get("p2_health")),
        "area_business": _round(rec.get("p3_moat")),
        "area_value": _round(rec.get("p4_val")),
        "area_dividend": _round(rec.get("p5_div")),
        "stale_data": bool(rec.get("stale_data")),
    }


def _source_hash(facts: dict) -> str:
    blob = json.dumps(facts, sort_keys=True, ensure_ascii=False, default=str)
    return hashlib.sha256(blob.encode("utf-8")).hexdigest()


# ---------------------------------------------------------------------------
# Template backend (default) — render the facts as everyday Bangla with fixed
# sentence templates. No AI, no network, deterministic.
# ---------------------------------------------------------------------------

# DSE sector free-text → Bangla, matched by keyword so variants resolve
# ("General Insurance" / "Life Insurance" → বীমা). First match wins.
_SECTOR_BN = [
    ("bank", "ব্যাংক"),
    ("cement", "সিমেন্ট"),
    ("ceramic", "সিরামিক"),
    ("engineering", "প্রকৌশল"),
    ("nbfi", "আর্থিক প্রতিষ্ঠান"),
    ("leasing", "আর্থিক প্রতিষ্ঠান"),
    ("financial", "আর্থিক প্রতিষ্ঠান"),
    ("food", "খাদ্য ও আনুষঙ্গিক"),
    ("fuel", "জ্বালানি ও বিদ্যুৎ"),
    ("power", "জ্বালানি ও বিদ্যুৎ"),
    ("insurance", "বীমা"),
    ("jute", "পাট"),
    ("mutual fund", "মিউচুয়াল ফান্ড"),
    ("paper", "কাগজ ও মুদ্রণ"),
    ("pharma", "ওষুধ ও রসায়ন"),
    ("chemical", "ওষুধ ও রসায়ন"),
    ("real estate", "সেবা ও আবাসন"),
    ("services", "সেবা ও আবাসন"),
    ("tannery", "চামড়া শিল্প"),
    ("leather", "চামড়া শিল্প"),
    ("telecom", "টেলিযোগাযোগ"),
    ("textile", "বস্ত্র"),
    ("travel", "ভ্রমণ ও বিনোদন"),
    ("leisure", "ভ্রমণ ও বিনোদন"),
    ("information technology", "তথ্যপ্রযুক্তি"),
    ("it sector", "তথ্যপ্রযুক্তি"),
    ("miscellaneous", "বিবিধ"),
]

_QUALITY_PHRASE = {
    "strong": "সব মিলিয়ে এটি একটি শক্তিশালী কোম্পানি",
    "good": "সব মিলিয়ে কোম্পানিটি ভালো অবস্থায় আছে",
    "average": "সব মিলিয়ে কোম্পানিটি মোটামুটি অবস্থায় আছে",
    "weak": "সব মিলিয়ে কোম্পানিটির অবস্থা তুলনামূলক দুর্বল",
}

_MAX_SENTENCES = 5


def _sector_bn(sector) -> Optional[str]:
    if not sector:
        return None
    s = str(sector).lower()
    for kw, bn in _SECTOR_BN:
        if kw in s:
            return bn
    return None


def _num(v) -> str:
    """Tidy a number for prose: drop a trailing .0 (6.0 → '6', 6.5 → '6.5')."""
    if isinstance(v, float) and v.is_integer():
        return str(int(v))
    return str(v)


def _render_bengali(f: dict) -> str:
    name = f["name"]
    parts: list[str] = []

    # 1) Identity
    sec = _sector_bn(f.get("sector"))
    if sec:
        parts.append(f"{name} {sec} খাতের একটি কোম্পানি।")
    else:
        parts.append(f"{name} ঢাকা স্টক এক্সচেঞ্জে তালিকাভুক্ত একটি কোম্পানি।")

    # 2) Overall quality (+ score / rank)
    phrase = _QUALITY_PHRASE.get(f.get("quality"))
    if phrase:
        s = phrase
        if f.get("score") is not None:
            s += f" (আমাদের বিশ্লেষণে 100-এর মধ্যে {_num(f['score'])})"
        if f.get("rank") and f.get("total"):
            s += f"; বাজারের {f['total']}টি কোম্পানির মধ্যে এর অবস্থান {f['rank']} নম্বরে"
        parts.append(s + "।")
    elif f.get("quality") == "unrated":
        parts.append("এই কোম্পানিকে পুরোপুরি মূল্যায়ন করার মতো যথেষ্ট তথ্য এখনো নেই।")

    # 3) Profitability
    eps = f.get("eps")
    if eps is not None:
        if eps > 0:
            yoy = f.get("eps_yoy_pct")
            if yoy is not None and yoy >= 15:
                parts.append("কোম্পানিটি লাভজনক এবং গত বছরের তুলনায় এর মুনাফা বেড়েছে।")
            elif yoy is not None and yoy <= -15:
                parts.append("কোম্পানিটি লাভ করছে, তবে গত বছরের তুলনায় মুনাফা কিছুটা কমেছে।")
            else:
                parts.append("কোম্পানিটি লাভজনক।")
        else:
            parts.append("সাম্প্রতিক বছরে কোম্পানিটি লোকসানে ছিল, তাই একটু সাবধানে দেখা ভালো।")

    # 4) Valuation vs sector
    pe, spe = f.get("pe"), f.get("sector_pe")
    if pe is not None and spe is not None and spe > 0:
        if pe <= 0.85 * spe:
            parts.append("একই ধরনের অন্যান্য কোম্পানির তুলনায় এই শেয়ারটির দাম এখন তুলনামূলক কম।")
        elif pe >= 1.15 * spe:
            parts.append("একই ধরনের অন্যান্য কোম্পানির তুলনায় এই শেয়ারটির দাম এখন তুলনামূলক বেশি।")
        else:
            parts.append("একই ধরনের অন্যান্য কোম্পানির তুলনায় শেয়ারটির দাম মোটামুটি স্বাভাবিক পর্যায়ে আছে।")

    # 5) Dividend
    dy, adiv = f.get("div_yield_pct"), f.get("area_dividend")
    if dy is not None and dy >= 4:
        parts.append(f"কোম্পানিটি ভালো ডিভিডেন্ড দেয় — বর্তমান দামে বছরে প্রায় {_num(dy)}% রিটার্ন আসে।")
    elif adiv is not None and adiv >= 7:
        parts.append("কোম্পানিটি নিয়মিতভাবে ডিভিডেন্ড দিয়ে আসছে।")
    elif dy is not None and dy > 0:
        parts.append(f"কোম্পানিটি কিছুটা ডিভিডেন্ড দেয় (বছরে প্রায় {_num(dy)}%)।")

    # 6) Financial health
    ah = f.get("area_health")
    if ah is not None:
        if ah >= 7:
            parts.append("এর আর্থিক ভিত মজবুত এবং ঋণের চাপ তুলনামূলক কম।")
        elif ah <= 4:
            parts.append("তবে কোম্পানির ঋণের চাপ তুলনামূলক বেশি, যা একটু ঝুঁকির দিক।")

    # 7) Stale-data caution
    if f.get("stale_data"):
        parts.append("মনে রাখবেন, কোম্পানিটির সর্বশেষ আর্থিক তথ্য কিছুটা পুরোনো।")

    return " ".join(parts[:_MAX_SENTENCES]).strip()


# ---------------------------------------------------------------------------
# AI backend (optional, SUMMARY_BACKEND=ai) — render the facts with Claude.
# `anthropic` is imported lazily so the default path never depends on it.
# ---------------------------------------------------------------------------

_SYSTEM = """তুমি ঢাকা স্টক এক্সচেঞ্জের (DSE) একটি কোম্পানির ছোট "এক নজরে" সারমর্ম লেখো — সাধারণ বাংলাদেশি পাঠকের জন্য, যারা শেয়ারবাজার বা ইংরেজিতে দক্ষ নয়।

কঠোর নিয়ম:
- শুধু সহজ, প্রতিদিনের কথ্য বাংলায় লেখো। ইংরেজি শব্দ ব্যবহার করো না (শুধু কোম্পানির কোড আর সংখ্যা ছাড়া)। খাতের (sector) নামও স্বাভাবিকভাবে বাংলায় লেখো।
- কোনো শেয়ারবাজারের কঠিন পরিভাষা নয়। "P/E", "ROE", "EPS", "valuation", "pillar", "DSEF" — এসব শব্দ কখনো ব্যবহার করো না। ধারণাগুলো সহজ কথায় বুঝিয়ে বলো (যেমন: শেয়ারটি অন্যদের তুলনায় সস্তা না দামি, কোম্পানিটি লাভ করছে কিনা, প্রতি বছর ডিভিডেন্ড দেয় কিনা, ঋণ বেশি কিনা)।
- এটি শিক্ষামূলক তথ্য, বিনিয়োগ পরামর্শ নয়। পাঠককে কিনতে বা বিক্রি করতে বলবে না। দাম বাড়বে বা কমবে — এমন ভবিষ্যদ্বাণী কখনো করবে না।
- ৩ থেকে ৫টি ছোট বাক্য। উষ্ণ, সহজ, গল্পের মতো ভঙ্গি। কোনো বুলেট পয়েন্ট বা শিরোনাম নয়।
- শুধু দেওয়া তথ্যের উপর ভিত্তি করে লেখো — নিজে থেকে কোনো সংখ্যা বা দাবি বানাবে না।
- শুধু বাংলা সারমর্মটুকু লেখো — কোনো ভূমিকা, ইংরেজি বা উদ্ধৃতি চিহ্ন নয়।

তোমাকে যে তথ্য দেওয়া হবে তাতে প্রতিটি দিকের জন্য ০–১০ স্কেলে নম্বর থাকবে (বেশি = ভালো) এবং সামগ্রিক মান বোঝানো একটি শব্দ থাকবে।"""

_QUALITY_BN = {
    "strong": "খুব ভালো",
    "good": "ভালো",
    "average": "মোটামুটি",
    "weak": "দুর্বল",
    "unrated": "মূল্যায়ন করা হয়নি",
}


def _user_prompt(f: dict) -> str:
    lines = [
        f"Company: {f['name']} ({f['code']})",
        f"Sector: {f['sector'] or 'unknown'}",
    ]
    quality = f"{_QUALITY_BN.get(f['quality'], f['quality'])} ({f['quality']})"
    score_line = f"Overall quality: {quality}"
    if f["score"] is not None:
        score_line += f", score {f['score']}/100"
    if f["rank"] and f["total"]:
        score_line += f", ranked {f['rank']} of {f['total']} companies"
    lines.append(score_line)

    lines.append(
        "Area scores (0-10, higher is better): "
        f"profitability {f['area_profitability']}, financial health {f['area_health']}, "
        f"business strength {f['area_business']}, price value {f['area_value']}, "
        f"dividend {f['area_dividend']}"
    )

    if f["pe"] is not None and f["sector_pe"] is not None:
        lines.append(
            f"Price compared to yearly profit is {f['pe']}, while the sector average is "
            f"{f['sector_pe']} (lower means cheaper than peers)."
        )
    if f["div_yield_pct"] is not None:
        lines.append(f"Yearly dividend return on today's price: about {f['div_yield_pct']}%.")
    if f["eps"] is not None:
        eps_line = f"Profit earned per share: {f['eps']} taka"
        if f["eps_yoy_pct"] is not None:
            eps_line += f" ({f['eps_yoy_pct']}% change vs last year)"
        lines.append(eps_line + ".")
    if f["roe_pct"] is not None:
        lines.append(f"Profit made on shareholders' money: about {f['roe_pct']}%.")
    if f["stale_data"]:
        lines.append("NOTE: this company's financial data is old / not recently updated — mention this caution.")

    return (
        "Write the Bangla 'এক নজরে' summary for the company below, using only these facts.\n\n"
        + "\n".join(lines)
    )


def _generate_bengali(facts: dict) -> Optional[str]:
    """Call Claude to render the facts as everyday Bangla. Returns None when the
    API key is missing (so the pipeline degrades gracefully)."""
    api_key = os.getenv("ANTHROPIC_API_KEY")
    if not api_key:
        return None

    import anthropic

    client = anthropic.Anthropic(api_key=api_key)
    resp = client.messages.create(
        model=MODEL,
        max_tokens=MAX_OUTPUT_TOKENS,
        thinking={"type": "disabled"},  # simple rendering, no reasoning needed
        system=[{
            "type": "text",
            "text": _SYSTEM,
            "cache_control": {"type": "ephemeral"},  # reused across all stocks in a run
        }],
        messages=[{"role": "user", "content": _user_prompt(facts)}],
    )
    text = "".join(b.text for b in resp.content if b.type == "text").strip()
    return text or None


def _generate_summary(facts: dict) -> Optional[str]:
    """Render one Bengali summary using the configured backend."""
    if SUMMARY_BACKEND == "ai":
        return _generate_bengali(facts)
    return _render_bengali(facts)


# ---------------------------------------------------------------------------
# Generator — run post-scrape; regenerates only stocks whose facts changed.
# ---------------------------------------------------------------------------

def compute_and_store_summaries(codes: Optional[list[str]] = None,
                                force: bool = False) -> dict:
    """Generate + upsert Bengali summaries for scored companies.

    Skips any stock whose facts hash matches the stored one (the cost gate),
    unless `force` is set. Pass `codes` to limit to specific trading codes.
    """
    df = build_scores_df()
    if df.empty:
        return {"generated": 0, "skipped": 0, "failed": 0}

    companies = {c["trading_code"]: c for c in load_companies()}
    col = get_db()[COLLECTION]
    existing = {
        d["trading_code"]: d.get("source_hash")
        for d in col.find({}, {"trading_code": 1, "source_hash": 1, "_id": 0})
    }

    wanted = {c.strip().upper() for c in codes} if codes else None

    generated = skipped = failed = 0
    ops: list[UpdateOne] = []

    for rec in df.to_dict("records"):
        code = rec.get("trading_code")
        if not code:
            continue
        if wanted is not None and code not in wanted:
            continue
        if _safe(rec.get("score")) is None:
            continue  # nothing meaningful to summarize

        comp = companies.get(code, {})
        facts = _facts_from_row(rec, comp.get("company_name") or code)
        h = _source_hash(facts)

        if not force and existing.get(code) == h:
            skipped += 1
            continue

        try:
            summary = _generate_summary(facts)
        except Exception as e:  # one bad stock must not abort the batch
            failed += 1
            print(f"  [{code}] summary generation failed: {e}")
            continue
        if not summary:
            failed += 1
            continue

        ops.append(UpdateOne(
            {"trading_code": code},
            {"$set": {
                "trading_code": code,
                "summary_bn": summary,
                "source_hash": h,
                "generated_at": datetime.now(timezone.utc),
            }},
            upsert=True,
        ))
        generated += 1
        if len(ops) >= 25:
            col.bulk_write(ops)
            ops = []

    if ops:
        col.bulk_write(ops)

    load_stock_summary.cache_clear()
    return {"generated": generated, "skipped": skipped, "failed": failed}


# ---------------------------------------------------------------------------
# Public read path — API reads the cached text only (no `anthropic` import).
# ---------------------------------------------------------------------------

@_ttl_cache(3600, 500)
def load_stock_summary(trading_code: str) -> Optional[str]:
    doc = get_db()[COLLECTION].find_one(
        {"trading_code": trading_code}, {"summary_bn": 1, "_id": 0}
    )
    return (doc or {}).get("summary_bn")
