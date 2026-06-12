"""
Booking.com travel scraper — Playwright.

Custom scraper using Booking.com's data-testid property cards.
Forces PKR currency and Pakistan-only results.
"""

import asyncio
import logging
import re
from datetime import date, timedelta
from typing import Any, Dict, List
from urllib.parse import quote as _q

from scraping_engine.engine.browser import BrowserManager

logger = logging.getLogger(__name__)

_USER_AGENT = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
    "AppleWebKit/537.36 (KHTML, like Gecko) "
    "Chrome/120.0.0.0 Safari/537.36"
)

_LIST_JS = r"""(maxItems) => {
    const cards = document.querySelectorAll('[data-testid="property-card"]');
    const results = [];
    const seen = new Set();

    for (const card of Array.from(cards).slice(0, maxItems)) {
        const titleEl = card.querySelector('[data-testid="title"]');
        const title = titleEl ? titleEl.innerText.trim() : '';
        if (!title || seen.has(title)) continue;
        seen.add(title);

        const imgEl = card.querySelector('img[src*="bstatic.com/xdata"]');
        const image_url = imgEl ? imgEl.src.replace('square240', 'square600') : '';
        if (!image_url) continue;

        const linkEl = card.querySelector('a[data-testid="title-link"]');
        const source_url = linkEl ? linkEl.href.split('?')[0] : '';

        const addressEl = card.querySelector('[data-testid="address"]');
        const location = addressEl ? addressEl.innerText.trim() : '';

        const reviewEl = card.querySelector('[data-testid="review-score"]');
        const review = reviewEl ? reviewEl.innerText.trim() : '';

        const allText = card.innerText;
        const priceMatch = allText.match(/PKR\s*([\d,]+)/i);
        const price = priceMatch ? 'PKR ' + priceMatch[1] : '';
        const priceAmount = priceMatch ? parseInt(priceMatch[1].replace(/,/g, '')) : null;

        let description = '';
        if (review) description = review.split('\n').slice(0, 2).join(' • ');

        results.push({
            title,
            description,
            price,
            price_amount: priceAmount,
            currency: 'PKR',
            image_url,
            location,
            city: location.split(',').pop().trim() || '',
            country: 'Pakistan',
            offer_type: 'hotel',
            source_url,
            booking_url: source_url,
            source: 'booking',
            source_label: 'Booking.com',
        });
    }
    return results;
}"""


def scrape_booking_travel(query: str = "Pakistan hotels", max_items: int = 10) -> Dict[str, Any]:
    try:
        asyncio.get_running_loop()
        import concurrent.futures
        with concurrent.futures.ThreadPoolExecutor(max_workers=1) as pool:
            future = pool.submit(_scrape_sync, query, max_items)
            return future.result(timeout=120)
    except RuntimeError:
        return _scrape_sync(query, max_items)


def _scrape_sync(query: str, max_items: int) -> Dict[str, Any]:
    q = query if "pakistan" in query.lower() else f"{query} Pakistan"
    logger.info("[Booking.com] Query: '%s'", q)

    checkin = (date.today() + timedelta(days=7)).isoformat()
    checkout = (date.today() + timedelta(days=8)).isoformat()
    url = (
        f"https://www.booking.com/searchresults.html"
        f"?ss={_q(q)}&dest_type=city&lang=en-us"
        f"&selected_currency=PKR&checkin={checkin}&checkout={checkout}"
    )

    with BrowserManager(headless=True, user_agent=_USER_AGENT) as mgr:
        page = mgr.new_page()
        try:
            page.goto(url, wait_until="domcontentloaded", timeout=30000)
            page.wait_for_timeout(8000)

            for _ in range(5):
                page.evaluate("window.scrollBy(0, 800)")
                page.wait_for_timeout(800)

            items = page.evaluate(_LIST_JS, max_items)
            logger.info("[Booking.com] '%s' → %d hotels (with images)", q, len(items))
            return {"data": items, "source": "booking", "count": len(items)}

        except Exception as exc:
            logger.error("[Booking.com] Scrape failed: %s", exc)
            return {"data": [], "source": "booking", "count": 0}
