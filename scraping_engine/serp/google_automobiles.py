"""
SerpApi-based automobile search.

Uses the Google search engine to find car listings from across the web.
Extracts structured data from organic results (titles, prices, thumbnails, links).
"""

import logging
import re
from typing import Any, Dict, List

try:
    from serpapi import GoogleSearch
except ImportError:
    GoogleSearch = None

from scraping_engine.config import SERP_API_KEY

logger = logging.getLogger(__name__)


def _extract_price(text: str) -> int | None:
    """Try to pull a numeric PKR price from a snippet."""
    patterns = [
        r'PKR\s*([\d,]+)',
        r'Rs\.?\s*([\d,]+)',
        r'([\d,]+)\s*(?:lacs?|lac)',
        r'([\d,]+)\s*(?:crore)',
    ]
    for pat in patterns:
        m = re.search(pat, text, re.I)
        if m:
            raw = m.group(1).replace(",", "")
            try:
                val = int(raw)
                if "lac" in text[m.start():m.end() + 5].lower():
                    return val * 100000
                if "crore" in text[m.start():m.end() + 8].lower():
                    return val * 10000000
                return val
            except ValueError:
                pass
    return None


def _extract_year(text: str) -> int | None:
    m = re.search(r'\b(19\d\d|20[0-2]\d)\b', text)
    return int(m.group(1)) if m else None


def _check_serp_ready() -> bool:
    if not SERP_API_KEY or SERP_API_KEY == "your_serpapi_key_here":
        logger.error("SERP_API_KEY is not configured in .env.")
        return False
    if GoogleSearch is None:
        logger.error("serpapi package not installed.")
        return False
    return True


def get_google_auto_listings(
    query: str,
    gl: str = "pk",
    hl: str = "en",
    max_items: int = 20,
) -> List[Dict[str, Any]]:
    """Search Google for car listings in Pakistan and extract structured results."""
    if not _check_serp_ready():
        return []

    search_query = query
    if "pakistan" not in query.lower() and "pk" not in query.lower():
        search_query = f"{query} for sale Pakistan"

    params = {
        "engine": "google",
        "q": search_query,
        "gl": gl,
        "hl": hl,
        "num": min(max_items, 40),
        "api_key": SERP_API_KEY,
    }

    try:
        results = GoogleSearch(params).get_dict()
    except Exception as exc:
        logger.error("[Google Auto] SerpApi error: %s", exc)
        return []

    if "error" in results:
        logger.error("[Google Auto] API error: %s", results["error"])
        return []

    cars: List[Dict[str, Any]] = []

    for item in results.get("organic_results", [])[:max_items]:
        title = item.get("title", "")
        snippet = item.get("snippet", "")
        link = item.get("link", "")
        thumbnail = item.get("thumbnail", "")

        if not title or not link:
            continue

        combined = f"{title} {snippet}"
        price_amount = _extract_price(combined)
        year = _extract_year(combined)

        price_str = ""
        if price_amount:
            price_str = f"PKR {price_amount:,}"

        cars.append({
            "title": title,
            "description": snippet,
            "price": price_str,
            "price_amount": price_amount,
            "currency": "PKR",
            "image_url": thumbnail,
            "location": "",
            "city": "",
            "make": "",
            "model": "",
            "year": year,
            "mileage": "",
            "fuel_type": "",
            "transmission": "",
            "engine_capacity": "",
            "body_type": "",
            "color": "",
            "condition": "",
            "listing_url": link,
            "source": "google_search",
            "source_label": "Google",
        })

    logger.info("[Google Auto] '%s' → %d results", query, len(cars))
    return cars
