import re
from decimal import Decimal, InvalidOperation
from typing import Any, Dict
from urllib.parse import urljoin


def normalize_space(value: Any) -> str:
    if value is None:
        return ""
    return re.sub(r"\s+", " ", str(value)).strip()


def absolutize_url(url: str, base_url: str) -> str:
    url = normalize_space(url)
    if not url:
        return ""
    return urljoin(base_url, url)


def extract_price_amount(price: str) -> float | None:
    cleaned = normalize_space(price)
    if not cleaned:
        return None
    match = re.search(r"(\d[\d,\.]*)", cleaned)
    if not match:
        return None
    number = match.group(1).replace(",", "")
    try:
        return float(Decimal(number))
    except (InvalidOperation, ValueError):
        return None


def detect_currency(price: str, default: str = "PKR") -> str:
    lower = normalize_space(price).lower()
    if "$" in lower or "usd" in lower:
        return "USD"
    if "aed" in lower:
        return "AED"
    if "rs" in lower or "pkr" in lower or "₨" in lower:
        return "PKR"
    return default


def product_payload(
    *,
    source: str,
    source_label: str,
    title: str,
    price: str = "",
    product_url: str = "",
    image_url: str = "",
    description: str = "",
    rating: str = "",
    review_count: str = "",
    seller_name: str = "",
    availability: str = "",
    location: str = "",
    category: str = "",
    brand: str = "",
    raw: Dict[str, Any] | None = None,
) -> Dict[str, Any]:
    price_text = normalize_space(price)
    return {
        "title": normalize_space(title),
        "price": price_text,
        "price_amount": extract_price_amount(price_text),
        "currency": detect_currency(price_text),
        "image_url": normalize_space(image_url),
        "product_url": normalize_space(product_url),
        "description": normalize_space(description),
        "rating": normalize_space(rating),
        "review_count": normalize_space(review_count),
        "seller_name": normalize_space(seller_name),
        "availability": normalize_space(availability),
        "location": normalize_space(location),
        "category": normalize_space(category),
        "brand": normalize_space(brand),
        "source": source,
        "source_label": source_label,
        "raw": raw or {},
    }
