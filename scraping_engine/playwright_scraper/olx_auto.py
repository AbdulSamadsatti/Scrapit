"""
OLX Pakistan automobile scraper — Playwright.

Scrapes car listings from olx.com.pk. OLX is heavily JS-rendered,
making Playwright the right tool for reliable extraction.
"""

import asyncio
import logging
import re
from typing import Any, Dict, List
from urllib.parse import quote as _q

from scraping_engine.engine.browser import BrowserManager

logger = logging.getLogger(__name__)

_BASE_URL = "https://www.olx.com.pk"
_CATEGORY_URLS = [
    f"{_BASE_URL}/cars_c84",
    f"{_BASE_URL}/motorcycles_c81",
    f"{_BASE_URL}/bicycles_c88",
]
_USER_AGENT = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
    "AppleWebKit/537.36 (KHTML, like Gecko) "
    "Chrome/120.0.0.0 Safari/537.36"
)

_LIST_JS = """(maxItems) => {
    const results = [];
    const listings = document.querySelectorAll('li[aria-label="Listing"]');

    const parsePrice = (text) => {
        if (!text) return null;
        let cleaned = text.replace(/,/g, '').replace(/Rs/gi, '').replace(/PKR/gi, '').trim();
        const lacsMatch = cleaned.match(/([\\d.]+)\\s*[Ll]acs?/);
        if (lacsMatch) return Math.round(parseFloat(lacsMatch[1]) * 100000);
        const croreMatch = cleaned.match(/([\\d.]+)\\s*[Cc]rore/);
        if (croreMatch) return Math.round(parseFloat(croreMatch[1]) * 10000000);
        const digits = cleaned.replace(/[^\\d]/g, '');
        return digits ? parseInt(digits) : null;
    };

    for (const li of Array.from(listings).slice(0, maxItems)) {
        const title = (li.getAttribute('title') || '').trim();
        if (!title) continue;

        const texts = [];
        const walker = document.createTreeWalker(li, NodeFilter.SHOW_TEXT);
        while (walker.nextNode()) {
            const t = walker.currentNode.textContent.trim();
            if (t) texts.push(t);
        }

        let priceText = '';
        let year = null;
        let mileage = '';
        let fuelType = '';
        let location = '';
        let posted = '';

        for (const t of texts) {
            if (/^(Rs|PKR)/i.test(t)) priceText = t;
            else if (/^20[0-2]\\d$/.test(t) || /^19\\d\\d$/.test(t)) {
                if (!year) year = parseInt(t);
            }
            else if (/km/i.test(t) && !mileage) mileage = t;
            else if (/^(petrol|diesel|cng|hybrid|electric|lpg)$/i.test(t)) fuelType = t;
            else if (t.includes(',') && /[a-zA-Z]/.test(t) && !/ago/i.test(t)) {
                location = t.replace(/•/g, '').trim();
            }
            else if (/ago/i.test(t) || /^today$/i.test(t) || /^yesterday$/i.test(t)) {
                posted = t;
            }
        }

        const img = li.querySelector('img');
        const imageUrl = img ? (img.src || '') : '';

        let linkTag = li.querySelector('a[href*="/item/"]') || li.querySelector('a[href]');
        let listingUrl = '';
        if (linkTag) {
            const href = linkTag.getAttribute('href') || '';
            listingUrl = href.startsWith('http') ? href : 'https://www.olx.com.pk' + href;
        }

        const priceAmount = parsePrice(priceText);
        const parts = location.split(',').map(p => p.trim());
        const city = parts.length > 0 ? parts[parts.length - 1] : '';

        results.push({
            title,
            description: [fuelType, mileage].filter(Boolean).join(', '),
            price: priceText,
            price_amount: priceAmount,
            currency: 'PKR',
            image_url: imageUrl,
            location,
            city,
            make: '',
            model: '',
            year,
            mileage,
            fuel_type: fuelType,
            transmission: '',
            engine_capacity: '',
            body_type: '',
            color: '',
            condition: 'used',
            listing_url: listingUrl,
            source: 'olx',
            source_label: 'OLX Pakistan',
        });
    }
    return results;
}"""


def scrape_olx_auto(query: str = "car", max_items: int = 20) -> List[Dict[str, Any]]:
    try:
        asyncio.get_running_loop()
        import concurrent.futures
        with concurrent.futures.ThreadPoolExecutor(max_workers=1) as pool:
            future = pool.submit(_scrape_sync, query, max_items)
            return future.result(timeout=120)
    except RuntimeError:
        return _scrape_sync(query, max_items)


def _scrape_sync(query: str, max_items: int) -> List[Dict[str, Any]]:
    logger.info("[OLX Auto] Query: '%s'", query)
    all_items: List[Dict[str, Any]] = []

    with BrowserManager(headless=True, user_agent=_USER_AGENT) as mgr:
        page = mgr.new_page()
        for cat_url in _CATEGORY_URLS:
            if len(all_items) >= max_items:
                break
            url = f"{cat_url}?q={_q(query)}"
            try:
                page.goto(url, wait_until="domcontentloaded", timeout=30000)
                page.wait_for_selector('li[aria-label="Listing"]', timeout=10000)

                for _ in range(5):
                    page.evaluate("window.scrollBy(0, 800)")
                    page.wait_for_timeout(600)

                remaining = max_items - len(all_items)
                items = page.evaluate(_LIST_JS, remaining)
                all_items.extend(items)
                cat_name = cat_url.split("/")[-1].split("_")[0]
                logger.info("[OLX Auto] %s → %d items", cat_name, len(items))

            except Exception as exc:
                logger.warning("[OLX Auto] %s failed: %s", cat_url, exc)

    # Filter out items without images
    all_items = [i for i in all_items if i.get("image_url") and i.get("title")]
    logger.info("[OLX Auto] '%s' → %d total (with images)", query, len(all_items))
    return all_items
