"""
OLX.com.pk property scraper (Playwright).

Aap ke existing olx.py se derive kiya gaya hai — same selectors/structure,
bas query property ke liye hoti hai (e.g. "house for sale islamabad") aur
listing_payload use hota hai (product_payload ki jagah).
"""

import asyncio
import logging
import urllib.parse
from typing import Any, Dict, List

from scraping_engine.configs.property_config import (
    DEFAULT_USER_AGENT,
    PROPERTY_SOURCES,
)
from scraping_engine.engine.browser import BrowserManager
from scraping_engine.playwright_scraper.property_common import (
    absolutize_url,
    listing_payload,
)

logger = logging.getLogger(__name__)

SOURCE = "olx"
CFG = PROPERTY_SOURCES[SOURCE]

_LIST_JS = """() => {
    const products = [];
    const seen = new Set();
    const cards = Array.from(document.querySelectorAll(
        'li[aria-label="Listing"], li[aria-label], article, div[data-aut-id="itemBox"], a[href*="/item/"]'
    ));
    for (const node of cards) {
        try {
            const linkEl = node.matches('a') ? node : node.querySelector('a[href*="/item/"], a[href]');
            const titleEl = node.querySelector('[aria-label="Title"], [data-aut-id="itemTitle"], h2, h3, [class*="title"]') || linkEl;
            
            // Find price element: aria-label="Price" or containing "Rs"
            let priceEl = node.querySelector('[aria-label="Price"], [data-aut-id="itemPrice"], [class*="price"]');
            let price = priceEl ? priceEl.innerText.trim() : '';
            if (!price) {
                const spans = Array.from(node.querySelectorAll('span'));
                const rsSpan = spans.find(s => s.innerText && s.innerText.includes('Rs'));
                if (rsSpan) price = rsSpan.innerText.trim();
            }
            
            const locEl = node.querySelector('[aria-label="Location"], [data-aut-id="item-location"], [class*="location"]');
            const imgEl = node.querySelector('img');
            const href = linkEl ? linkEl.href : '';
            const title = titleEl ? titleEl.innerText.trim() : '';
            const image = imgEl ? (imgEl.getAttribute('src') || imgEl.getAttribute('data-src') || '') : '';
            if (!title || !href || seen.has(href)) continue;
            seen.add(href);
            products.push({
                title,
                price: price || '',
                listing_url: href,
                image_url: image,
                location: locEl ? locEl.innerText.trim() : '',
            });
        } catch(e) {}
    }
    return {
        items: products,
        debug: {
            itemBoxes: document.querySelectorAll('div[data-aut-id="itemBox"]').length,
            itemAnchors: document.querySelectorAll('a[href*="/item/"]').length,
            bodyLen: document.body ? document.body.innerText.length : 0
        }
    };
}"""

_DETAIL_JS = """() => {
    const text = (sel) => {
        const el = document.querySelector(sel);
        return el ? el.innerText.trim() : '';
    };
    const attr = (sel, name) => {
        const el = document.querySelector(sel);
        return el ? (el.getAttribute(name) || '') : '';
    };
    return {
        title: text('[aria-label="Title"], [data-aut-id="itemTitle"], h1, h2'),
        price: text('[aria-label="Price"], [data-aut-id="itemPrice"], [class*="price"]'),
        image_url: attr('img[src*="olx"], img', 'src'),
        description: text('[aria-label="Description"], [data-aut-id="itemDescriptionContent"], [class*="description"], section'),
        agent_name: text('[data-aut-id="profileCard"], [class*="seller"], [class*="user"]'),
        location: text('[aria-label="Location"], [data-aut-id="item-location"], [class*="location"]'),
        beds: text('[data-aut-id*="bedroom"], [class*="bed"]'),
        baths: text('[data-aut-id*="bathroom"], [class*="bath"]'),
        area: text('[data-aut-id*="area"], [class*="area"]'),
        category: text('[data-aut-id="breadcrumb"], [class*="breadcrumb"]')
    };
}"""


def scrape_olx_products(query: str, max_products: int = 20) -> Dict[str, Any]:
    try:
        asyncio.get_running_loop()
        import concurrent.futures

        with concurrent.futures.ThreadPoolExecutor(max_workers=1) as pool:
            return pool.submit(_scrape_olx_products_sync, query, max_products).result(timeout=130)
    except RuntimeError:
        return _scrape_olx_products_sync(query, max_products)


def _scrape_olx_products_sync(query: str, max_products: int = 20) -> Dict[str, Any]:
    # Determine OLX property category from query
    q_lower = query.lower()
    if "flat" in q_lower or "apartment" in q_lower:
        category_slug = "apartments-flats_c1725"
    else:
        # houses, plots, land, general property → houses category
        category_slug = "houses_c1721"

    # Extract city keyword — strip filler words, keep city name
    filler = {"houses", "house", "for", "sale", "rent", "in", "property", "flat",
              "apartment", "plot", "land", "islamabad", "karachi", "lahore",
              "rawalpindi", "faisalabad", "multan", "peshawar", "quetta", "sialkot"}
    city_map = {
        "islamabad": "islamabad", "rawalpindi": "rawalpindi",
        "lahore": "lahore", "karachi": "karachi",
        "faisalabad": "faisalabad", "multan": "multan",
        "peshawar": "peshawar", "quetta": "quetta", "sialkot": "sialkot",
    }
    city = next((city_map[c] for c in city_map if c in q_lower), "")
    keywords = city or "pakistan"

    # OLX property category URL: /houses_c1721/q-islamabad
    url = f"https://www.olx.com.pk/{category_slug}/q-{keywords}"
    listings: List[Dict[str, Any]] = []

    with BrowserManager(headless=True, user_agent=DEFAULT_USER_AGENT) as mgr:
        page = mgr.new_page()
        try:
            logger.info("[OLX-Property] Search: %s", url)
            page.goto(url, wait_until="domcontentloaded", timeout=45000)
            for _ in range(12):
                page.evaluate("window.scrollBy(0, 1000)")
                page.wait_for_timeout(800)
            result = page.evaluate(_LIST_JS)
            try:
                logger.info("[OLX-Property] title=%r final_url=%s debug=%s", page.title(), page.url, result.get("debug"))
            except Exception:
                pass
            raw_items = result.get("items", []) if isinstance(result, dict) else (result or [])
        except Exception as exc:
            logger.error("[OLX-Property] Search failed: %s", exc)
            return {"data": [], "source": SOURCE, "count": 0, "error": str(exc)}

        for raw in raw_items[:max_products]:
            listings.append(listing_payload(
                source=SOURCE,
                source_label=CFG["label"],
                title=raw.get("title", ""),
                price=raw.get("price", ""),
                listing_url=absolutize_url(raw.get("listing_url", ""), CFG["base_url"]),
                image_url=absolutize_url(raw.get("image_url", ""), CFG["base_url"]),
                location=raw.get("location", ""),
                raw=raw,
            ))

    return {"data": listings, "source": SOURCE, "count": len(listings)}



def scrape_olx_detail(url: str) -> Dict[str, Any]:
    with BrowserManager(headless=True, user_agent=DEFAULT_USER_AGENT) as mgr:
        page = mgr.new_page()
        try:
            page.goto(url, wait_until="commit", timeout=60000)
            page.wait_for_timeout(5000)
        except Exception as exc:
            logger.warning("[OLX-Property] Detail goto failed/timed out: %s", exc)
        raw = {}
        try:
            raw = page.evaluate(_DETAIL_JS)
        except Exception as exc:
            logger.error("[OLX-Property] Detail evaluation failed: %s", exc)
    return listing_payload(
        source=SOURCE,
        source_label=CFG["label"],
        title=raw.get("title", ""),
        price=raw.get("price", ""),
        listing_url=url,
        image_url=absolutize_url(raw.get("image_url", ""), CFG["base_url"]),
        description=raw.get("description", ""),
        agent_name=raw.get("agent_name", ""),
        location=raw.get("location", ""),
        beds=raw.get("beds", ""),
        baths=raw.get("baths", ""),
        area=raw.get("area", ""),
        category=raw.get("category", ""),
        raw=raw,
    )