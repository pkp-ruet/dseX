from fastapi import APIRouter, Depends, HTTPException
from typing import Literal

from pydantic import BaseModel, Field

from backend.routers.auth import get_current_user
from backend.services import banner_events, payments
from backend.services.auth_service import get_user_by_id, public_user
from backend.services.db_service import get_db

router = APIRouter(prefix="/api/user/premium", tags=["premium"])
public_router = APIRouter(prefix="/api/premium", tags=["premium"])


@public_router.get("/plans")
def plans():
    """The paid plans and where to send the money (only methods that are set
    up: bKash / Nagad with a number, the bank with its name + account)."""
    return {
        "plans": [{"key": k, **v} for k, v in payments.PAID_PLANS.items()],
        "methods": payments.receiving_methods(),
        # The reader's own ৳99 month while an admin keeps it open (the
        # homepage banner reads this for guests), else null.
        "own_offer": {"key": payments.OWN_OFFER_KEY, **payments.OWN_OFFER}
        if payments.offer_open() else None,
    }


class PaymentBody(BaseModel):
    plan: str = Field(..., max_length=20)
    method: str = Field(..., max_length=10)
    # bKash / Nagad: the number the money came from.
    sender: str = Field("", max_length=30)
    # Bank transfer: npsb / beftn, the sending account's last 4 digits, and
    # the reference written on the transfer (optional).
    transfer: str = Field("", max_length=10)
    account_last4: str = Field("", max_length=10)
    reference: str = Field("", max_length=80)


@router.post("/payments")
def submit_payment(body: PaymentBody, current_user: dict = Depends(get_current_user)):
    """The reader has sent the money. Premium starts now (unless an earlier
    payment of theirs was revoked); an admin checks it later. 409 while an
    earlier payment is still waiting to be checked, 422 on bad input."""
    try:
        doc = payments.submit_payment(current_user, body.plan, body.method, body.sender,
                                      body.transfer, body.account_last4, body.reference)
    except ValueError as e:
        code = str(e)
        status = 409 if code in (payments.ERR_PENDING, payments.ERR_OFFER) else 422
        raise HTTPException(status_code=status, detail=code)
    return {
        "payment": payments.public_payment(doc),
        "user": public_user(get_user_by_id(current_user["user_id"])),
    }


@router.get("/payments")
def my_payments(current_user: dict = Depends(get_current_user)):
    uid = current_user["user_id"]
    return {"ref_code": payments.ref_code(uid), "items": payments.user_payments(uid)}


@router.get("/renewal")
def renewal(current_user: dict = Depends(get_current_user)):
    """The renewal banner (Premium ends within 10 days): the yearly plan and
    the date it would run to, what Premium found in the last 30 days, and what
    the reader set up that a free account limits. `renewal` is null when the
    banner shouldn't show."""
    return {"renewal": payments.renewal_state(current_user["user_id"])}


class OfferDismissBody(BaseModel):
    action: Literal["never", "later"]


@router.post("/offer")
def dismiss_offer(body: OfferDismissBody, current_user: dict = Depends(get_current_user)):
    """The offer banner's "Not interested" (`never`) or "Remind me later"
    (`later`, hidden for a few days). The offer itself stays in the pay box
    until it ends."""
    payments.dismiss_offer(current_user["user_id"], body.action)
    return {"user": public_user(get_user_by_id(current_user["user_id"]))}


class BannerEventBody(BaseModel):
    action: Literal["view", "pay", "more", "later", "never"]
    banner: Literal["home"] = "home"


@router.post("/banner")
def banner_event(body: BannerEventBody, current_user: dict = Depends(get_current_user)):
    """What the reader did with the Premium banner (a view, or which button),
    counted on the admin analytics page. Best-effort: never an error."""
    try:
        banner_events.record(get_db(), current_user["user_id"], body.banner, body.action)
    except Exception:  # noqa: BLE001 — analytics must never break the page
        import logging
        logging.getLogger("premium").warning("banner event write failed", exc_info=True)
    return {"ok": True}
