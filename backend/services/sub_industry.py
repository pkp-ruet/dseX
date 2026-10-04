"""
Optional sub-industry for peer comparison.

DSE's sector field is coarse: a tobacco company sits in "Food & Allied" next to
biscuit makers, and the national shipping line sits in "Miscellaneous" next to
paint and feed companies. The peer table on the stock page compared them as if
they were the same business.

`SUB_INDUSTRY` overrides the peer group for companies whose business clearly
differs from the rest of their DSE sector. Everything not listed keeps its DSE
sector as the peer group. Extend the map as misfits are found — it only ever
narrows a peer group, and `peer_note` tells the reader when no like-for-like
peer exists.
"""
from typing import Optional

SUB_INDUSTRY: dict[str, str] = {
    "BATBC": "Tobacco",
    "BSC": "Shipping",
    "BERGERPBL": "Paints",
}

# DSE sectors that are catch-alls of unrelated businesses.
MIXED_SECTORS = {"miscellaneous"}

_LABEL_BN = {
    "Tobacco": "তামাক",
    "Shipping": "জাহাজ পরিবহন",
    "Paints": "রং",
}


def sub_industry(code: str) -> Optional[str]:
    return SUB_INDUSTRY.get((code or "").upper())


def peer_group_key(code: str, sector: Optional[str]) -> str:
    return sub_industry(code) or (sector or "")


def peer_note(code: str, sector: Optional[str], same_group_peers: int) -> Optional[dict]:
    """A one-line caution when the peers shown are not the same kind of business."""
    sub = sub_industry(code)
    sec = sector or "this sector"
    if sub and same_group_peers == 0:
        bn = _LABEL_BN.get(sub, sub)
        return {
            "en": f"No other listed company is in {sub.lower()}. The companies below share DSE's "
                  f"\"{sec}\" sector but run different businesses, so compare them with care.",
            "bn": f"তালিকাভুক্ত আর কোনো {bn} কোম্পানি নেই। নিচের কোম্পানিগুলো ডিএসইর একই খাতে থাকলেও "
                  f"ব্যবসা আলাদা, তাই তুলনা সাবধানে করুন।",
        }
    if (sector or "").strip().lower() in MIXED_SECTORS:
        return {
            "en": "DSE's \"Miscellaneous\" sector mixes unrelated businesses, so these companies are not "
                  "direct competitors — compare them with care.",
            "bn": "ডিএসইর \"বিবিধ\" খাতে নানা ধরনের ব্যবসা একসঙ্গে আছে, তাই এরা সরাসরি প্রতিযোগী নয় — তুলনা সাবধানে করুন।",
        }
    return None
