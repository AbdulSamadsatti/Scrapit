import asyncio
import logging
import urllib.parse
from typing import Any, Dict, List

from scraping_engine.configs.ecommerce_config import DEFAULT_USER_AGENT, ECOMMERCE_SOURCES
from scraping_engine.engine.browser import BrowserManager
from scraping_engine.playwright_scraper.ecommerce_common import absolutize_url, product_payload

logger = logging.getLogger(__name__)

SOURCE = "daraz"
CFG = ECOMMERCE_SOURCES[SOURCE]

_LIST_JS = """() => {
    const products = [];
    const seen = new Set();
    const selectors = [
        '[data-qa-locator="product-item"]',
        'div[data-tracking="product-card"]',
        'div.gridItem--Yd0sa',
        'div[class*="Bm3ON"]',
        'div[class*="product"]'
    ];
    const cards = Array.from(document.querySelectorAll(selectors.join(',')));

    for (const card of cards) {
        try {
            const linkEl = card.querySelector('a[href*="/products/"], a[href*="/p/"], a[href]');
            const titleEl = card.querySelector('[title], div[class*="RfADt"] a, a[title], a');
            const priceEl = card.querySelector('span[class*="ooOxS"], span[class*="price"], div[class*="price"]');
            const imgEl = card.querySelector('img');
            const ratingEl = card.querySelector('[class*="rating"], [class*="stars"]');
            const reviewsEl = card.querySelector('span[class*="qzqFw"], span[class*="review"], span[class*="rating-total"]');
            const sellerEl = card.querySelector('[class*="seller"], [class*="shop"]');
            const locEl = card.querySelector('[class*="location"], [class*="area"]');

            const href = linkEl ? (linkEl.href || linkEl.getAttribute('href') || '') : '';
            const title = (titleEl ? (titleEl.getAttribute('title') || titleEl.innerText) : '').trim();
            const price = priceEl ? priceEl.innerText.trim() : '';
            const image = imgEl ? (imgEl.getAttribute('data-src') || imgEl.getAttribute('src') || '') : '';
            if (!title || !href || seen.has(href)) continue;
            seen.add(href);

            products.push({
                title,
                price,
                product_url: href,
                image_url: image,
                rating: ratingEl ? ratingEl.innerText.trim() : '',
                review_count: reviewsEl ? reviewsEl.innerText.trim() : '',
                seller_name: sellerEl ? sellerEl.innerText.trim() : '',
                location: locEl ? locEl.innerText.trim() : '',
                availability: ''
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
    const descriptionSelectors = [
        '.html-content.detail-content',
        '[class*="pdp-product-detail"]',
        '[class*="description"]',
        '#module_product_detail'
    ];
    let description = '';
    for (const sel of descriptionSelectors) {
        const value = text(sel);
        if (value.length > 30) { description = value; break; }
    }
    return {
        title: text('h1, [class*="pdp-mod-product-badge-title"]'),
        price: text('[class*="pdp-price"], [class*="price"], .notranslate'),
        image_url: attr('img[class*="gallery"], img[src*="daraz"], .gallery-preview-panel img', 'src'),
        description,
        rating: text('[class*="score"], [class*="rating"]'),
        review_count: text('[class*="review"], [class*="count"]'),
        seller_name: text('[class*="seller-name"], [class*="seller"]'),
        availability: text('[class*="delivery"], [class*="stock"], [class*="quantity"]'),
        category: text('ul.breadcrumb, [class*="breadcrumb"]')
    };
}"""


def scrape_daraz_products(query: str, max_products: int = 20) -> Dict[str, Any]:
    try:
        asyncio.get_running_loop()
        import concurrent.futures

        with concurrent.futures.ThreadPoolExecutor(max_workers=1) as pool:
            return pool.submit(_scrape_daraz_products_sync, query, max_products).result(timeout=160)
    except RuntimeError:
        return _scrape_daraz_products_sync(query, max_products)


def _scrape_daraz_products_sync(query: str, max_products: int = 20) -> Dict[str, Any]:
    encoded = urllib.parse.quote_plus(query)
    url = CFG["search_url"].format(query=encoded)
    products: List[Dict[str, Any]] = []

    with BrowserManager(headless=True, user_agent=DEFAULT_USER_AGENT) as mgr:
        page = mgr.new_page()
        try:
            logger.info("[Daraz] Search: %s", url)
            page.goto(url, wait_until="domcontentloaded", timeout=45000)
            page.wait_for_timeout(3000)
            for _ in range(5):
                page.evaluate("window.scrollBy(0, 900)")
                page.wait_for_timeout(700)
            raw_products = page.evaluate(_LIST_JS)
        except Exception as exc:
            logger.error("[Daraz] Search failed: %s", exc)
            return {"data": [], "source": SOURCE, "count": 0, "error": str(exc)}

        for raw in raw_products[:max_products]:
            products.append(product_payload(
                source=SOURCE,
                source_label=CFG["label"],
                title=raw.get("title", ""),
                price=raw.get("price", ""),
                product_url=absolutize_url(raw.get("product_url", ""), CFG["base_url"]),
                image_url=absolutize_url(raw.get("image_url", ""), CFG["base_url"]),
                rating=raw.get("rating", ""),
                review_count=raw.get("review_count", ""),
                seller_name=raw.get("seller_name", ""),
                availability=raw.get("availability", ""),
                location=raw.get("location", ""),
                raw=raw,
            ))

    return {"data": products, "source": SOURCE, "count": len(products)}


def scrape_daraz_detail(url: str) -> Dict[str, Any]:
    with BrowserManager(headless=True, user_agent=DEFAULT_USER_AGENT) as mgr:
        page = mgr.new_page()
        page.goto(url, wait_until="domcontentloaded", timeout=45000)
        page.wait_for_timeout(2500)
        raw = page.evaluate(_DETAIL_JS)
    return product_payload(
        source=SOURCE,
        source_label=CFG["label"],
        title=raw.get("title", ""),
        price=raw.get("price", ""),
        product_url=url,
        image_url=absolutize_url(raw.get("image_url", ""), CFG["base_url"]),
        description=raw.get("description", ""),
        rating=raw.get("rating", ""),
        review_count=raw.get("review_count", ""),
        seller_name=raw.get("seller_name", ""),
        availability=raw.get("availability", ""),
        category=raw.get("category", ""),
        raw=raw,
    )