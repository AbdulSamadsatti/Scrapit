"""
Property scraper orchestrator.

ecommerce_runner.py exactly jaisa. Teeno sources Playwright-based hain is liye
SEQUENTIALLY chalte hain (Playwright sync_api concurrent Browser launches ke liye
thread-safe nahi — yahi rule jobs/ecommerce runner mein hai).

Agar future mein kisi source ko Oxylabs universal scraper pe shift karna ho
(anti-bot bypass ke liye), woh browser launch nahi karta, to usay amazon_oxylabs.py
ki tarah ek background thread mein run kiya ja sakta hai.
"""

import logging
from typing import Any, Callable, Dict, List

logger = logging.getLogger(__name__)


def _safe_run(name: str, fn: Callable[..., Dict[str, Any]], *args: Any, **kwargs: Any) -> Dict[str, Any]:
    try:
        logger.info("[PropertyRunner] Starting: %s", name)
        result = fn(*args, **kwargs)
        if isinstance(result, list):
            result = {"data": result, "source": name, "count": len(result)}
        logger.info("[PropertyRunner] %s => %s listings", name, result.get("count", 0))
        return result
    except Exception as exc:
        logger.error("[PropertyRunner] %s failed: %s", name, exc)
        return {"data": [], "source": name, "count": 0, "error": str(exc)}


def run_all_property_scrapers(query: str, max_listings_per_site: int = 20) -> Dict[str, Any]:
    # Imports yahan rakhe hain taake missing package = graceful error, crash nahi.
    from scraping_engine.playwright_scraper.zameen import scrape_zameen_products
    from scraping_engine.playwright_scraper.olx_property import scrape_olx_products
    from scraping_engine.playwright_scraper.graana import scrape_graana_products

    results: Dict[str, Any] = {}

    # Browser-based scrapers SEQUENTIAL (Playwright sync deadlock avoid).
    results["zameen"] = _safe_run("zameen", scrape_zameen_products, query, max_products=max_listings_per_site)
    results["olx"] = _safe_run("olx", scrape_olx_products, query, max_products=max_listings_per_site)
    results["graana"] = _safe_run("graana", scrape_graana_products, query, max_products=max_listings_per_site)

    total = sum(v.get("count", 0) for v in results.values() if isinstance(v, dict))
    logger.info("[PropertyRunner] Done. Total: %s listings for '%s'", total, query)
    return results


def flatten_property_results(results: Dict[str, Any]) -> List[Dict[str, Any]]:
    source_lists: Dict[str, List[Dict[str, Any]]] = {}
    for source_key, value in results.items():
        if isinstance(value, dict):
            valid_listings = []
            for item in value.get("data", []):
                # Mandatory Fields Validation for Property: Title, Price, Link, Image
                title = (item.get("title") or "").strip()
                price = str(item.get("price") or "").strip()
                link = (item.get("listing_url") or item.get("url") or item.get("link") or "").strip()
                image = (item.get("image_url") or item.get("image") or "").strip()
                if not title or not price or not link or not image:
                    continue
                valid_listings.append(item)
            source_lists[source_key] = valid_listings

    # Round Robin Distribution logic to ensure perfectly equal representation
    listings: List[Dict[str, Any]] = []
    while True:
        added_in_round = False
        for source_key in list(source_lists.keys()):
            if source_lists[source_key]:
                listings.append(source_lists[source_key].pop(0))
                added_in_round = True
        if not added_in_round:
            break
            
    return listings


def scrape_property_detail(source: str, url: str) -> Dict[str, Any]:
    source = (source or "").lower().strip()
    if source == "zameen":
        from scraping_engine.playwright_scraper.zameen import scrape_zameen_detail

        return scrape_zameen_detail(url)
    if source == "olx":
        from scraping_engine.playwright_scraper.olx_property import scrape_olx_detail

        return scrape_olx_detail(url)
    if source == "graana":
        from scraping_engine.playwright_scraper.graana import scrape_graana_detail

        return scrape_graana_detail(url)
    raise ValueError("source must be one of: zameen, olx, graana")