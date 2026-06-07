"""
Travel scraper orchestrator.

Primary source: SerpApi (google_hotels + google_flights) — fast, no browser needed.
Fallback: Playwright scrapers (kipgo, sastaticket, bookme) if SerpApi is not configured.
"""

import logging
from typing import Any, Callable, Dict, List

from scraping_engine.config import SERP_API_KEY

logger = logging.getLogger(__name__)


def _safe_run(name: str, fn: Callable[..., Any], *args: Any, **kwargs: Any) -> Dict[str, Any]:
    try:
        logger.info("[TravelRunner] Starting: %s", name)
        result = fn(*args, **kwargs)
        if isinstance(result, list):
            result = {"data": result, "source": name, "count": len(result)}
        logger.info("[TravelRunner] %s => %d items", name, result.get("count", 0))
        return result
    except Exception as exc:
        logger.error("[TravelRunner] %s failed: %s", name, exc)
        return {"data": [], "source": name, "count": 0, "error": str(exc)}


def _run_serp_travel(query: str, max_items: int) -> Dict[str, Any]:
    """Fetch hotels + flights via SerpApi (no browser required)."""
    from scraping_engine.serp.google_travel import get_google_travel

    items = get_google_travel(query=query, max_items=max_items)
    return {"data": items, "source": "serpapi_travel", "count": len(items)}


def _run_playwright_travel(query: str, max_items: int) -> Dict[str, Any]:
    """Playwright fallback: scrapes Kipgo, Sastaticket, Bookme."""
    from scraping_engine.playwright_scraper.bookme import scrape_bookme_travel
    from scraping_engine.playwright_scraper.kipgo import scrape_kipgo_travel
    from scraping_engine.playwright_scraper.sastaticket import scrape_sastaticket_travel

    playwright_results: Dict[str, Any] = {}
    playwright_results["kipgo"] = _safe_run("kipgo", scrape_kipgo_travel, query, max_items=max_items)
    playwright_results["sastaticket"] = _safe_run(
        "sastaticket", scrape_sastaticket_travel, query, max_items=max_items
    )
    playwright_results["bookme"] = _safe_run("bookme", scrape_bookme_travel, query, max_items=max_items)

    all_items: List[Dict[str, Any]] = []
    for v in playwright_results.values():
        all_items.extend(v.get("data", []))

    return {"data": all_items, "source": "playwright_travel", "count": len(all_items)}


def run_all_travel_scrapers(query: str = "Pakistan travel", max_items_per_site: int = 10) -> Dict[str, Any]:
    """
    Main entry point used by the API.

    Uses SerpApi when SERP_API_KEY is set (recommended).
    Falls back to Playwright scrapers if key is missing or returns no data.
    """
    serp_configured = bool(SERP_API_KEY and SERP_API_KEY != "your_serpapi_key_here")

    results: Dict[str, Any] = {}

    if serp_configured:
        logger.info("[TravelRunner] Using SerpApi for travel query: '%s'", query)
        serp_result = _safe_run("serpapi_travel", _run_serp_travel, query, max_items_per_site)
        results["serpapi_travel"] = serp_result

        # If SerpApi returned nothing, fall back to Playwright
        if serp_result.get("count", 0) == 0:
            logger.warning("[TravelRunner] SerpApi returned 0 results — falling back to Playwright")
            pw_result = _safe_run("playwright_travel", _run_playwright_travel, query, max_items_per_site)
            results["playwright_travel"] = pw_result
    else:
        logger.info("[TravelRunner] SERP_API_KEY not set — using Playwright scrapers")
        pw_result = _safe_run("playwright_travel", _run_playwright_travel, query, max_items_per_site)
        results["playwright_travel"] = pw_result

    total = sum(v.get("count", 0) for v in results.values() if isinstance(v, dict))
    logger.info("[TravelRunner] Done. Total: %d travel items for '%s'", total, query)
    return results


def flatten_travel_results(results: Dict[str, Any]) -> List[Dict[str, Any]]:
    items: List[Dict[str, Any]] = []
    for value in results.values():
        if isinstance(value, dict):
            items.extend(value.get("data", []))
    return items
