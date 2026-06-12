"""
PakWheels scraper — requests + BeautifulSoup.

Scrapes used car listings from pakwheels.com search results.
Uses JSON-LD structured data embedded in each listing for clean extraction.
"""

import json
import logging
import re
from typing import Any, Dict, List
from urllib.parse import quote as _q

import requests
from bs4 import BeautifulSoup

logger = logging.getLogger(__name__)

_BASE_URL = "https://www.pakwheels.com"
_SEARCH_URL = f"{_BASE_URL}/used-cars/search/-/"
_HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/120.0.0.0 Safari/537.36"
    ),
    "Accept-Language": "en-US,en;q=0.9",
}


def _parse_listing(li_tag) -> Dict[str, Any] | None:
    """Extract car data from a single <li class='classified-listing'> tag."""
    ld_script = li_tag.select_one('script[type="application/ld+json"]')
    if not ld_script:
        return None

    try:
        ld = json.loads(ld_script.string)
    except (json.JSONDecodeError, TypeError):
        return None

    offers = ld.get("offers") or {}
    price_amount = offers.get("price")
    url = offers.get("url", "")
    if url and not url.startswith("http"):
        url = _BASE_URL + url

    engine = ld.get("vehicleEngine") or {}
    brand = ld.get("brand") or {}

    # Extract city from description like "Toyota Corolla 2021 for sale in Lahore"
    desc = ld.get("description", "")
    city = ""
    city_match = re.search(r'for sale in (.+)$', desc, re.I)
    if city_match:
        city = city_match.group(1).strip()

    # Get image — prefer full-size from JSON-LD, fallback to thumbnail in HTML
    image_url = ld.get("image", "")
    if not image_url:
        img_tag = li_tag.select_one("img[src*=pakwheels]")
        if img_tag:
            image_url = img_tag.get("src", "")

    # Extra info from HTML (year, km, fuel, cc, transmission are in info list)
    infos = [el.get_text(strip=True) for el in li_tag.select(".search-vehicle-info li")]

    return {
        "title": ld.get("name", ""),
        "description": desc,
        "price": f"PKR {price_amount:,}" if price_amount else "",
        "price_amount": price_amount,
        "currency": offers.get("priceCurrency", "PKR"),
        "image_url": image_url,
        "location": city,
        "city": city,
        "make": brand.get("name", "") or ld.get("manufacturer", ""),
        "model": "",
        "year": ld.get("modelDate"),
        "mileage": ld.get("mileageFromOdometer", ""),
        "fuel_type": ld.get("fuelType", ""),
        "transmission": ld.get("vehicleTransmission", ""),
        "engine_capacity": engine.get("engineDisplacement", ""),
        "body_type": "",
        "color": "",
        "condition": ld.get("itemCondition", "used"),
        "listing_url": url,
        "source": "pakwheels",
        "source_label": "PakWheels",
    }


def scrape_pakwheels(
    query: str = "car",
    max_items: int = 20,
) -> List[Dict[str, Any]]:
    """Fetch car listings from PakWheels search."""
    params = {"q": query}

    try:
        resp = requests.get(
            _SEARCH_URL, params=params, headers=_HEADERS, timeout=15,
        )
        resp.raise_for_status()
    except Exception as exc:
        logger.error("[PakWheels] Request failed: %s", exc)
        return []

    soup = BeautifulSoup(resp.text, "html.parser")
    listings = soup.select("li.classified-listing")

    cars: List[Dict[str, Any]] = []
    for li in listings[:max_items]:
        car = _parse_listing(li)
        if car and car["title"]:
            cars.append(car)

    logger.info("[PakWheels] '%s' → %d cars", query, len(cars))
    return cars
