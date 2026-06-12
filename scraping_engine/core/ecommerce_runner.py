"""
Ecommerce scraper orchestrator.

Playwright scrapers run sequentially, following the same safety rule used by
the jobs runner. Amazon uses Oxylabs and can run without launching a browser.
"""

import logging
import threading
from typing import Any, Callable, Dict, List

logger = logging.getLogger(__name__)


def _safe_run(name: str, fn: Callable[..., Dict[str, Any]], *args: Any, **kwargs: Any) -> Dict[str, Any]:
    try:
        logger.info("[EcommerceRunner] Starting: %s", name)
        result = fn(*args, **kwargs)
        if isinstance(result, list):
            result = {"data": result, "source": name, "count": len(result)}
        logger.info("[EcommerceRunner] %s => %s products", name, result.get("count", 0))
        return result
    except Exception as exc:
        logger.error("[EcommerceRunner] %s failed: %s", name, exc)
        return {"data": [], "source": name, "count": 0, "error": str(exc)}


def run_all_ecommerce_scrapers(query: str, max_products_per_site: int = 20) -> Dict[str, Any]:
    try:
        from scraping_engine.playwright_scraper.amazon_oxylabs import scrape_amazon_products, scrape_amazon_detail
        AMAZON_AVAILABLE = True
    except ImportError:
        logger.warning("[EcommerceRunner] Amazon/Oxylabs module not found, skipping Amazon scraper.")
        AMAZON_AVAILABLE = False
    from scraping_engine.playwright_scraper.daraz import scrape_daraz_products
    from scraping_engine.playwright_scraper.olx import scrape_olx_products
    from scraping_engine.playwright_scraper.priceoye import scrape_priceoye_products

    results: Dict[str, Any] = {}
    amazon_result: Dict[str, Any] = {}

    import threading
    if AMAZON_AVAILABLE:
        def _run_amazon() -> None:
            nonlocal amazon_result
            amazon_result = _safe_run("amazon", scrape_amazon_products, query, max_products=max_products_per_site)
        amazon_thread = threading.Thread(target=_run_amazon)
        amazon_thread.start()
    else:
        logger.info("[EcommerceRunner] Skipping Amazon scraper as module unavailable.")
        amazon_result = {}
        amazon_thread = None

    # Browser-based scrapers are sequential to avoid Playwright sync deadlocks.
    results["priceoye"] = _safe_run("priceoye", scrape_priceoye_products, query, max_products=max_products_per_site)
    results["daraz"] = _safe_run("daraz", scrape_daraz_products, query, max_products=max_products_per_site)
    results["olx"] = _safe_run("olx", scrape_olx_products, query, max_products=max_products_per_site)

    if amazon_thread:
        amazon_thread.join(timeout=100)
        results["amazon"] = amazon_result or {
            "data": [],
            "source": "amazon",
            "count": 0,
            "error": "Amazon/Oxylabs timed out or did not return.",
        }
    else:
        results["amazon"] = {
            "data": [],
            "source": "amazon",
            "count": 0,
            "error": "Amazon/Oxylabs module not available.",
        }

    total = sum(v.get("count", 0) for v in results.values() if isinstance(v, dict))
    logger.info("[EcommerceRunner] Done. Total: %s products for '%s'", total, query)
    return results


def flatten_ecommerce_results(results: Dict[str, Any]) -> List[Dict[str, Any]]:
    source_lists: Dict[str, List[Dict[str, Any]]] = {}
    for source_key, value in results.items():
        if isinstance(value, dict):
            valid_products = []
            for prod in value.get("data", []):
                # Mandatory Fields Validation for Ecommerce: Title, Price, Link, Image
                title = (prod.get("title") or "").strip()
                price = str(prod.get("price") or "").strip()
                link = (prod.get("product_url") or "").strip()
                image = (prod.get("image_url") or "").strip()
                if not title or not price or not link:
                    continue
                valid_products.append(prod)
            source_lists[source_key] = valid_products

    # Round Robin Distribution logic to ensure perfectly equal representation
    products: List[Dict[str, Any]] = []
    while True:
        added_in_round = False
        for source_key in list(source_lists.keys()):
            if source_lists[source_key]:
                products.append(source_lists[source_key].pop(0))
                added_in_round = True
        if not added_in_round:
            break
            
    return products


def scrape_ecommerce_detail(source: str, url: str) -> Dict[str, Any]:
    source = (source or "").lower().strip()
    if source == "daraz":
        from scraping_engine.playwright_scraper.daraz import scrape_daraz_detail

        return scrape_daraz_detail(url)
    if source == "olx":
        from scraping_engine.playwright_scraper.olx import scrape_olx_detail

        return scrape_olx_detail(url)
    if source == "priceoye":
        from scraping_engine.playwright_scraper.priceoye import scrape_priceoye_detail

        return scrape_priceoye_detail(url)
    if source == "amazon":
        from scraping_engine.playwright_scraper.amazon_oxylabs import scrape_amazon_detail

        return scrape_amazon_detail(url)
    raise ValueError("source must be one of: daraz, olx, priceoye, amazon") 