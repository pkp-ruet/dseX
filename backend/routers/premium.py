from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from backend.routers.auth import get_current_user
from backend.services import payments
from backend.services.auth_service import get_user_by_id, public_user

router = APIRouter(prefix="/api/user/premium", tags=["premium"])
public_router = APIRouter(prefix="/api/premium", tags=["premium"])


@public_router.get("/plans")
def plans():
    """The paid plans and where to send the money (only methods with a number)."""
    nums = payments.receiving_numbers()
    return {
        "plans": [{"key": k, **v} for k, v in payments.PAID_PLANS.items()],
        "methods": [{"key": k, "number": v} for k, v in nums.items()],
    }


class PaymentBody(BaseModel):
    plan: str = Field(..., max_length=20)
    method: str = Field(..., max_length=10)
    sender: str = Field(..., max_length=30)


@router.post("/payments")
def submit_payment(body: PaymentBody, current_user: dict = Depends(get_current_user)):
    """The reader has sent the money. Premium starts now (unless an earlier
    payment of theirs was revoked); an admin checks it later. 409 while an
    earlier payment is still waiting to be checked, 422 on bad input."""
    try:
        doc = payments.submit_payment(current_user, body.plan, body.method, body.sender)
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
