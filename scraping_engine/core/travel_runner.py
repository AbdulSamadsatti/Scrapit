"""
Travel scraper orchestrator — Playwright only.

Runs 4 sources: Booking.com, Kipgo, Sastaticket, Bookme.
No SerpApi or BeautifulSoup dependency.
"""

import logging
from typing import Any, Callable, Dict, List

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


def run_all_travel_scrapers(query: str = "Pakistan travel", max_items_per_site: int = 10) -> Dict[str, Any]:
    """Main entry point — fetches travel listings from 4 sites via Playwright."""
    from scraping_engine.playwright_scraper.booking import scrape_booking_travel
    from scraping_engine.playwright_scraper.kipgo import scrape_kipgo_travel
    from scraping_engine.playwright_scraper.sastaticket import scrape_sastaticket_travel
    from scraping_engine.playwright_scraper.bookme import scrape_bookme_travel

    results: Dict[str, Any] = {}

    results["booking"] = _safe_run("booking", scrape_booking_travel, query, max_items=max_items_per_site)
    results["kipgo"] = _safe_run("kipgo", scrape_kipgo_travel, query, max_items=max_items_per_site)
    results["sastaticket"] = _safe_run("sastaticket", scrape_sastaticket_travel, query, max_items=max_items_per_site)
    results["bookme"] = _safe_run("bookme", scrape_bookme_travel, query, max_items=max_items_per_site)

    total = sum(v.get("count", 0) for v in results.values() if isinstance(v, dict))
    logger.info("[TravelRunner] Done. Total: %d travel items for '%s'", total, query)
    return results


def flatten_travel_results(results: Dict[str, Any]) -> List[Dict[str, Any]]:
    items: List[Dict[str, Any]] = []
    for value in results.values():
        if isinstance(value, dict):
            items.extend(value.get("data", []))
    return items
