import asyncio
import logging
import urllib.parse
from typing import Any, Dict, List

from scraping_engine.configs.ecommerce_config import DEFAULT_USER_AGENT, ECOMMERCE_SOURCES
from scraping_engine.engine.browser import BrowserManager
from scraping_engine.playwright_scraper.ecommerce_common import absolutize_url, product_payload

logger = logging.getLogger(__name__)

SOURCE = "olx"
CFG = ECOMMERCE_SOURCES[SOURCE]

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
            const spans = Array.from(node.querySelectorAll('span'));
            const rsSpan = spans.find(s => s.innerText && s.innerText.includes('Rs'));
            const priceEl = node.querySelector('[aria-label="Price"], [data-aut-id="itemPrice"], [class*="price"]');
            const locEl = node.querySelector('[aria-label="Location"], [data-aut-id="item-location"], [class*="location"]');
            const imgEl = node.querySelector('img');
            const href = linkEl ? linkEl.href : '';
            const title = titleEl ? titleEl.innerText.trim() : '';
            const price = rsSpan ? rsSpan.innerText.trim() : (priceEl ? priceEl.innerText.trim() : '');
            const image = imgEl ? (imgEl.getAttribute('src') || imgEl.getAttribute('data-src') || '') : '';
            if (!title || !href || seen.has(href)) continue;
            seen.add(href);
            products.push({
                title,
                price,
                product_url: href,
                image_url: image,
                location: locEl ? locEl.innerText.trim() : '',
                availability: 'listed'
            });
        } catch(e) {}
    }
    return products;
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
        seller_name: text('[data-aut-id="profileCard"], [class*="seller"], [class*="user"]'),
        location: text('[aria-label="Location"], [data-aut-id="item-location"], [class*="location"]'),
        availability: 'listed',
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
    encoded = urllib.parse.quote_plus(query).replace("+", "-")
    url = CFG["search_url"].format(query=encoded)
    products: List[Dict[str, Any]] = []

    with BrowserManager(headless=True, user_agent=DEFAULT_USER_AGENT) as mgr:
        page = mgr.new_page()
        try:
            logger.info("[OLX] Search: %s", url)
            # Increase page load timeout to 45 seconds
            page.goto(url, wait_until="domcontentloaded", timeout=45000)
            # Additional scroll attempts for lazy loading
            for _ in range(12):
                page.evaluate("window.scrollBy(0, 1000)")
                page.wait_for_timeout(1000)
            raw_products = page.evaluate(_LIST_JS)
        except Exception as exc:
            logger.error("[OLX] Search failed: %s", exc)
            return {"data": [], "source": SOURCE, "count": 0, "error": str(exc)}

        for raw in raw_products[:max_products]:
            products.append(product_payload(
                source=SOURCE,
                source_label=CFG["label"],
                title=raw.get("title", ""),
                price=raw.get("price", ""),
                product_url=absolutize_url(raw.get("product_url", ""), CFG["base_url"]),
                image_url=absolutize_url(raw.get("image_url", ""), CFG["base_url"]),
                location=raw.get("location", ""),
                availability=raw.get("availability", ""),
                raw=raw,
            ))

    return {"data": products, "source": SOURCE, "count": len(products)}


def scrape_olx_detail(url: str) -> Dict[str, Any]:
    with BrowserManager(headless=True, user_agent=DEFAULT_USER_AGENT) as mgr:
        page = mgr.new_page()
        try:
            page.goto(url, wait_until="commit", timeout=60000)
            page.wait_for_timeout(5000)
        except Exception as exc:
            logger.warning("[OLX] Detail page goto failed or timed out: %s", exc)
        raw = {}
        try:
            raw = page.evaluate(_DETAIL_JS)
        except Exception as exc:
            logger.error("[OLX] Detail evaluation failed: %s", exc)
    return product_payload(
        source=SOURCE,
        source_label=CFG["label"],
        title=raw.get("title", ""),
        price=raw.get("price", ""),
        product_url=url,
        image_url=absolutize_url(raw.get("image_url", ""), CFG["base_url"]),
        description=raw.get("description", ""),
        seller_name=raw.get("seller_name", ""),
        availability=raw.get("availability", ""),
        location=raw.get("location", ""),
        category=raw.get("category", ""),
        raw=raw,
    )
