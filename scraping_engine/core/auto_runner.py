"""
Automobile scraper orchestrator.

Runs all 3 sources: PakWheels, OLX Pakistan, and SerpApi Google search.
Mirrors the travel_runner.py architecture exactly.
"""

import logging
from typing import Any, Callable, Dict, List

from scraping_engine.config import SERP_API_KEY

logger = logging.getLogger(__name__)


def _safe_run(name: str, fn: Callable[..., Any], *args: Any, **kwargs: Any) -> Dict[str, Any]:
    try:
        logger.info("[AutoRunner] Starting: %s", name)
        result = fn(*args, **kwargs)
        if isinstance(result, list):
            result = {"data": result, "source": name, "count": len(result)}
        logger.info("[AutoRunner] %s => %d items", name, result.get("count", 0))
        return result
    except Exception as exc:
        logger.error("[AutoRunner] %s failed: %s", name, exc)
        return {"data": [], "source": name, "count": 0, "error": str(exc)}


def _run_pakwheels(query: str, max_items: int) -> Dict[str, Any]:
    from scraping_engine.scrapers.pakwheels import scrape_pakwheels

    items = scrape_pakwheels(query=query, max_items=max_items)
    return {"data": items, "source": "pakwheels", "count": len(items)}


def _run_olx(query: str, max_items: int) -> Dict[str, Any]:
    from scraping_engine.scrapers.olx_auto import scrape_olx_auto

    items = scrape_olx_auto(query=query, max_items=max_items)
    return {"data": items, "source": "olx", "count": len(items)}


def _run_google_auto(query: str, max_items: int) -> Dict[str, Any]:
    from scraping_engine.serp.google_automobiles import get_google_auto_listings

    items = get_google_auto_listings(query=query, max_items=max_items)
    return {"data": items, "source": "google_search", "count": len(items)}


def run_all_auto_scrapers(
    query: str = "used cars Pakistan",
    max_items_per_site: int = 20,
) -> Dict[str, Any]:
    """
    Main entry point — fetches car listings from PakWheels + OLX + Google.
    PakWheels and OLX always run (free, no API key needed).
    Google search runs when SERP_API_KEY is set.
    """
    results: Dict[str, Any] = {}

    # PakWheels and OLX give structured per-car data (images, specs, prices).
    # Google organic search only returns page-level links with no images —
    # disabled because it adds noise without adding useful listings.
    results["pakwheels"] = _safe_run("pakwheels", _run_pakwheels, query, max_items_per_site)
    results["olx"] = _safe_run("olx", _run_olx, query, max_items_per_site)

    total = sum(v.get("count", 0) for v in results.values() if isinstance(v, dict))
    logger.info("[AutoRunner] Done. Total: %d automobile items for '%s'", total, query)
    return results


def flatten_auto_results(results: Dict[str, Any]) -> List[Dict[str, Any]]:
    items: List[Dict[str, Any]] = []
    for value in results.values():
        if isinstance(value, dict):
            items.extend(value.get("data", []))
    return items
