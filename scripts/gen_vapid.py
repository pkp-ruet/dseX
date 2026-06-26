"""
Generate a VAPID keypair for web push (run once).

    python scripts/gen_vapid.py

Outputs the three env values the app needs. Set them on:
  - Render (backend):        VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT
  - GitHub Actions secrets:  VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT
  - Vercel (frontend):       NEXT_PUBLIC_VAPID_PUBLIC_KEY  (= the public key)

NEVER regenerate once live — new keys silently invalidate every existing
browser subscription. Keep the private key secret.
"""
import base64

from cryptography.hazmat.primitives.asymmetric import ec
from cryptography.hazmat.primitives import serialization


def b64(b: bytes) -> str:
    return base64.urlsafe_b64encode(b).rstrip(b"=").decode()


def main() -> None:
    priv = ec.generate_private_key(ec.SECP256R1())
    priv_raw = priv.private_numbers().private_value.to_bytes(32, "big")
    pub_raw = priv.public_key().public_bytes(
        serialization.Encoding.X962,
        serialization.PublicFormat.UncompressedPoint,
    )
    PRIV, PUB = b64(priv_raw), b64(pub_raw)

    # Self-check against the actual sender lib (pywebpush → py_vapid), if installed.
    verified = "skipped (pywebpush not installed)"
    try:
        from py_vapid import Vapid

        v = Vapid.from_string(PRIV)
        derived = b64(
            v.public_key.public_bytes(
                serialization.Encoding.X962,
                serialization.PublicFormat.UncompressedPoint,
            )
        )
        assert derived == PUB, "MISMATCH — do not use these keys"
        verified = "OK — py_vapid round-trip matches"
    except ImportError:
        pass

    print("VAPID_PRIVATE_KEY=" + PRIV)
    print("VAPID_PUBLIC_KEY=" + PUB)
    print("NEXT_PUBLIC_VAPID_PUBLIC_KEY=" + PUB)
    print("VAPID_SUBJECT=mailto:hello@topstockbd.com")
    print("# self-check:", verified)


if __name__ == "__main__":
    main()
