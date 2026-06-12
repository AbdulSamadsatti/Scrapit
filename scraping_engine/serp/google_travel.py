"""
SerpApi-based travel scraper.

Uses Google Hotels and Google Flights engines.
No hardcoded routes or airport restrictions — fetches everything available.
"""

import logging
import re
from datetime import date, timedelta
from typing import Any, Dict, List
from urllib.parse import quote as _q

try:
    from serpapi import GoogleSearch
except ImportError:
    GoogleSearch = None

from scraping_engine.config import SERP_API_KEY

logger = logging.getLogger(__name__)


# All words that should be stripped when extracting a city name from a query.
# After stripping these, whatever remains is treated as the city.
_QUERY_NOISE_WORDS = {
    # Travel category words
    "hotel", "hotels", "flight", "flights", "resort", "resorts",
    "lodge", "lodges", "tour", "tours", "package", "packages",
    "trip", "travel", "booking", "hostel", "hostels", "inn",
    # Prepositions / articles
    "in", "at", "the", "a", "an", "for", "of", "near", "around",
    # Descriptor adjectives that are NOT city names
    "cheap", "budget", "luxury", "family", "best", "top", "good", "nice",
    "affordable", "free", "last", "minute", "boutique", "popular", "modern",
    "comfortable", "cozy", "safe", "clean", "big", "small", "quiet",
    "discount", "deals", "new", "old", "central", "downtown",
}


def _extract_city(query: str) -> str:
    """
    Turn a raw search query into a clean city name by stripping all noise words.

    Examples:
      'Hunza hotels'                → 'Hunza'
      'Islamabad hotels'            → 'Islamabad'
      'hotels in Murree'            → 'Murree'
      'luxury hotels in Dubai'      → 'Dubai'
      'family hotels Islamabad'     → 'Islamabad'
      'Karachi to Islamabad flight' → 'Karachi'  (departure city for routes)
      'cheap hotels'                → ''   (no city — all noise words)
      'budget resorts'              → ''   (no city)
      'c'                           → ''   (single char — not a city)
    """
    q = query.strip()
    # For flight routes ("X to Y") extract the departure city only
    route = re.match(r'^(.+?)\s+to\s+', q, re.I)
    if route:
        q = route.group(1).strip()

    # Split and keep only non-noise words of 2+ chars
    words = re.split(r'[\s,/\-]+', q.lower().strip())
    city_words = [w for w in words if len(w) >= 2 and w not in _QUERY_NOISE_WORDS]

    if not city_words:
        return ""
    return " ".join(city_words).title()


def _check_serp_ready() -> bool:
    if not SERP_API_KEY or SERP_API_KEY == "your_serpapi_key_here":
        logger.error("SERP_API_KEY is not configured in .env.")
        return False
    if GoogleSearch is None:
        logger.error("serpapi package not installed. Run: pip install google-search-results")
        return False
    return True


def _get_dates(days_ahead: int = 1, duration: int = 3):
    check_in = date.today() + timedelta(days=days_ahead)
    check_out = check_in + timedelta(days=duration)
    return check_in.isoformat(), check_out.isoformat()


def get_google_hotels(
    query: str,
    gl: str = "pk",
    hl: str = "en",
    currency: str = "PKR",
    max_items: int = 20,
) -> List[Dict[str, Any]]:
    """Fetch all hotels matching the query — no limits on location or count."""
    if not _check_serp_ready():
        return []

    check_in, check_out = _get_dates()

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

        neighborhood = prop.get("neighborhood", "")
        city_clean = _extract_city(query)
        hotels.append({
            "title": prop.get("name", ""),
            "description": prop.get("description", ""),
            "price": price_raw,
            "price_amount": price_num,
            "currency": currency,
            "image_url": image_url,
            "location": neighborhood or city_clean,  # real neighborhood, not raw query
            "city": city_clean,
            "country": "",
            "offer_type": "hotel",
            "hotel_name": prop.get("name", ""),
            "rating": prop.get("overall_rating"),
            "reviews": prop.get("reviews"),
            "hotel_class": prop.get("hotel_class", ""),
            "amenities": prop.get("amenities", []),
            "check_in_date": check_in,
            "check_out_date": check_out,
            "nights": 3,
            "booking_url": prop.get("link") or (
                f"https://www.google.com/travel/hotels/s/search?q="
                f"{_q(prop.get('name', '') + ' ' + _extract_city(query))}"
            ),
            "source_url": prop.get("link") or "",
            "source": "google_hotels",
            "source_label": "Google Hotels",
        })

    logger.info("[google_hotels] '%s' -> %d hotels", query, len(hotels))
    return hotels


def get_google_flights(
    query: str,
    gl: str = "pk",
    hl: str = "en",
    currency: str = "PKR",
    max_items: int = 20,
) -> List[Dict[str, Any]]:
    """
    Fetch flights for a free-text query.
    Tries to parse origin/destination from the query (e.g. 'Karachi to Islamabad').
    Falls back to a broad Google search if no route is detected.
    """
    if not _check_serp_ready():
        return []

    # Try to parse "X to Y" or "X - Y" from query
    import re
    route_match = re.search(
        r"([a-z\s]+)\s+(?:to|-|→)\s+([a-z\s]+)", query.lower()
    )

    if not route_match:
        logger.info("[google_flights] No route detected in '%s', skipping flights", query)
        return []

    origin_text = route_match.group(1).strip()
    dest_text = route_match.group(2).strip()

    outbound_date, return_date = _get_dates(days_ahead=7, duration=7)

    params = {
        "engine": "google_flights",
        "departure_id": origin_text,
        "arrival_id": dest_text,
        "outbound_date": outbound_date,
        "return_date": return_date,
        "currency": currency,
        "gl": gl,
        "hl": hl,
        "type": "1",
        "api_key": SERP_API_KEY,
    }

    try:
        results = GoogleSearch(params).get_dict()
    except Exception as exc:
        logger.error("SerpApi google_flights error: %s", exc)
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

        title = (
            f"{airline}: {dep_airport.get('name', origin_text)} → "
            f"{arr_airport.get('name', dest_text)}"
        )
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
            "location": f"{dep_airport.get('name', '')} → {arr_airport.get('name', '')}",
            "city": arr_airport.get("id", dest_text),
            "country": "",
            "offer_type": "flight",
            "origin": dep_airport.get("id", origin_text),
            "destination": arr_airport.get("id", dest_text),
            "airline": airline,
            "departure_at": dep_airport.get("time", ""),
            "duration_minutes": flight_group.get("total_duration"),
            "travel_class": first_leg.get("travel_class", "Economy"),
            "flight_number": first_leg.get("flight_number", ""),
            "booking_url": (
                f"https://www.google.com/flights?q="
                f"{_q('flights from ' + origin_text + ' to ' + dest_text)}"
            ),
            "source_url": (
                f"https://www.google.com/flights?q="
                f"{_q('flights from ' + origin_text + ' to ' + dest_text)}"
            ),
            "source": "google_flights",
            "source_label": "Google Flights",
        })

    logger.info("[google_flights] '%s' -> %d flights", query, len(flights))
    return flights


def get_google_travel(
    query: str,
    gl: str = "pk",
    hl: str = "en",
    currency: str = "PKR",
    max_items: int = 20,
) -> List[Dict[str, Any]]:
    """
    Main entry point — fetches hotels + flights for any query.
    No hardcoded routes, no airport restrictions.
    """
    all_results: List[Dict[str, Any]] = []

    # Always fetch hotels
    hotels = get_google_hotels(query=query, gl=gl, hl=hl, currency=currency, max_items=max_items)
    all_results.extend(hotels)

    # Fetch flights only if query looks like a route
    flights = get_google_flights(query=query, gl=gl, hl=hl, currency=currency, max_items=max_items)
    all_results.extend(flights)

    logger.info("[google_travel] '%s' -> %d total items", query, len(all_results))
    return all_results
