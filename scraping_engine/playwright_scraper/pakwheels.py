"""
PakWheels scraper — Playwright.

Scrapes used car listings from pakwheels.com search results.
Uses JSON-LD structured data embedded in each listing page.
"""

import asyncio
import json
import logging
import re
from typing import Any, Dict, List
from urllib.parse import quote as _q

from scraping_engine.engine.browser import BrowserManager

logger = logging.getLogger(__name__)

_BASE_URL = "https://www.pakwheels.com"
_SEARCH_URLS = [
    f"{_BASE_URL}/used-cars/search/-/",
    f"{_BASE_URL}/used-bikes/search/-/",
]
_USER_AGENT = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
    "AppleWebKit/537.36 (KHTML, like Gecko) "
    "Chrome/120.0.0.0 Safari/537.36"
)

_LIST_JS = """(maxItems) => {
    const results = [];
    const listings = document.querySelectorAll('li.classified-listing');

    for (const li of Array.from(listings).slice(0, maxItems)) {
        const ldScript = li.querySelector('script[type="application/ld+json"]');
        if (!ldScript) continue;

        let ld;
        try { ld = JSON.parse(ldScript.textContent); }
        catch(e) { continue; }

        const offers = ld.offers || {};
        let url = offers.url || '';
        if (url && !url.startsWith('http')) url = 'https://www.pakwheels.com' + url;

        const engine = ld.vehicleEngine || {};
        const brand = ld.brand || {};
        const desc = ld.description || '';

        let city = '';
        const cityMatch = desc.match(/for sale in (.+)$/i);
        if (cityMatch) city = cityMatch[1].trim();

        let imageUrl = ld.image || '';
        if (!imageUrl) {
            const img = li.querySelector('img[src*="pakwheels"]');
            if (img) imageUrl = img.src || '';
        }

        const priceAmount = offers.price || null;

        results.push({
            title: ld.name || '',
            description: desc,
            price: priceAmount ? 'PKR ' + Number(priceAmount).toLocaleString() : '',
            price_amount: priceAmount,
            currency: offers.priceCurrency || 'PKR',
            image_url: imageUrl,
            location: city,
            city: city,
            make: (brand.name || ld.manufacturer || ''),
            model: '',
            year: ld.modelDate || null,
            mileage: ld.mileageFromOdometer || '',
            fuel_type: ld.fuelType || '',
            transmission: ld.vehicleTransmission || '',
            engine_capacity: engine.engineDisplacement || '',
            body_type: '',
            color: '',
            condition: ld.itemCondition || 'used',
            listing_url: url,
            source: 'pakwheels',
            source_label: 'PakWheels',
        });
    }
    return results;
}"""


def scrape_pakwheels(query: str = "car", max_items: int = 20) -> List[Dict[str, Any]]:
    try:
        asyncio.get_running_loop()
        import concurrent.futures
        with concurrent.futures.ThreadPoolExecutor(max_workers=1) as pool:
            future = pool.submit(_scrape_sync, query, max_items)
            return future.result(timeout=120)
    except RuntimeError:
        return _scrape_sync(query, max_items)


def _scrape_sync(query: str, max_items: int) -> List[Dict[str, Any]]:
    logger.info("[PakWheels] Query: '%s'", query)
    all_items: List[Dict[str, Any]] = []

    with BrowserManager(headless=True, user_agent=_USER_AGENT) as mgr:
        page = mgr.new_page()
        for search_url in _SEARCH_URLS:
            if len(all_items) >= max_items:
                break
            url = f"{search_url}?q={_q(query)}"
            try:
                page.goto(url, wait_until="domcontentloaded", timeout=30000)
                page.wait_for_selector("li.classified-listing", timeout=10000)

                for _ in range(3):
                    page.evaluate("window.scrollBy(0, 1000)")
                    page.wait_for_timeout(500)

                remaining = max_items - len(all_items)
                items = page.evaluate(_LIST_JS, remaining)
                all_items.extend(items)
                logger.info("[PakWheels] %s → %d items", url.split("/search")[0].split("/")[-1], len(items))

            except Exception as exc:
                logger.warning("[PakWheels] %s failed: %s", search_url, exc)

    # Filter out items without images
    all_items = [i for i in all_items if i.get("image_url") and i.get("title")]
    logger.info("[PakWheels] '%s' → %d total (with images)", query, len(all_items))
    return all_items
