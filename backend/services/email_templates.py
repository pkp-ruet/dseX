"""
HTML builders for the re-engagement email.

Pure formatters — all data is computed in campaign_service and passed in as
plain primitives. Output is inline-CSS, table-based, 600px single-column so it
renders consistently across email clients (Gmail/Outlook/Apple Mail) and on
mobile. Brand tokens mirror frontend/app/globals.css (light-only).
"""
import html
from typing import Optional

# Brand palette (hardcoded — email clients can't read CSS variables)
INDIGO = "#4338CA"
INDIGO_DARK = "#3730A3"
INDIGO_BG = "#EEF0FB"
POS = "#047857"
POS_BG = "#E1F5EE"
POS_TX = "#0F6E56"
NEG = "#DC2626"
NEG_BG = "#FCEBEB"
WARM_BG = "#FAEEDA"
WARM_TX = "#854F0B"
BG = "#FBFAF8"
SURFACE = "#FFFFFF"
TEXT = "#1C1917"
TEXT2 = "#44403C"
MUTED = "#79716B"
BORDER = "#E9E3D8"
CELL = "#F0EDE6"

_FONT = "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif"

# Badge colour by kind: tier (indigo), high (green), div (amber)
_BADGE = {
    "tier": (INDIGO_BG, INDIGO_DARK),
    "high": (POS_BG, POS_TX),
    "div": (WARM_BG, WARM_TX),
}


def _esc(v) -> str:
    """Scraped news titles and company names land in this HTML — escape them."""
    return html.escape(str(v), quote=False) if v is not None else ""


def _money(v: Optional[float]) -> str:
    if v is None:
        return "—"
    return f"৳{v:,.1f}"


def _signed_money(v: Optional[float]) -> str:
    if v is None:
        return "—"
    return f"{'+' if v >= 0 else '−'}৳{abs(v):,.0f}"


def _chg_span(v: Optional[float]) -> str:
    if v is None:
        return f'<span style="color:{MUTED};">—</span>'
    if v > 0:
        return f'<span style="color:{POS};font-weight:700;">▲ {v:.1f}%</span>'
    if v < 0:
        return f'<span style="color:{NEG};font-weight:700;">▼ {abs(v):.1f}%</span>'
    return f'<span style="color:{MUTED};">0.0%</span>'


def _chg_inline(v: Optional[float]) -> str:
    if v is None:
        return ""
    c = POS if v >= 0 else NEG
    s = "+" if v >= 0 else "−"
    return f' <span style="color:{c};font-weight:700;">{s}{abs(v):.1f}%</span>'


def _badge(text: str, kind: str) -> str:
    bg, fg = _BADGE.get(kind, (CELL, MUTED))
    return (
        f'<span style="font-size:11px;background:{bg};color:{fg};'
        f'padding:3px 8px;border-radius:20px;white-space:nowrap;">{text}</span>'
    )


# ---------------------------------------------------------------------------
# Shared blocks
# ---------------------------------------------------------------------------

def _pulse_block(pulse: dict) -> str:
    """Indigo DSEX market-pulse card."""
    dsex = pulse.get("dsex")
    chg = pulse.get("change_pct")
    label = pulse.get("change_label", "today")
    up = pulse.get("up_count")
    down = pulse.get("down_count")
    turnover = pulse.get("turnover_cr")

    if chg is None:
        chg_html = ""
    elif chg >= 0:
        chg_html = f'<span style="font-size:15px;font-weight:700;color:#86EFAC;">▲ {chg:.1f}%</span>'
    else:
        chg_html = f'<span style="font-size:15px;font-weight:700;color:#FCA5A5;">▼ {abs(chg):.1f}%</span>'

    meta_bits = []
    if up is not None and down is not None:
        meta_bits.append(f"{up} stocks up · {down} down")
    if turnover is not None:
        meta_bits.append(f"৳{turnover:,.0f} cr traded")
    meta = " · ".join(meta_bits)

    return f"""
    <tr><td style="padding:4px 24px 16px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:{INDIGO};border-radius:10px;">
        <tr><td style="padding:16px 18px;color:#ffffff;">
          <div style="font-size:11px;letter-spacing:.5px;text-transform:uppercase;opacity:.85;">DSEX · {label}</div>
          <div style="margin-top:4px;">
            <span style="font-size:26px;font-weight:700;">{dsex:,.0f}</span>&nbsp;&nbsp;{chg_html}
          </div>
          <div style="font-size:12px;opacity:.9;margin-top:6px;">{meta}</div>
        </td></tr>
      </table>
    </td></tr>"""


def _section_label(text: str) -> str:
    return (
        f'<tr><td style="padding:14px 24px 6px;">'
        f'<div style="font-size:13px;font-weight:700;color:{TEXT};text-transform:uppercase;letter-spacing:.4px;">{text}</div>'
        f'</td></tr>'
    )


def _recap_block(recap: dict) -> str:
    """Three 'while you were away' stat chips."""
    chips = []
    chg = recap.get("dsex_chg")
    if chg is not None:
        s = "+" if chg >= 0 else "−"
        chips.append((f"{s}{abs(chg):.1f}%", f"DSEX · {recap.get('dsex_label', '')}", INDIGO_BG, INDIGO_DARK))
    sc = recap.get("strong_count")
    if sc:
        chips.append((f"{sc} new", "top-rated stocks", POS_BG, POS_TX))
    dc = recap.get("dividends_count")
    if dc:
        chips.append((f"{dc}", "dividends declared", WARM_BG, WARM_TX))
    if not chips:
        return ""
    w = round(100 / len(chips))
    cells = "".join(
        f'<td width="{w}%" style="background:{bg};border-radius:8px;padding:10px;text-align:center;">'
        f'<div style="font-size:18px;font-weight:800;color:{fg};">{big}</div>'
        f'<div style="font-size:10px;color:{MUTED};">{small}</div></td>'
        for (big, small, bg, fg) in chips
    )
    return (
        f'<tr><td style="padding:10px 24px 4px;">'
        f'<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:separate;border-spacing:6px;">'
        f'<tr>{cells}</tr></table></td></tr>'
    )


def _top_rated_card(strong: list[dict]) -> str:
    """3–4 top-rated (Excellent tier) stocks with score + price."""
    if not strong:
        return ""
    items = strong[:4]
    last = len(items) - 1
    rows = []
    for i, s in enumerate(items):
        border = "" if i == last else f"border-bottom:1px solid {CELL};"
        name = (s.get("name") or "")[:22]
        price = _money(s.get("ltp")) if s.get("ltp") is not None else ""
        score = int(round(s["score"]))
        rows.append(
            f'<tr style="{border}"><td style="padding:8px 0;"><b style="color:{TEXT};">{s["code"]}</b> '
            f'<span style="color:{MUTED};font-size:11px;">{name}</span></td>'
            f'<td style="text-align:right;color:{TEXT};white-space:nowrap;">{price}</td>'
            f'<td style="text-align:right;padding-left:8px;"><span style="font-size:11px;background:{INDIGO_BG};'
            f'color:{INDIGO_DARK};padding:2px 8px;border-radius:20px;">{score}</span></td></tr>'
        )
    return (
        _section_label("💎 Top-rated this week")
        + f'<tr><td style="padding:0 24px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" '
        f'style="font-size:13px;">{"".join(rows)}</table></td></tr>'
    )


def _dividends_block(top_dividends: Optional[list[dict]], upcoming: Optional[list[dict]]) -> str:
    """Two columns: highest yields + soonest record dates."""
    parts: list[tuple[str, str]] = []
    if top_dividends:
        rows = "".join(
            f'{d["code"]}<span style="float:right;color:{WARM_TX};font-weight:700;">{d["yield_pct"]:.1f}%</span><br>'
            for d in top_dividends[:3]
        )
        parts.append(("yields", rows))
    if upcoming:
        lines = []
        for u in upcoming[:3]:
            cash = u.get("cash_pct")
            cash_str = f"{int(round(cash))}% cash " if cash else ""
            rd = u.get("record_date")
            rd_str = f"{rd.day} {rd.strftime('%b')}" if rd else ""
            lines.append(f'<b>{u["code"]}</b> {cash_str}— <b>{rd_str}</b>')
        parts.append(("record", "<br>".join(lines)))
    if not parts:
        return ""
    w = round(100 / len(parts))
    cells = ""
    for kind, content in parts:
        if kind == "yields":
            cells += (
                f'<td width="{w}%" valign="top" style="background:{SURFACE};border:1px solid {BORDER};border-radius:8px;padding:10px 12px;">'
                f'<div style="font-size:11px;font-weight:700;color:{TEXT};margin-bottom:4px;">Top dividend yields</div>'
                f'<div style="font-size:12px;color:{TEXT};line-height:1.9;">{content}</div></td>'
            )
        else:
            cells += (
                f'<td width="{w}%" valign="top" style="background:{WARM_BG};border-radius:8px;padding:10px 12px;">'
                f'<div style="font-size:11px;font-weight:700;color:{WARM_TX};margin-bottom:4px;">⏰ Record date soon</div>'
                f'<div style="font-size:12px;color:{TEXT};line-height:1.6;">{content}</div></td>'
            )
    return (
        f'<tr><td style="padding:12px 24px 4px;">'
        f'<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:separate;border-spacing:6px;">'
        f'<tr>{cells}</tr></table></td></tr>'
    )


def _sectors_block(sectors: Optional[list[dict]]) -> str:
    if not sectors:
        return ""
    top = sectors[:3]
    max_abs = max((abs(s.get("avg_change_pct") or 0) for s in top), default=0) or 1
    rows = ""
    for s in top:
        chg = s.get("avg_change_pct") or 0
        color = POS if chg >= 0 else NEG
        bar = POS_BG if chg >= 0 else "#FCEBEB"
        width = max(12, round(abs(chg) / max_abs * 100))
        sign = "+" if chg >= 0 else "−"
        rows += (
            f'<div style="font-size:12px;color:{TEXT};">{s.get("sector") or "Other"}'
            f'<span style="float:right;color:{color};font-weight:700;">{sign}{abs(chg):.1f}%</span></div>'
            f'<div style="background:{bar};height:5px;border-radius:3px;width:{width}%;margin:2px 0 8px;"></div>'
        )
    return (
        f'<tr><td style="padding:12px 24px 4px;">'
        f'<div style="font-size:13px;font-weight:700;color:{TEXT};text-transform:uppercase;letter-spacing:.4px;margin-bottom:6px;">Strongest sectors today</div>'
        f'{rows}</td></tr>'
    )


def _most_watched_block(mw: Optional[list[dict]]) -> str:
    if not mw:
        return ""
    chips = "".join(
        f'<span style="display:inline-block;background:{SURFACE};border:1px solid {BORDER};border-radius:20px;'
        f'padding:5px 11px;margin:0 6px 6px 0;font-size:12px;color:{TEXT};">'
        f'<b>{m["code"]}</b>{_chg_inline(m.get("change_pct"))}</span>'
        for m in mw[:6] if m.get("code")
    )
    if not chips:
        return ""
    return (
        f'<tr><td style="padding:12px 24px 4px;">'
        f'<div style="font-size:13px;font-weight:700;color:{TEXT};text-transform:uppercase;letter-spacing:.4px;margin-bottom:6px;">What investors are watching</div>'
        f'<div>{chips}</div></td></tr>'
    )


def _watchlist_table(rows: list[dict]) -> str:
    if not rows:
        return ""
    body = []
    last = len(rows) - 1
    for i, r in enumerate(rows):
        border = "" if i == last else f"border-bottom:1px solid {CELL};"
        badge = _badge(r["badge_text"], r["badge_kind"]) if r.get("badge_text") else f'<span style="color:{MUTED};font-size:11px;">—</span>'
        name = (r.get("company_name") or "")[:26]
        body.append(f"""
          <tr style="{border}">
            <td style="padding:10px 0;"><span style="font-weight:700;color:{TEXT};">{r['code']}</span><div style="font-size:11px;color:{MUTED};">{name}</div></td>
            <td style="text-align:right;color:{TEXT};white-space:nowrap;">{_money(r.get('ltp'))}</td>
            <td style="text-align:right;white-space:nowrap;padding-left:8px;">{_chg_span(r.get('change_pct'))}</td>
            <td style="text-align:right;padding-left:8px;">{badge}</td>
          </tr>""")
    return f"""
    <tr><td style="padding:6px 24px 2px;">
      <div style="font-size:13px;font-weight:700;color:{TEXT};text-transform:uppercase;letter-spacing:.4px;">Your watchlist</div>
    </td></tr>
    <tr><td style="padding:0 24px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-size:14px;">
        {''.join(body)}
      </table>
    </td></tr>"""


def _portfolio_block(pf: dict) -> str:
    value = pf.get("value")
    pnl = pf.get("pnl")
    pnl_pct = pf.get("pnl_pct")
    pos = (pnl or 0) >= 0
    pnl_color = POS if pos else NEG
    arrow = "▲" if pos else "▼"
    pnl_line = ""
    if pnl is not None:
        pct = f" ({pnl_pct:+.1f}%)" if pnl_pct is not None else ""
        pnl_line = f'<span style="color:{pnl_color};font-weight:700;font-size:14px;">{arrow} {_signed_money(pnl)}{pct}</span>'

    mover = pf.get("biggest_mover")
    mover_html = ""
    if mover:
        mover_html = f"""
          <div style="font-size:13px;color:{TEXT2};margin-top:8px;">Biggest move: <b>{mover['code']}</b> {_chg_span(mover.get('change_pct'))}</div>"""

    return f"""
    <tr><td style="padding:6px 24px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:{SURFACE};border:1px solid {BORDER};border-radius:10px;">
        <tr><td style="padding:16px 18px;">
          <div style="font-size:13px;font-weight:700;color:{TEXT};text-transform:uppercase;letter-spacing:.4px;">Your portfolio</div>
          <div style="margin-top:6px;"><span style="font-size:24px;font-weight:700;color:{TEXT};">{_money(value)}</span></div>
          <div style="margin-top:2px;">{pnl_line}</div>
          {mover_html}
        </td></tr>
      </table>
    </td></tr>"""


# ---------------------------------------------------------------------------
# Top-level builder
# ---------------------------------------------------------------------------

def build_html(
    *,
    segment: str,
    name: Optional[str],
    weeks_away: Optional[int],
    preheader: str,
    pulse: dict,
    top_rated: list[dict],
    top_rated_count: Optional[int],
    watchlist_rows: Optional[list[dict]] = None,
    portfolio: Optional[dict] = None,
    recap: Optional[dict] = None,
    top_dividends: Optional[list[dict]] = None,
    upcoming_dividends: Optional[list[dict]] = None,
    sectors: Optional[list[dict]] = None,
    most_watched: Optional[list[dict]] = None,
    cta_text: str,
    cta_url: str,
    unsubscribe_url: str,
    pixel_url: str,
) -> str:
    """Assemble the full HTML email document for one user."""
    greeting_name = (name or "there").strip() or "there"
    if weeks_away and weeks_away >= 2:
        away = f"It's been about <b>{weeks_away} weeks</b> since your last visit — and the market didn't wait. "
    else:
        away = "Here's what's been moving on the Dhaka Stock Exchange. "

    sections = [_recap_block(recap) if recap else _pulse_block(pulse)]
    if segment == "portfolio" and portfolio:
        sections.append(_portfolio_block(portfolio))
    elif segment == "watchlist" and watchlist_rows:
        sections.append(_watchlist_table(watchlist_rows))
    sections.append(_top_rated_card(top_rated))
    sections.append(_dividends_block(top_dividends, upcoming_dividends))
    sections.append(_sectors_block(sectors))
    sections.append(_most_watched_block(most_watched))
    inner = "".join(s for s in sections if s)

    return f"""<!DOCTYPE html>
<html lang="en"><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light only">
<title>TopStock BD</title>
</head>
<body style="margin:0;padding:0;background:{BG};">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:{BG};font-size:1px;line-height:1px;">{preheader}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:{BG};font-family:{_FONT};">
  <tr><td align="center" style="padding:18px 12px;">
    <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:{BG};border:1px solid {BORDER};border-radius:12px;overflow:hidden;">

      <tr><td style="background:{SURFACE};padding:18px 24px;border-bottom:1px solid {BORDER};">
        <span style="font-size:18px;font-weight:800;color:{INDIGO};letter-spacing:.3px;">TopStock</span><span style="font-size:18px;font-weight:800;color:{MUTED};"> BD</span>
        <div style="font-size:12px;color:{MUTED};margin-top:2px;">Dhaka Stock Exchange, decoded</div>
      </td></tr>

      <tr><td style="padding:22px 24px 6px;">
        <div style="font-size:19px;font-weight:700;color:{TEXT};">Hi {greeting_name} 👋</div>
        <div style="font-size:14px;color:{TEXT2};line-height:1.6;margin-top:6px;">{away}Here's what's happening with the stocks you care about.</div>
      </td></tr>

      {inner}

      <tr><td style="padding:18px 24px 8px;" align="center">
        <a href="{cta_url}" style="display:inline-block;background:{INDIGO};color:#ffffff;font-size:15px;font-weight:700;text-decoration:none;padding:13px 30px;border-radius:8px;">{cta_text} →</a>
        <div style="font-size:12px;color:{MUTED};margin-top:10px;">Free · takes 5 seconds · no app to install</div>
      </td></tr>

      <tr><td style="padding:16px 24px 22px;border-top:1px solid {BORDER};">
        <div style="font-size:11px;color:{MUTED};line-height:1.6;">Educational data only — not investment advice. You're receiving this because you have a TopStock BD account.</div>
        <div style="font-size:11px;color:{MUTED};margin-top:8px;"><a href="{unsubscribe_url}" style="color:{INDIGO};text-decoration:underline;">Unsubscribe</a> · topstockbd.com</div>
      </td></tr>

    </table>
  </td></tr>
</table>
<img src="{pixel_url}" width="1" height="1" alt="" style="display:block;border:0;width:1px;height:1px;">
</body></html>"""


# ===========================================================================
# Daily market email — ONE shared email (not personalized) sent to lapsed
# power users. The content is identical for everyone; only the per-user
# unsubscribe + open-pixel links differ. The `content` dict is assembled once
# per day in daily_email_service.build_daily_content(); this just formats it.
# ===========================================================================

_STRONG_BADGE = (INDIGO, "#FFFFFF")
_BUY_BADGE = (INDIGO_BG, INDIGO_DARK)
# One accent per story slot so the three cards read as three different things.
_STORY_TONE = {
    "strongest": (INDIGO_BG, INDIGO_DARK),
    "dividend": (WARM_BG, WARM_TX),
    "growth": (POS_BG, POS_TX),
}
# Include Bengali-capable fonts up front so the tagline renders on clients that
# have them (falls back to the client's system Bengali font otherwise).
_BN_FONT = "'Noto Sans Bengali','Hind Siliguri'," + _FONT


def _bn_line(text: str, *, size: int = 13, color: str = TEXT2, pad_top: int = 6) -> str:
    """One Bengali line. Bengali needs its own font stack or it renders as boxes."""
    return (
        f'<div lang="bn" style="font-family:{_BN_FONT};font-size:{size}px;color:{color};'
        f'line-height:1.75;margin-top:{pad_top}px;">{_esc(text)}</div>'
    )


def _turnover_str(cr: Optional[float]) -> str:
    return f"৳{cr:,.0f}cr" if cr else "—"


def _daily_glance(m: dict) -> str:
    """Three tiles: index, turnover, breadth — each with a day-over-day delta,
    plus the week's move underneath so one red day isn't read as a trend."""
    up, down = m.get("up"), m.get("down")
    breadth = f"{up}/{down}" if up is not None and down is not None else "—"
    dsex = m.get("dsex")
    cells = [
        ("Market index", f"{dsex:,.0f}" if dsex else "—", _chg_span(m.get("dsex_chg"))),
        ("Money traded", _turnover_str(m.get("turnover_cr")), _chg_span(m.get("turnover_chg"))),
        ("Up vs down", breadth, f'<span style="color:{MUTED};font-size:11px;">stocks</span>'),
    ]
    tds = "".join(
        f'<td width="33%" valign="top" style="background:{CELL};border-radius:8px;padding:10px 8px;">'
        f'<div style="font-size:10px;color:{MUTED};text-transform:uppercase;letter-spacing:.3px;">{label}</div>'
        f'<div style="font-size:16px;font-weight:700;color:{TEXT};margin-top:3px;">{big}</div>'
        f'<div style="font-size:12px;margin-top:1px;">{sub}</div></td>'
        for (label, big, sub) in cells
    )
    wk = m.get("week_chg")
    wk_row = ""
    if wk is not None:
        colour = POS if wk >= 0 else NEG
        wk_row = (
            f'<tr><td style="padding:2px 24px 0;font-size:12px;color:{MUTED};">'
            f'Over the past week the index is '
            f'<b style="color:{colour};">{"up" if wk >= 0 else "down"} {abs(wk):.1f}%</b>.</td></tr>'
        )
    return (
        _section_label("The market in one glance")
        + f'<tr><td style="padding:0 24px 4px;">'
        f'<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:separate;border-spacing:6px;">'
        f'<tr>{tds}</tr></table></td></tr>'
        + wk_row
    )


def _daily_story(story: Optional[dict]) -> str:
    """The lede — three plain sentences about the day, then the Bengali line.
    This is what makes the mail read like a paper instead of a dashboard."""
    if not story or not story.get("lines"):
        return ""
    lines = story["lines"]
    body = (
        f'<div style="font-size:15px;font-weight:600;color:{TEXT};line-height:1.6;">{_esc(lines[0])}</div>'
    )
    for extra in lines[1:]:
        body += (
            f'<div style="font-size:14px;color:{TEXT2};line-height:1.65;margin-top:7px;">{_esc(extra)}</div>'
        )
    if story.get("bn"):
        body += _bn_line(story["bn"], size=13, pad_top=10)
    return (
        _section_label("Today's story")
        + f'<tr><td style="padding:0 24px 2px;">'
        f'<table role="presentation" width="100%" cellpadding="0" cellspacing="0" '
        f'style="background:{SURFACE};border:1px solid {BORDER};border-radius:10px;">'
        f'<tr><td style="padding:14px 16px;">{body}</td></tr></table></td></tr>'
    )


def _daily_stories(stories: list[dict]) -> str:
    """Three stocks worth knowing — one per slot, so no two cards say the same
    thing. Stacked rather than columned: three columns collapse badly on a phone."""
    if not stories:
        return ""
    cards = []
    for s in stories:
        bg, fg = _STORY_TONE.get(s.get("key"), (INDIGO_BG, INDIGO_DARK))
        code, url = s.get("code"), s.get("url")
        code_html = (f'<a href="{url}" style="color:{INDIGO};text-decoration:none;">{code}</a>'
                     if url else code)
        chip = (
            f'<span style="display:inline-block;font-size:11px;font-weight:700;background:{bg};'
            f'color:{fg};padding:3px 10px;border-radius:20px;">{s.get("glyph", "")} {_esc(s.get("label") or "")}</span>'
        )
        metric = ""
        if s.get("metric_value"):
            metric = (
                f'<span style="display:inline-block;font-size:11px;background:{CELL};color:{TEXT2};'
                f'padding:3px 9px;border-radius:20px;margin-right:6px;">'
                f'{_esc(s.get("metric_label") or "")} <b style="color:{TEXT};">{_esc(s["metric_value"])}</b></span>'
            )
        reason = ""
        if s.get("reason_en"):
            reason = (f'<div style="font-size:12px;color:{MUTED};line-height:1.5;margin-top:6px;">'
                      f'{_esc(s["reason_en"])}</div>')
        cards.append(
            f'<table role="presentation" width="100%" cellpadding="0" cellspacing="0" '
            f'style="background:{SURFACE};border:1px solid {BORDER};border-left:3px solid {fg};'
            f'border-radius:10px;margin-bottom:8px;">'
            f'<tr><td style="padding:12px 14px;">'
            f'<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>'
            f'<td>{chip}</td>'
            f'<td style="text-align:right;white-space:nowrap;font-size:13px;color:{TEXT};font-weight:700;">'
            f'{_money(s.get("ltp"))}{_chg_inline(s.get("change_pct"))}</td></tr></table>'
            f'<div style="font-size:15px;font-weight:700;color:{TEXT};margin-top:8px;">{code_html} '
            f'<span style="font-size:11px;font-weight:400;color:{MUTED};">{_esc((s.get("name") or "")[:26])}</span></div>'
            f'<div style="font-size:14px;color:{TEXT2};line-height:1.55;margin-top:4px;">{_esc(s.get("headline") or "")}</div>'
            f'<div style="margin-top:8px;">{metric}</div>{reason}'
            f'</td></tr></table>'
        )
    return (
        _section_label("Three worth knowing today")
        + f'<tr><td style="padding:0 24px 2px;color:{TEXT2};font-size:12px;">'
        f'Each one answers a different question — and they change every day.</td></tr>'
        + f'<tr><td style="padding:8px 24px 0;">{"".join(cards)}</td></tr>'
    )


def _daily_personal(personal: Optional[dict]) -> str:
    """The one block written for this reader alone: their own biggest movers."""
    if not personal or not personal.get("items"):
        return ""
    rows = []
    items = personal["items"]
    last = len(items) - 1
    for i, it in enumerate(items):
        border = "" if i == last else f"border-bottom:1px solid {CELL};"
        code, url = it.get("code"), it.get("url")
        code_html = (f'<a href="{url}" style="color:{INDIGO};text-decoration:none;font-weight:700;">{code}</a>'
                     if url else f'<b>{code}</b>')
        sig = it.get("signal")
        chip = ""
        if sig in ("buy", "sell"):
            bg, fg = (POS_BG, POS_TX) if sig == "buy" else (NEG_BG, NEG)
            chip = (f'<span style="font-size:10px;font-weight:700;background:{bg};color:{fg};'
                    f'padding:2px 8px;border-radius:20px;margin-left:6px;">{sig.title()}</span>')
        rows.append(
            f'<tr style="{border}"><td style="padding:9px 0;font-size:13px;">{code_html}'
            f'<span style="color:{MUTED};font-size:11px;"> {_esc(it.get("name") or "")}</span>{chip}</td>'
            f'<td style="text-align:right;white-space:nowrap;font-size:13px;color:{TEXT};padding:9px 0;">'
            f'{_money(it.get("ltp"))}{_chg_inline(it.get("change_pct"))}</td></tr>'
        )
    note = ""
    if personal.get("quiet"):
        note = (f'<div style="font-size:12px;color:{MUTED};margin-top:8px;">'
                f'A quiet day on your list — no big moves.</div>')
    elif personal.get("total", 0) > len(items):
        note = (f'<div style="font-size:12px;color:{MUTED};margin-top:8px;">'
                f'Your biggest movers out of {personal["total"]} stocks you follow.</div>')
    return (
        _section_label("Your stocks today")
        + f'<tr><td style="padding:0 24px 2px;">'
        f'<table role="presentation" width="100%" cellpadding="0" cellspacing="0" '
        f'style="background:{INDIGO_BG};border-radius:10px;"><tr><td style="padding:10px 14px;">'
        f'<table role="presentation" width="100%" cellpadding="0" cellspacing="0">{"".join(rows)}</table>'
        f'{note}</td></tr></table></td></tr>'
    )


def _daily_buys(buys: list[dict], total: int = 0) -> str:
    """Today's Buy-signal stocks (strong ones first), each a bordered card.
    A "New today" chip marks what actually changed — buy signals are sticky, so
    without it the same codes read as fresh news every morning."""
    if not buys:
        return ""
    cards = []
    for b in buys:
        strong = b.get("strength") == "strong"
        bg, fg = _STRONG_BADGE if strong else _BUY_BADGE
        label = "Strong buy" if strong else "Buy"
        name = (b.get("name") or "")[:26]
        code = b.get("code")
        url = b.get("url")
        code_html = f'<a href="{url}" style="color:{INDIGO};text-decoration:none;">{code}</a>' if url else code
        reason = b.get("reason_en") or ""
        new_chip = (
            f'<span style="display:inline-block;margin-left:6px;font-size:11px;font-weight:700;'
            f'background:{POS_BG};color:{POS_TX};padding:3px 9px;border-radius:20px;">New today</span>'
            if b.get("is_new") else ""
        )
        cards.append(
            f'<table role="presentation" width="100%" cellpadding="0" cellspacing="0" '
            f'style="background:{SURFACE};border:1px solid {BORDER};border-radius:10px;margin-bottom:8px;">'
            f'<tr><td style="padding:12px 14px;">'
            f'<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>'
            f'<td style="font-size:15px;font-weight:700;">{code_html} '
            f'<span style="font-size:11px;font-weight:400;color:{MUTED};">{_esc(name)}</span></td>'
            f'<td style="text-align:right;white-space:nowrap;font-size:14px;color:{TEXT};font-weight:700;">'
            f'{_money(b.get("ltp"))}{_chg_inline(b.get("change_pct"))}</td>'
            f'</tr></table>'
            f'<div style="font-size:13px;color:{TEXT2};line-height:1.5;margin-top:5px;">{_esc(reason)}</div>'
            f'<span style="display:inline-block;margin-top:8px;font-size:11px;font-weight:700;'
            f'background:{bg};color:{fg};padding:3px 10px;border-radius:20px;">{label}</span>{new_chip}'
            f'</td></tr></table>'
        )
    more = ""
    if total > len(buys):
        more = (f'<div style="font-size:12px;color:{MUTED};padding:2px 0 4px;">'
                f'{total - len(buys)} more stocks carry a buy signal today.</div>')
    return (
        _section_label("Today's buys")
        + f'<tr><td style="padding:0 24px 2px;color:{TEXT2};font-size:12px;">'
        f"Our system's strongest picks after today's close</td></tr>"
        + f'<tr><td style="padding:8px 24px 0;">{"".join(cards)}{more}</td></tr>'
    )


def _daily_learn(learn: Optional[dict]) -> str:
    """One concept, taught off a real stock in today's data — the block that
    makes the mail worth opening on a day when nothing moved."""
    if not learn or not learn.get("concept"):
        return ""
    body = f'<div style="font-size:14px;color:{TEXT};line-height:1.6;">{_esc(learn["concept"])}</div>'
    if learn.get("concept_bn"):
        body += _bn_line(learn["concept_bn"], size=13, pad_top=8)
    if learn.get("code"):
        fact = ""
        if learn.get("fact_value"):
            fact = (f' — <b style="color:{WARM_TX};">{_esc(str(learn["fact_value"]))}</b>'
                    f' {_esc((learn.get("fact_label") or "").lower())}')
        code_html = (f'<a href="{learn["url"]}" style="color:{INDIGO};text-decoration:none;font-weight:700;">'
                     f'{learn["code"]}</a>' if learn.get("url") else f'<b>{learn["code"]}</b>')
        body += (f'<div style="font-size:12px;color:{MUTED};margin-top:10px;">'
                 f'Seen today in {code_html}{fact}</div>')
    return (
        _section_label("One thing worth knowing")
        + f'<tr><td style="padding:0 24px 2px;">'
        f'<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:{WARM_BG};border-radius:10px;">'
        f'<tr><td style="padding:13px 15px;">{body}</td></tr></table></td></tr>'
    )


def _rot_rows(items: list[dict]) -> str:
    rows = []
    last = len(items) - 1
    for i, it in enumerate(items):
        border = "" if i == last else f"border-bottom:1px solid {CELL};"
        left = it.get("left") or ""
        url = it.get("url")
        left_html = (f'<a href="{url}" style="color:{INDIGO};text-decoration:none;font-weight:700;">{_esc(left)}</a>'
                     if url else f'<b style="color:{TEXT};">{_esc(left)}</b>')
        sub = (f'<span style="color:{MUTED};font-size:11px;"> {_esc(it["sub"])}</span>'
               if it.get("sub") else "")
        note = (f'<div style="font-size:11px;color:{MUTED};margin-top:2px;">{_esc(it["note"])}</div>'
                if it.get("note") else "")
        tone = it.get("tone")
        colour = {"pos": POS, "neg": NEG, "warm": WARM_TX}.get(tone, TEXT)
        rows.append(
            f'<tr style="{border}"><td style="padding:9px 0;font-size:13px;">{left_html}{sub}{note}</td>'
            f'<td style="text-align:right;white-space:nowrap;padding:9px 0;font-size:13px;'
            f'font-weight:700;color:{colour};">{_esc(str(it.get("right") or ""))}</td></tr>'
        )
    return f'<table role="presentation" width="100%" cellpadding="0" cellspacing="0">{"".join(rows)}</table>'


def _daily_rotating(rot: Optional[dict]) -> str:
    """The angle of the day — a different one each weekday, so five straight
    days of this mail never show the same middle block twice."""
    if not rot:
        return ""
    inner = ""
    if rot.get("prose"):
        p = rot["prose"]
        if p.get("headline"):
            inner += f'<div style="font-size:15px;font-weight:700;color:{TEXT};line-height:1.5;">{_esc(p["headline"])}</div>'
        if p.get("bottom_line"):
            inner += f'<div style="font-size:13px;color:{TEXT2};line-height:1.6;margin-top:7px;">{_esc(p["bottom_line"])}</div>'
        if p.get("bottom_line_bn"):
            inner += _bn_line(p["bottom_line_bn"], size=13, pad_top=8)
    elif rot.get("items"):
        inner = _rot_rows(rot["items"])
    if not inner:
        return ""

    sub = (f'<tr><td style="padding:0 24px 2px;color:{TEXT2};font-size:12px;">{_esc(rot["subtitle"])}</td></tr>'
           if rot.get("subtitle") else "")
    bn = (f'<tr><td style="padding:2px 24px 0;">{_bn_line(rot["bn"], size=12, pad_top=0)}</td></tr>'
          if rot.get("bn") else "")
    more = ""
    if rot.get("more_url") and rot.get("more_text"):
        more = (f'<div style="margin-top:10px;"><a href="{rot["more_url"]}" '
                f'style="font-size:12px;color:{INDIGO};text-decoration:none;font-weight:700;">'
                f'{_esc(rot["more_text"])} →</a></div>')
    return (
        _section_label(rot.get("title") or "Also today")
        + sub + bn
        + f'<tr><td style="padding:8px 24px 0;">'
        f'<table role="presentation" width="100%" cellpadding="0" cellspacing="0" '
        f'style="background:{SURFACE};border:1px solid {BORDER};border-radius:10px;">'
        f'<tr><td style="padding:10px 14px;">{inner}{more}</td></tr></table></td></tr>'
    )


def _daily_headlines(items: list[dict]) -> str:
    """Three company headlines — cheap to build, and the thing that makes the
    mail feel like today rather than a monthly summary."""
    if not items:
        return ""
    rows = []
    last = len(items) - 1
    for i, n in enumerate(items):
        border = "" if i == last else f"border-bottom:1px solid {CELL};"
        title = _esc(n.get("title") or "")
        url = n.get("url")
        title_html = (f'<a href="{url}" style="color:{TEXT};text-decoration:none;">{title}</a>'
                      if url else title)
        meta = " · ".join(x for x in [n.get("code"), n.get("when")] if x)
        rows.append(
            f'<tr style="{border}"><td style="padding:9px 0;">'
            f'<div style="font-size:13px;color:{TEXT};line-height:1.5;">{title_html}</div>'
            f'<div style="font-size:11px;color:{MUTED};margin-top:2px;">{_esc(meta)}</div></td></tr>'
        )
    return (
        _section_label("In the news")
        + f'<tr><td style="padding:0 24px 2px;">'
        f'<table role="presentation" width="100%" cellpadding="0" cellspacing="0">{"".join(rows)}</table>'
        f'</td></tr>'
    )


def _daily_scorecard(sc: Optional[dict]) -> str:
    """Green 'how our last picks did' strip — the trust-builder."""
    if not sc or not sc.get("items"):
        return ""
    bits = []
    for it in sc["items"]:
        chg = it.get("change_pct")
        if chg is None:
            bits.append(it["code"])
        else:
            bits.append(f'{it["code"]} {"+" if chg >= 0 else "−"}{abs(chg):.1f}%')
    line = " · ".join(bits)
    up, total = sc.get("up_count"), sc.get("total")
    tail = f" · {up} of {total} up" if up is not None and total else ""
    label = sc.get("date_label")
    head = f"How our {label} picks did" if label else "How yesterday's picks did"
    rec = sc.get("record")
    rec_line = ""
    if rec and rec.get("total"):
        rec_line = (
            f'<div style="font-size:12px;color:{POS_TX};margin-top:6px;opacity:.9;">'
            f'Across the last {rec["emails"]} emails, {rec["up"]} of {rec["total"]} featured picks '
            f'are higher now than when we showed them.</div>'
        )
    return (
        f'<tr><td style="padding:10px 24px 4px;">'
        f'<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:{POS_BG};border-radius:10px;">'
        f'<tr><td style="padding:12px 14px;">'
        f'<div style="font-size:12px;font-weight:700;color:{POS_TX};">{head}</div>'
        f'<div style="font-size:13px;color:{POS_TX};margin-top:4px;line-height:1.5;">{line} — one day later{tail}.</div>'
        f'{rec_line}'
        f'</td></tr></table></td></tr>'
    )


def build_daily_html(*, content: dict, unsubscribe_url: str, pixel_url: str,
                     personal: Optional[dict] = None) -> str:
    """Assemble the full daily email. `content` is shared across all recipients;
    `personal` (their own movers), unsubscribe_url and pixel_url are per-user."""
    preheader = content.get("preheader", "")
    date_label = content.get("date_label", "")
    mood = content.get("mood", "")
    mood_kind = content.get("mood_kind")
    tagline_bn = content.get("bengali_tagline", "")
    cta_text = content.get("cta_text", "See today's market")
    cta_url = content.get("cta_url", "#")

    pill_bg, pill_fg = {"pos": ("rgba(255,255,255,0.18)", "#ffffff"),
                        "neg": ("rgba(255,255,255,0.18)", "#ffffff")}.get(mood_kind, ("rgba(255,255,255,0.16)", "#ffffff"))
    mood_pill = (
        f'<div style="display:inline-block;margin-top:10px;background:{pill_bg};color:{pill_fg};'
        f'font-size:12px;padding:4px 11px;border-radius:20px;">{mood}</div>' if mood else ""
    )
    tagline_row = (
        f'<tr><td style="padding:14px 24px 2px;"><div style="font-size:14px;color:{TEXT2};'
        f'line-height:1.7;font-family:{_BN_FONT};">{tagline_bn}</div></td></tr>' if tagline_bn else ""
    )

    # Order matters: the day's narrative, then the numbers, then the reader's
    # own stocks, then what to look at, then something to learn, then the news.
    inner = "".join(s for s in [
        _daily_story(content.get("story")),
        _daily_glance(content.get("market") or {}),
        _daily_personal(personal),
        _daily_stories(content.get("stories") or []),
        _daily_buys(content.get("buys") or [], content.get("buys_total") or 0),
        _daily_learn(content.get("learn")),
        _daily_rotating(content.get("rotating")),
        _daily_headlines(content.get("headlines") or []),
        _daily_scorecard(content.get("scorecard")),
    ] if s)

    return f"""<!DOCTYPE html>
<html lang="en"><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light only">
<title>TopStock Daily</title>
</head>
<body style="margin:0;padding:0;background:{BG};">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:{BG};font-size:1px;line-height:1px;">{preheader}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:{BG};font-family:{_FONT};">
  <tr><td align="center" style="padding:18px 12px;">
    <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:{BG};border:1px solid {BORDER};border-radius:12px;overflow:hidden;">

      <tr><td style="background:{INDIGO};padding:18px 24px;">
        <div style="font-size:19px;font-weight:800;color:#ffffff;letter-spacing:.3px;">TopStock Daily</div>
        <div style="font-size:12px;color:#C7C2F5;margin-top:3px;">{date_label} · Dhaka Stock Exchange</div>
        {mood_pill}
      </td></tr>

      {tagline_row}

      {inner}

      <tr><td style="padding:20px 24px 8px;" align="center">
        <a href="{cta_url}" style="display:inline-block;background:{INDIGO};color:#ffffff;font-size:15px;font-weight:700;text-decoration:none;padding:13px 30px;border-radius:8px;">{cta_text} →</a>
      </td></tr>

      <tr><td style="padding:16px 24px 22px;border-top:1px solid {BORDER};">
        <div style="font-size:11px;color:{MUTED};line-height:1.6;">You're receiving this because you have a watchlist or portfolio on TopStock BD. Prices are for information only, not investment advice.</div>
        <div style="font-size:11px;color:{MUTED};margin-top:8px;"><a href="{unsubscribe_url}" style="color:{INDIGO};text-decoration:underline;">Unsubscribe</a> · topstockbd.com</div>
      </td></tr>

    </table>
  </td></tr>
</table>
<img src="{pixel_url}" width="1" height="1" alt="" style="display:block;border:0;width:1px;height:1px;">
</body></html>"""
