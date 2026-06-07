"""
SerpApi-based travel scraper.

Uses Google Hotels and Google Flights engines — same approach as google_job.py.
No browser/Playwright needed. Fast, reliable, structured data.

Engines used:
  google_hotels  -> hotel listings with prices, ratings, images
  google_flights -> flight listings with airline, price, duration
"""

import logging
from datetime import date, timedelta
from typing import Any, Dict, List, Optional

try:
    from serpapi import GoogleSearch
except ImportError:
    GoogleSearch = None

from scraping_engine.config import SERP_API_KEY

logger = logging.getLogger(__name__)

# Pakistan airports: city name (lowercase) -> IATA code
PAKISTAN_AIRPORTS: Dict[str, str] = {
    "karachi": "KHI",
    "lahore": "LHE",
    "islamabad": "ISB",
    "rawalpindi": "ISB",
    "peshawar": "PEW",
    "quetta": "UET",
    "multan": "MUX",
    "sialkot": "SKT",
    "faisalabad": "LYP",
    "rahim yar khan": "RYK",
    "skardu": "KDU",
    "gilgit": "GIL",
    "turbat": "TUK",
}

# Popular Pakistan domestic flight routes (origin -> list of destinations)
DEFAULT_ROUTES = [
    ("KHI", "ISB"),  # Karachi -> Islamabad
    ("LHE", "ISB"),  # Lahore -> Islamabad
    ("KHI", "LHE"),  # Karachi -> Lahore
    ("ISB", "SKT"),  # Islamabad -> Skardu (popular tourist route)
    ("LHE", "KDU"),  # Lahore -> Skardu
]


def _check_serp_ready() -> bool:
    if not SERP_API_KEY or SERP_API_KEY == "your_serpapi_key_here":
        logger.error("SERP_API_KEY is not configured in .env.")
        return False
    if GoogleSearch is None:
        logger.error("serpapi package not installed. Run: pip install google-search-results")
        return False
    return True


def _get_dates(days_ahead: int = 1, duration: int = 2):
    """Return (check_in, check_out) as ISO strings starting days_ahead from today."""
    check_in = date.today() + timedelta(days=days_ahead)
    check_out = check_in + timedelta(days=duration)
    return check_in.isoformat(), check_out.isoformat()


def _detect_city_iata(query: str) -> Optional[str]:
    """Try to extract a Pakistan city IATA code from the query string."""
    lower = query.lower()
    for city, code in PAKISTAN_AIRPORTS.items():
        if city in lower:
            return code
    return None


def get_google_hotels(
    query: str,
    gl: str = "pk",
    hl: str = "en",
    currency: str = "PKR",
    max_items: int = 10,
) -> List[Dict[str, Any]]:
    """
    Search hotels using SerpApi google_hotels engine.
    Returns a normalized list of hotel items.
    """
    if not _check_serp_ready():
        return []

    check_in, check_out = _get_dates(days_ahead=1, duration=2)

    params = {
        "engine": "google_hotels",
        "q": query,
        "check_in_date": check_in,
        "check_out_date": check_out,
        "currency": currency,
        "gl": gl,
        "hl": hl,
        "api_key": SERP_API_KEY,
    }

    try:
        results = GoogleSearch(params).get_dict()
    except Exception as exc:
        logger.error("SerpApi google_hotels error: %s", exc)
        return []

    if "error" in results:
        logger.error("SerpApi returned error: %s", results["error"])
        return []

    hotels = []
    for prop in results.get("properties", [])[:max_items]:
        rate = prop.get("rate_per_night") or {}
        total = prop.get("total_rate") or {}
        images = prop.get("images") or []
        image_url = images[0].get("thumbnail", "") if images else ""

        price_raw = rate.get("lowest", "") or total.get("lowest", "")
        price_num = rate.get("extracted_lowest") or total.get("extracted_lowest")

        hotels.append({
            "title": prop.get("name", ""),
            "description": prop.get("description", ""),
            "price": price_raw,
            "price_amount": price_num,
            "currency": currency,
            "image_url": image_url,
            "images": [img.get("thumbnail", "") for img in images],
            "location": query,
            "city": query,
            "country": "Pakistan",
            "offer_type": "hotel",
            "hotel_name": prop.get("name", ""),
            "nights": 2,
            "rating": prop.get("overall_rating"),
            "reviews": prop.get("reviews"),
            "amenities": prop.get("amenities", []),
            "hotel_class": prop.get("hotel_class", ""),
            "check_in_date": check_in,
            "check_out_date": check_out,
            "booking_url": prop.get("link", ""),
            "source_url": prop.get("link", ""),
            "source": "google_hotels",
            "source_label": "Google Hotels",
            "raw_data": prop,
        })

    logger.info("[google_hotels] '%s' -> %d hotels", query, len(hotels))
    return hotels


def get_google_flights(
    origin: str,
    destination: str,
    gl: str = "pk",
    hl: str = "en",
    currency: str = "PKR",
    max_items: int = 10,
) -> List[Dict[str, Any]]:
    """
    Search flights using SerpApi google_flights engine.
    origin / destination must be IATA airport codes (e.g. 'KHI', 'ISB').
    Returns a normalized list of flight items.
    """
    if not _check_serp_ready():
        return []

    outbound_date, return_date = _get_dates(days_ahead=3, duration=7)

    params = {
        "engine": "google_flights",
        "departure_id": origin,
        "arrival_id": destination,
        "outbound_date": outbound_date,
        "return_date": return_date,
        "currency": currency,
        "gl": gl,
        "hl": hl,
        "type": "1",  # round-trip
        "api_key": SERP_API_KEY,
    }

    try:
        results = GoogleSearch(params).get_dict()
    except Exception as exc:
        logger.error("SerpApi google_flights error (%s->%s): %s", origin, destination, exc)
        return []

    if "error" in results:
        logger.error("SerpApi flights error: %s", results["error"])
        return []

    flights = []
    all_flights = results.get("best_flights", []) + results.get("other_flights", [])

    for flight_group in all_flights[:max_items]:
        legs = flight_group.get("flights", [])
        if not legs:
            continue
        first_leg = legs[0]
        last_leg = legs[-1]

        dep_airport = first_leg.get("departure_airport", {})
        arr_airport = last_leg.get("arrival_airport", {})
        airline = first_leg.get("airline", "")
        price = flight_group.get("price")

        title = f"{airline}: {dep_airport.get('id', origin)} → {arr_airport.get('id', destination)}"
        description = (
            f"Duration: {flight_group.get('total_duration', '')} min | "
            f"Class: {first_leg.get('travel_class', 'Economy')} | "
            f"Flight: {first_leg.get('flight_number', '')}"
        )

        flights.append({
            "title": title,
            "description": description,
            "price": f"{currency} {price:,}" if price else "",
            "price_amount": price,
            "currency": currency,
            "image_url": flight_group.get("airline_logo", ""),
            "images": [],
            "location": f"{dep_airport.get('name', '')} to {arr_airport.get('name', '')}",
            "city": arr_airport.get("id", destination),
            "country": "Pakistan",
            "offer_type": "flight",
            "origin": dep_airport.get("id", origin),
            "destination": arr_airport.get("id", destination),
            "airline": airline,
            "departure_at": dep_airport.get("time", ""),
            "return_at": "",
            "hotel_name": "",
            "nights": "",
            "travelers": 1,
            "duration_minutes": flight_group.get("total_duration"),
            "travel_class": first_leg.get("travel_class", "Economy"),
            "flight_number": first_leg.get("flight_number", ""),
            "booking_url": "",
            "source_url": "",
            "source": "google_flights",
            "source_label": "Google Flights",
            "raw_data": flight_group,
        })

    logger.info("[google_flights] %s->%s -> %d flights", origin, destination, len(flights))
    return flights


def get_google_travel(
    query: str,
    gl: str = "pk",
    hl: str = "en",
    currency: str = "PKR",
    max_items: int = 10,
) -> List[Dict[str, Any]]:
    """
    Main entry point. Combines hotels + flights for a travel query.

    - Always fetches hotels for the query location.
    - Fetches flights: detects city in query, or falls back to popular routes.
    - Results are interleaved: hotels first, then flights.
    """
    all_results: List[Dict[str, Any]] = []

    # --- Hotels ---
    hotels = get_google_hotels(
        query=query,
        gl=gl,
        hl=hl,
        currency=currency,
        max_items=max_items,
    )
    all_results.extend(hotels)

    # --- Flights ---
    iata = _detect_city_iata(query)

    if iata:
        # Query mentions a specific city — search flights TO that city from main hubs
        hubs = [c for c in ["KHI", "LHE", "ISB"] if c != iata]
        for hub in hubs[:2]:
            flights = get_google_flights(
                origin=hub,
                destination=iata,
                gl=gl,
                hl=hl,
                currency=currency,
                max_items=max_items // 2,
            )
            all_results.extend(flights)
            if len(all_results) >= max_items * 2:
                break
    else:
        # Generic query — use most popular domestic route
        for origin, destination in DEFAULT_ROUTES[:2]:
            flights = get_google_flights(
                origin=origin,
                destination=destination,
                gl=gl,
                hl=hl,
                currency=currency,
                max_items=max_items // 2,
            )
            all_results.extend(flights)
            if len(all_results) >= max_items * 2:
                break

    logger.info("[google_travel] '%s' -> %d total items", query, len(all_results))
    return all_results
