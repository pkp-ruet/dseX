from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from backend.routers.auth import get_current_user
from backend.services import payments
from backend.services.auth_service import get_user_by_id, public_user

router = APIRouter(prefix="/api/user/premium", tags=["premium"])
public_router = APIRouter(prefix="/api/premium", tags=["premium"])


@public_router.get("/plans")
def plans():
    """The paid plans and where to send the money (only methods that are set
    up: bKash / Nagad with a number, the bank with its name + account)."""
    return {
        "plans": [{"key": k, **v} for k, v in payments.PAID_PLANS.items()],
        "methods": payments.receiving_methods(),
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
        raise HTTPException(status_code=409 if code == payments.ERR_PENDING else 422, detail=code)
    return {
        "payment": payments.public_payment(doc),
        "user": public_user(get_user_by_id(current_user["user_id"])),
    }


@router.get("/payments")
def my_payments(current_user: dict = Depends(get_current_user)):
    uid = current_user["user_id"]
    return {"ref_code": payments.ref_code(uid), "items": payments.user_payments(uid)}
