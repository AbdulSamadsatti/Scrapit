"""
Zameen.com scraper (Playwright, no login) — robust version.

Strategy (har step fallback ke saath):
  1) networkidle tak wait + listing anchor ka wait
  2) Extraction: pehle aria-label cards (Zameen inhe use karta hai),
     warna ANY anchor jo '/Property/' point karta ho usko climb karke
     price/title nikaalo (daraz fallback jaisa) — class names pe depend nahi.
  3) Diagnostic logging: page title, final URL, content length, kitne
     property-anchors mile — taake 0 result ki wajah log se pata chale.
"""

import asyncio
import logging
from typing import Any, Dict, List

from scraping_engine.configs.property_config import DEFAULT_USER_AGENT, PROPERTY_SOURCES
from scraping_engine.engine.browser import BrowserManager
from scraping_engine.playwright_scraper.property_common import (
    absolutize_url,
    listing_payload,
    slugify_query,
)

logger = logging.getLogger(__name__)

SOURCE = "zameen"
CFG = PROPERTY_SOURCES[SOURCE]

_LIST_JS = r"""() => {
    const out = [];
    const seen = new Set();
    const moneyRe = /(rs\.?|pkr|crore|lakh|lac|arab|₨)/i;
    const text = (el, sel) => { const x = el.querySelector(sel); return x ? (x.innerText||'').trim() : ''; };

    // 1) Primary: aria-label listing cards
    let cards = Array.from(document.querySelectorAll(
        'li[aria-label="Listing"], article[aria-label="Listing"], li[role="article"]'
    ));

    // 2) Fallback: koi bhi /Property/ anchor -> climb to container with price
    if (cards.length === 0) {
        const anchors = Array.from(document.querySelectorAll('a[href*="/Property/"]'));
        const set = new Set();
        for (const a of anchors) {
            let c = a;
            for (let i = 0; i < 5 && c.parentElement; i++) {
                c = c.parentElement;
                if (moneyRe.test(c.innerText || '')) break;
            }
            set.add(c);
        }
        cards = Array.from(set);
    }

    for (const card of cards) {
        try {
            const linkEl = card.querySelector('a[href*="/Property/"]')
                || (card.matches && card.matches('a[href*="/Property/"]') ? card : null);
            const href = linkEl ? (linkEl.href || linkEl.getAttribute('href') || '') : '';
            if (!href || seen.has(href)) continue;

            let title = text(card, 'h2[aria-label="Title"]') || text(card, 'h2')
                || (linkEl && (linkEl.getAttribute('title') || linkEl.getAttribute('aria-label'))) || '';

            let price = text(card, 'span[aria-label="Price"]') || text(card, '[aria-label="Price"]');
            if (!price) {
                const lines = (card.innerText || '').split('\n').map(s => s.trim()).filter(Boolean);
                price = lines.find(l => moneyRe.test(l)) || '';
            }

            const location = text(card, 'div[aria-label="Location"]') || text(card, '[aria-label="Location"]');
            const beds  = text(card, 'span[aria-label="Beds"]')  || text(card, '[aria-label="Beds"]');
            const baths = text(card, 'span[aria-label="Baths"]') || text(card, '[aria-label="Baths"]');
            const area  = text(card, 'span[aria-label="Area"]')  || text(card, '[aria-label="Area"]');

            const img = card.querySelector('img');
            const image = img ? (img.getAttribute('src') || img.getAttribute('data-src') || '') : '';

            if (!title && !price) continue;
            seen.add(href);
            out.push({ title: (title || '').trim(), price, location, beds, baths, area, listing_url: href, image_url: image });
        } catch (e) {}
    }

    return {
        items: out,
        debug: {
            ariaCards: document.querySelectorAll('li[aria-label="Listing"], article[aria-label="Listing"]').length,
            propAnchors: document.querySelectorAll('a[href*="/Property/"]').length,
            bodyLen: document.body ? document.body.innerText.length : 0
        }
    };
}"""

_DETAIL_JS = r"""() => {
    const text = (sel) => { const el = document.querySelector(sel); return el ? el.innerText.trim() : ''; };
    const attr = (sel, n) => { const el = document.querySelector(sel); return el ? (el.getAttribute(n) || '') : ''; };
    return {
        title: text('h1[aria-label="Property header"], h1'),
        price: text('span[aria-label="Price"], div[aria-label="Price"], [class*="price"]'),
        location: text('div[aria-label="Property location"], [aria-label="Location"]'),
        beds: text('span[aria-label="Beds"]'),
        baths: text('span[aria-label="Baths"]'),
        area: text('span[aria-label="Area"]'),
        description: text('div[aria-label="Property description"], [class*="description"], article'),
        agent_name: text('[aria-label="Agent name"], [class*="agent"], [class*="seller"]'),
        posted_at: text('[aria-label="Creation date"], time'),
        image_url: attr('img[aria-label="Cover Photo"], .gallery img, img[src*="zameen"]', 'src')
    };
}"""


def _prepare_page(page, url: str) -> None:
    page.goto(url, wait_until="domcontentloaded", timeout=60000)
    try:
        page.wait_for_load_state("networkidle", timeout=15000)
    except Exception:
        pass
    # listing anchors aane ka intezaar (SPA hydrate hone tak)
    try:
        page.wait_for_selector('a[href*="/Property/"]', timeout=15000)
    except Exception:
        pass
    for _ in range(8):
        page.evaluate("window.scrollBy(0, 1100)")
        page.wait_for_timeout(900)


def scrape_zameen_products(query: str, max_products: int = 20) -> Dict[str, Any]:
    try:
        asyncio.get_running_loop()
        import concurrent.futures

        with concurrent.futures.ThreadPoolExecutor(max_workers=1) as pool:
            return pool.submit(_scrape_zameen_products_sync, query, max_products).result(timeout=180)
    except RuntimeError:
        return _scrape_zameen_products_sync(query, max_products)


_ZAMEEN_CITY_ID = {
    "islamabad": 3,
    "lahore": 1,
    "karachi": 2,
    "rawalpindi": 41,
    "peshawar": 17,
    "multan": 15,
    "faisalabad": 16,
}

def _zameen_url(query: str) -> str:
    q_lower = query.lower()
    city = next((c for c in _ZAMEEN_CITY_ID if c in q_lower), "islamabad")
    city_id = _ZAMEEN_CITY_ID[city]
    
    # Simple mapping: if rent is in query, use /Rentals/, otherwise /Homes/
    if "rent" in q_lower or "rental" in q_lower:
        return f"{CFG['base_url']}/Rentals/{city.capitalize()}-{city_id}-1.html"
    return f"{CFG['base_url']}/Homes/{city.capitalize()}-{city_id}-1.html"


def _scrape_zameen_products_sync(query: str, max_products: int = 20) -> Dict[str, Any]:
    url = _zameen_url(query)
    listings: List[Dict[str, Any]] = []

    with BrowserManager(headless=True, user_agent=DEFAULT_USER_AGENT) as mgr:
        page = mgr.new_page()
        try:
            logger.info("[Zameen] Search: %s", url)
            _prepare_page(page, url)
            result = page.evaluate(_LIST_JS)
            # diagnostics
            try:
                logger.info(
                    "[Zameen] title=%r final_url=%s debug=%s",
                    page.title(), page.url, result.get("debug"),
                )
            except Exception:
                pass
            raw_items = result.get("items", []) if isinstance(result, dict) else (result or [])
        except Exception as exc:
            logger.error("[Zameen] Search failed: %s", exc)
            return {"data": [], "source": SOURCE, "count": 0, "error": str(exc)}

        for raw in raw_items[:max_products]:
            listings.append(listing_payload(
                source=SOURCE, source_label=CFG["label"],
                title=raw.get("title", ""), price=raw.get("price", ""),
                listing_url=absolutize_url(raw.get("listing_url", ""), CFG["base_url"]),
                image_url=absolutize_url(raw.get("image_url", ""), CFG["base_url"]),
                location=raw.get("location", ""), beds=raw.get("beds", ""),
                baths=raw.get("baths", ""), area=raw.get("area", ""), raw=raw,
            ))

    return {"data": listings, "source": SOURCE, "count": len(listings)}


def scrape_zameen_detail(url: str) -> Dict[str, Any]:
    with BrowserManager(headless=True, user_agent=DEFAULT_USER_AGENT) as mgr:
        page = mgr.new_page()
        page.goto(url, wait_until="domcontentloaded", timeout=60000)
        try:
            page.wait_for_load_state("networkidle", timeout=10000)
        except Exception:
            pass
        page.wait_for_timeout(2000)
        raw = page.evaluate(_DETAIL_JS)
    return listing_payload(
        source=SOURCE, source_label=CFG["label"],
        title=raw.get("title", ""), price=raw.get("price", ""), listing_url=url,
        image_url=absolutize_url(raw.get("image_url", ""), CFG["base_url"]),
        description=raw.get("description", ""), location=raw.get("location", ""),
        beds=raw.get("beds", ""), baths=raw.get("baths", ""), area=raw.get("area", ""),
        agent_name=raw.get("agent_name", ""), posted_at=raw.get("posted_at", ""), raw=raw,
    )