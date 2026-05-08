"""
Payment routes for Razorpay integration.

Flow:
  1. POST /api/payments/create-order  — frontend calls this to get a Razorpay order_id.
  2. Frontend opens Razorpay checkout with the order_id.
  3. On payment success, Razorpay returns payment_id + signature to the frontend.
  4. POST /api/payments/verify        — frontend sends those back; we verify the
                                        HMAC-SHA256 signature and mark the user as premium.
"""

import hashlib
import hmac

import razorpay
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.auth.dependencies import get_current_active_user
from app.auth.models import User
from app.config import settings
from app.database import get_db

router = APIRouter(prefix="/api/payments", tags=["payments"])

# Amount in paise (INR). 100 paise = 1 rupee.
PREMIUM_AMOUNT_PAISE = 99900    # 999.00 INR


# ── Schemas ───────────────────────────────────────────────────────────────────

class OrderResponse(BaseModel):
    order_id: str
    amount: int
    currency: str
    key_id: str


class VerifyRequest(BaseModel):
    razorpay_order_id: str
    razorpay_payment_id: str
    razorpay_signature: str


# ── Helpers ───────────────────────────────────────────────────────────────────

def _razorpay_client():
    if not settings.RAZORPAY_KEY_ID or not settings.RAZORPAY_KEY_SECRET:
        raise HTTPException(status_code=503, detail="Payment gateway not configured.")
    return razorpay.Client(
        auth=(settings.RAZORPAY_KEY_ID, settings.RAZORPAY_KEY_SECRET)
    )


def _verify_signature(order_id: str, payment_id: str, signature: str) -> bool:
    """HMAC-SHA256 verification as required by Razorpay docs."""
    message = f"{order_id}|{payment_id}".encode()
    secret  = settings.RAZORPAY_KEY_SECRET.encode()
    expected = hmac.new(secret, message, hashlib.sha256).hexdigest()
    return hmac.compare_digest(expected, signature)


# ── Routes ────────────────────────────────────────────────────────────────────

@router.post("/create-order", response_model=OrderResponse)
def create_order(
    current_user: User = Depends(get_current_active_user),
):
    """
    Create a Razorpay order for the Premium plan.
    Returns the order_id + public key_id needed by the frontend checkout.
    """
    client = _razorpay_client()
    order = client.order.create({
        "amount":   PREMIUM_AMOUNT_PAISE,
        "currency": "INR",
        "receipt":  f"user_{current_user.id}_premium",
        "notes": {
            "user_id": str(current_user.id),
            "plan":    "premium",
        },
    })
    return OrderResponse(
        order_id=order["id"],
        amount=order["amount"],
        currency=order["currency"],
        key_id=settings.RAZORPAY_KEY_ID,
    )


@router.post("/verify")
def verify_payment(
    body: VerifyRequest,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """
    Verify the Razorpay payment signature.
    On success, upgrades the user's plan to 'premium' in the DB.
    """
    if not _verify_signature(
        body.razorpay_order_id,
        body.razorpay_payment_id,
        body.razorpay_signature,
    ):
        raise HTTPException(status_code=400, detail="Payment verification failed.")

    # Upgrade the user plan. Add a `plan` column to the User model if it
    # doesn't exist yet (see migration note below).
    current_user.plan = "premium"
    db.commit()

    return {"status": "success", "plan": "premium"}
