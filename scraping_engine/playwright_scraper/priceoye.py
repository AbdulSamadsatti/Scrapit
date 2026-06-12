import asyncio
import logging
import urllib.parse
from typing import Any, Dict, List

from scraping_engine.configs.ecommerce_config import DEFAULT_USER_AGENT, ECOMMERCE_SOURCES
from scraping_engine.engine.browser import BrowserManager
from scraping_engine.playwright_scraper.ecommerce_common import absolutize_url, product_payload

logger = logging.getLogger(__name__)

SOURCE = "priceoye"
CFG = ECOMMERCE_SOURCES[SOURCE]

_LIST_JS = """() => {
    const products = [];
    const seen = new Set();

    // Helper to extract best available image from an element context
    function bestImage(container) {
        const imgEl = container.querySelector('img');
        if (!imgEl) return '';
        const attrs = ['data-src', 'data-original', 'data-lazy-src', 'src'];
        for (const attr of attrs) {
            let val = imgEl.getAttribute(attr) || '';
            val = val.trim();
            if (val && !val.startsWith('data:') && !val.includes('placeholder') && !val.includes('blur') && val.length > 8) {
                if (val.startsWith('//')) return 'https:' + val;
                return val;
            }
        }
        const srcset = imgEl.getAttribute('srcset') || '';
        if (srcset) {
            const first = srcset.split(',')[0].trim().split(' ')[0];
            if (first && !first.startsWith('data:') && first.length > 8) {
                if (first.startsWith('//')) return 'https:' + first;
                return first;
            }
        }
        return '';
    }

    const cards = Array.from(document.querySelectorAll(
        '.productBox, .product-box, .product-card, a[href*="/mobiles/"], a[href*="/laptops/"], a[href*="/products/"]'
    ));
    for (const node of cards) {
        try {
            const card = node.matches('a') ? node : node;
            const linkEl = card.matches('a') ? card : card.querySelector('a[href]');
            const titleEl = card.querySelector('.p-title, .product-title, h1, h2, h3, h4, [class*="title"], [class*="product-name"], a[title]') || linkEl;
            const priceEl = card.querySelector('.price-box, .p-price, .product-price, .price, span[class*="price"], div[class*="price"]');
            const href = linkEl ? linkEl.href : '';
            const title = titleEl ? titleEl.innerText.trim() : '';
            const price = priceEl ? priceEl.innerText.trim() : '';
            if (!price) continue;
            const image = bestImage(card);
            if (!title || !href || seen.has(href)) continue;
            seen.add(href);
            products.push({ title, price, product_url: href, image_url: image });
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
        title: text('h1, .product-title, [class*="title"]'),
        price: text('.summary-price, .price-box, .p-price, [class*="price"]'),
        image_url: attr('.product-gallery img, .product-img img, img[src*="priceoye"], .product-gallery amp-img, .product-img amp-img, amp-img[src*="priceoye"]', 'src'),
        description: text('.product-description, .description, [class*="description"], .specifications'),
        rating: text('[class*="rating"], [class*="stars"]'),
        review_count: text('[class*="review"]'),
        availability: text('[class*="stock"], [class*="availability"]'),
        category: text('.breadcrumb, [class*="breadcrumb"]')
    };
}"""


def scrape_priceoye_products(query: str, max_products: int = 20) -> Dict[str, Any]:
    try:
        asyncio.get_running_loop()
        import concurrent.futures

        with concurrent.futures.ThreadPoolExecutor(max_workers=1) as pool:
            return pool.submit(_scrape_priceoye_products_sync, query, max_products).result(timeout=130)
    except RuntimeError:
        return _scrape_priceoye_products_sync(query, max_products)


def _scrape_priceoye_products_sync(query: str, max_products: int = 20) -> Dict[str, Any]:
    encoded = urllib.parse.quote_plus(query)
    url = CFG["search_url"].format(query=encoded)
    products: List[Dict[str, Any]] = []

    with BrowserManager(headless=True, user_agent=DEFAULT_USER_AGENT) as mgr:
        page = mgr.new_page()
        try:
            logger.info("[PriceOye] Search: %s", url)
            page.goto(url, wait_until="domcontentloaded", timeout=35000)
            page.wait_for_timeout(2500)
            for _ in range(4):
                page.evaluate("window.scrollBy(0, 800)")
                page.wait_for_timeout(500)
            raw_products = page.evaluate(_LIST_JS)
        except Exception as exc:
            logger.error("[PriceOye] Search failed: %s", exc)
            return {"data": [], "source": SOURCE, "count": 0, "error": str(exc)}

        for raw in raw_products[:max_products]:
            products.append(product_payload(
                source=SOURCE,
                source_label=CFG["label"],
                title=raw.get("title", ""),
                price=raw.get("price", ""),
                product_url=absolutize_url(raw.get("product_url", ""), CFG["base_url"]),
                image_url=absolutize_url(raw.get("image_url", ""), CFG["base_url"]),
                raw=raw,
            ))

    return {"data": products, "source": SOURCE, "count": len(products)}


def scrape_priceoye_detail(url: str) -> Dict[str, Any]:
    with BrowserManager(headless=True, user_agent=DEFAULT_USER_AGENT) as mgr:
        page = mgr.new_page()
        page.goto(url, wait_until="domcontentloaded", timeout=35000)
        page.wait_for_timeout(2000)
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
        availability=raw.get("availability", ""),
        category=raw.get("category", ""),
        raw=raw,
    )
