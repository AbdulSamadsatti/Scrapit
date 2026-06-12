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

    // Helper to extract best available image from an element context
    function bestImage(container) {
        const imgEls = Array.from(container.querySelectorAll('img'));
        for (const imgEl of imgEls) {
            const attrs = ['src', 'data-ks-lazyload', 'data-src', 'data-original', 'data-lazy-src'];
            for (const attr of attrs) {
                let val = imgEl.getAttribute(attr) || '';
                val = val.trim();
                // Match actual product images, ignore small icons or 1x1 pixels
                if (val && !val.startsWith('data:') && val.length > 25 && !val.includes('placeholder') && !val.includes('blur')) {
                    if (val.toLowerCase().includes('/tfs/') || val.toLowerCase().includes('badge') || val.toLowerCase().includes('lazmall') || val.toLowerCase().includes('free_shipping') || val.toLowerCase().includes('dm')) continue;
                    if (val.startsWith('//')) return 'https:' + val;
                    return val;
                }
            }
            const srcset = imgEl.getAttribute('srcset') || '';
            if (srcset) {
                const first = srcset.split(',')[0].trim().split(' ')[0];
                if (first && !first.startsWith('data:') && first.length > 25) {
                    if (first.toLowerCase().includes('/tfs/') || first.toLowerCase().includes('badge') || first.toLowerCase().includes('lazmall')) continue;
                    if (first.startsWith('//')) return 'https:' + first;
                    return first;
                }
            }
        }
        
        // Also check background images
        const bgEls = Array.from(container.querySelectorAll('[style*="background-image"]'));
        for (const bgEl of bgEls) {
            const bg = bgEl.style.backgroundImage;
            const match = bg.match(/url\(["']?(.*?)["']?\)/);
            if (match && match[1] && !match[1].startsWith('data:')) {
                let val = match[1];
                if (val.startsWith('//')) return 'https:' + val;
                return val;
            }
        }

        // Fallback: Return first src that starts with http
        for (const imgEl of imgEls) {
            const src = (imgEl.getAttribute('src') || '').trim();
            if (src && src.startsWith('http')) return src;
        }

        return '';
    }

    for (const card of cards) {
        try {
            const linkEl = card.querySelector('a[href*="/products/"], a[href*="/p/"], a[href]');
            const titleEl = card.querySelector('[title], div[class*="RfADt"] a, a[title], a');
            const priceEl = card.querySelector('span[class*="ooOxS"], span[class*="price"], div[class*="price"]');
            const ratingEl = card.querySelector('[class*="rating"], [class*="stars"]');
            const reviewsEl = card.querySelector('span[class*="qzqFw"], span[class*="review"], span[class*="rating-total"]');
            const sellerEl = card.querySelector('[class*="seller"], [class*="shop"]');
            const locEl = card.querySelector('[class*="location"], [class*="area"]');

            const href = linkEl ? (linkEl.href || linkEl.getAttribute('href') || '') : '';
            const title = (titleEl ? (titleEl.getAttribute('title') || titleEl.innerText) : '').trim();
            const price = priceEl ? priceEl.innerText.trim() : '';
            const image = bestImage(card);
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

    if (products.length === 0) {
        const links = Array.from(document.querySelectorAll('a[href*="/products/"], a[href*="-i"]'));
        for (const link of links) {
            try {
                const href = link.href || link.getAttribute('href') || '';
                const title = (link.getAttribute('title') || link.innerText || '').trim();
                if (!title || !href || seen.has(href)) continue;
                if (title.length < 5) continue;
                
                let container = link.parentElement;
                for (let i = 0; i < 5; i++) {
                    if (!container) break;
                    if (container.innerText.includes('Rs.')) break;
                    container = container.parentElement;
                }
                
                let price = '';
                let image = '';
                if (container) {
                    const priceEl = container.querySelector('span[class*="price"], div[class*="price"], [class*="ooOxS"]');
                    price = priceEl ? priceEl.innerText.trim() : '';
                    image = bestImage(container);
                }

                seen.add(href);
                products.push({
                    title, price, product_url: href, image_url: image,
                    rating: '', review_count: '', seller_name: '', location: '', availability: ''
                });
            } catch (e) {}
        }
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
            try:
                page.goto(url, wait_until="domcontentloaded", timeout=25000)
            except Exception as e:
                logger.warning(f"[Daraz] page.goto timeout or error: {e}")
            page.wait_for_timeout(3000)
            for _ in range(8):
                page.evaluate("window.scrollBy(0, 900)")
                page.wait_for_timeout(800)
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
