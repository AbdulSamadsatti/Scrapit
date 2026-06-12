"""
Shared helpers for property scrapers.

ecommerce_common.py ka real-estate version. product_payload ki jagah
listing_payload — beds/baths/area/purpose/property_type jaisi fields ke saath.
"""

import re
from decimal import Decimal, InvalidOperation
from typing import Any, Dict
import urllib.parse
from urllib.parse import urljoin


def normalize_space(value: Any) -> str:
    if value is None:
        return ""
    return re.sub(r"\s+", " ", str(value)).strip()


def decode_nextjs_image_url(url: str) -> str:
    cleaned = normalize_space(url)
    if not cleaned:
        return ""
    if "_next/image" in cleaned and "url=" in cleaned:
        try:
            parsed = urllib.parse.urlparse(cleaned)
            qs = urllib.parse.parse_qs(parsed.query)
            if "url" in qs and qs["url"]:
                return qs["url"][0]
        except Exception:
            pass
    return cleaned


def absolutize_url(url: str, base_url: str) -> str:
    url = normalize_space(url)
    if not url:
        return ""
    decoded = decode_nextjs_image_url(url)
    return urljoin(base_url, decoded)


def slugify_query(query: str) -> str:
    """'houses for sale islamabad' -> 'houses-for-sale-islamabad' (Zameen/Graana)."""
    q = normalize_space(query).lower()
    q = re.sub(r"[^a-z0-9\s-]", "", q)
    q = re.sub(r"\s+", "-", q)
    return q.strip("-")


# Pakistani property prices "Crore" / "Lakh" / "Lac" mein hote hain — un ko
# numeric PKR amount mein convert karna padta hai taake DB mein sort/filter ho sake.
_UNIT_MULTIPLIERS = {
    "crore": 10_000_000,
    "cr": 10_000_000,
    "karor": 10_000_000,
    "lakh": 100_000,
    "lac": 100_000,
    "lakhs": 100_000,
    "thousand": 1_000,
    "k": 1_000,
    "arab": 1_000_000_000,
}


def extract_price_amount(price: str) -> float | None:
    """
    'Rs 2.5 Crore' -> 25000000 ; 'PKR 95 Lakh' -> 9500000 ; '1,25,00,000' -> 12500000
    Multi-token bhi handle karta hai e.g. '1 Crore 50 Lakh'.
    """
    cleaned = normalize_space(price).lower()
    if not cleaned:
        return None

    total = 0.0
    matched = False
    # number + optional unit pairs
    for num_str, unit in re.findall(r"([\d][\d,\.]*)\s*(crore|cr|karor|lakh|lac|lakhs|arab|thousand|k)?", cleaned):
        number = num_str.replace(",", "")
        if not number or number in {".", ""}:
            continue
        try:
            value = float(Decimal(number))
        except (InvalidOperation, ValueError):
            continue
        mult = _UNIT_MULTIPLIERS.get(unit, 1) if unit else 1
        total += value * mult
        matched = True

    if not matched:
        return None
    # Agar koi unit nahi mila aur number raw tha (e.g. '12500000') to total wahi raw hai.
    return total if total > 0 else None


def detect_currency(price: str, default: str = "PKR") -> str:
    lower = normalize_space(price).lower()
    if "$" in lower or "usd" in lower:
        return "USD"
    if "aed" in lower:
        return "AED"
    return default


def detect_purpose(*texts: str) -> str:
    """sale vs rent guess karta hai title/url se."""
    blob = " ".join(normalize_space(t).lower() for t in texts if t)
    if "rent" in blob or "rental" in blob or "for-rent" in blob:
        return "rent"
    if "sale" in blob or "sell" in blob or "for-sale" in blob:
        return "sale"
    return ""


def detect_property_type(*texts: str) -> str:
    blob = " ".join(normalize_space(t).lower() for t in texts if t)
    table = [
        ("house", "house"),
        ("flat", "flat"),
        ("apartment", "flat"),
        ("plot", "plot"),
        ("commercial", "commercial"),
        ("shop", "commercial"),
        ("office", "commercial"),
        ("farm", "farmhouse"),
        ("penthouse", "penthouse"),
        ("portion", "portion"),
        ("room", "room"),
    ]
    for needle, label in table:
        if needle in blob:
            return label
    return ""


def listing_payload(
    *,
    source: str,
    source_label: str,
    title: str,
    price: str = "",
    listing_url: str = "",
    image_url: str = "",
    description: str = "",
    location: str = "",
    beds: str = "",
    baths: str = "",
    area: str = "",
    purpose: str = "",
    property_type: str = "",
    agent_name: str = "",
    posted_at: str = "",
    category: str = "",
    raw: Dict[str, Any] | None = None,
) -> Dict[str, Any]:
    price_text = normalize_space(price)
    title_text = normalize_space(title)
    return {
        "title": title_text,
        "price": price_text,
        "price_amount": extract_price_amount(price_text),
        "currency": detect_currency(price_text),
        "image_url": normalize_space(image_url),
        "listing_url": normalize_space(listing_url),
        "description": normalize_space(description),
        "location": normalize_space(location),
        "beds": normalize_space(beds),
        "baths": normalize_space(baths),
        "area": normalize_space(area),
        "purpose": purpose or detect_purpose(title_text, listing_url),
        "property_type": property_type or detect_property_type(title_text, listing_url),
        "agent_name": normalize_space(agent_name),
        "posted_at": normalize_space(posted_at),
        "category": normalize_space(category),
        "source": source,
        "source_label": source_label,
        "raw": raw or {},
    }