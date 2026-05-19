"""PII masking helpers used before external API/LLM calls."""

import re
from collections.abc import Mapping, Sequence
from typing import Any

EMAIL_RE = re.compile(r"[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+")
PHONE_RE = re.compile(r"\d{2,3}[-\s]?\d{3,4}[-\s]?\d{4}")


def mask_pii(text: str) -> str:
    """Mask common PII from free text."""
    text = EMAIL_RE.sub("[EMAIL_REDACTED]", text)
    return PHONE_RE.sub("[PHONE_REDACTED]", text)


def mask_pii_payload(value: Any) -> Any:
    """Recursively mask PII in JSON-like payloads without mutating the input."""
    if isinstance(value, str):
        return mask_pii(value)
    if isinstance(value, Mapping):
        return {key: mask_pii_payload(item) for key, item in value.items()}
    if isinstance(value, Sequence) and not isinstance(value, bytes | bytearray):
        return [mask_pii_payload(item) for item in value]
    return value
