"""
OLX Pakistan automobile scraper — requests + BeautifulSoup.

Scrapes car listings from olx.com.pk cars category.
Extracts data from rendered HTML listing cards.
"""

import logging
import re
from typing import Any, Dict, List

import requests
from bs4 import BeautifulSoup

logger = logging.getLogger(__name__)

_BASE_URL = "https://www.olx.com.pk"
_CARS_URL = f"{_BASE_URL}/cars_c84"
_HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/120.0.0.0 Safari/537.36"
    ),
    "Accept-Language": "en-US,en;q=0.9",
}


def _parse_price(text: str) -> int | None:
    """'Rs 44 Lacs' → 4400000, 'Rs 12.5 Lacs' → 1250000, 'Rs 850,000' → 850000."""
    if not text:
        return None
    cleaned = text.replace(",", "").replace("Rs", "").replace("PKR", "").strip()
    lacs_match = re.match(r'([\d.]+)\s*[Ll]acs?', cleaned)
    if lacs_match:
        return int(float(lacs_match.group(1)) * 100000)
    crore_match = re.match(r'([\d.]+)\s*[Cc]rore', cleaned)
    if crore_match:
        return int(float(crore_match.group(1)) * 10000000)
    digits = re.sub(r'[^\d]', '', cleaned)
    return int(digits) if digits else None


def _parse_listing(li_tag) -> Dict[str, Any] | None:
    """Extract car data from a single <li aria-label='Listing'> tag."""
    title = (li_tag.get("title") or "").strip()
    if not title:
        return None

    texts = [t for t in li_tag.stripped_strings]

    price_text = ""
    year = None
    mileage = ""
    fuel_type = ""
    location = ""
    posted = ""

    for t in texts:
        if t.startswith("Rs") or t.startswith("PKR"):
            price_text = t
        elif re.match(r'^20[0-2]\d$', t) or re.match(r'^19\d\d$', t):
            if year is None:
                year = int(t)
        elif "km" in t.lower():
            if not mileage:
                mileage = t
        elif t.lower() in ("petrol", "diesel", "cng", "hybrid", "electric", "lpg"):
            fuel_type = t
        elif "," in t and any(c.isalpha() for c in t) and "ago" not in t.lower():
            location = t.rstrip("•").strip()
        elif "ago" in t.lower() or t.lower() == "today" or t.lower() == "yesterday":
            posted = t

    # Image
    img = li_tag.select_one("img")
    image_url = img.get("src", "") if img else ""

    # Link
    link_tag = li_tag.select_one('a[href*="/item/"]')
    if not link_tag:
        link_tag = li_tag.select_one("a[href]")
    listing_url = ""
    if link_tag:
        href = link_tag.get("href", "")
        listing_url = href if href.startswith("http") else _BASE_URL + href

    price_amount = _parse_price(price_text)

    # Extract city from location like "E-8, Islamabad" → "Islamabad"
    city = ""
    if location:
        parts = [p.strip() for p in location.split(",")]
        city = parts[-1] if parts else location

    return {
        "title": title,
        "description": f"{fuel_type}, {mileage}".strip(", ") if fuel_type or mileage else "",
        "price": price_text or "",
        "price_amount": price_amount,
        "currency": "PKR",
        "image_url": image_url,
        "location": location,
        "city": city,
        "make": "",
        "model": "",
        "year": year,
        "mileage": mileage,
        "fuel_type": fuel_type,
        "transmission": "",
        "engine_capacity": "",
        "body_type": "",
        "color": "",
        "condition": "used",
        "listing_url": listing_url,
        "source": "olx",
        "source_label": "OLX Pakistan",
    }


def scrape_olx_auto(
    query: str = "car",
    max_items: int = 20,
) -> List[Dict[str, Any]]:
    """Fetch car listings from OLX Pakistan."""
    url = _CARS_URL
    params = {"q": query}

    try:
        resp = requests.get(url, params=params, headers=_HEADERS, timeout=15)
        resp.raise_for_status()
    except Exception as exc:
        logger.error("[OLX Auto] Request failed: %s", exc)
        return []

    soup = BeautifulSoup(resp.text, "html.parser")
    listings = soup.select('li[aria-label="Listing"]')

    cars: List[Dict[str, Any]] = []
    for li in listings[:max_items]:
        car = _parse_listing(li)
        if car and car["title"]:
            cars.append(car)

    logger.info("[OLX Auto] '%s' → %d cars", query, len(cars))
    return cars
