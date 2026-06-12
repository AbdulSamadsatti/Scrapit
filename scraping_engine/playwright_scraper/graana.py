"""
Graana.com scraper (Playwright, no login) — robust version.

Graana ke listing pages SSR hain (e.g. /sale/residential-properties-sale-islamabad-1/)
aur har listing ek anchor hota hai jiska href '/property/...' hota hai, jismein
combined text: "PKR 5.5 Crore  house  amenity4 amenity5  5 marla  D-12, Islamabad ...".

Extraction: '/property/' anchors collect karo, innerText se price/beds/baths/area/
location regex se nikaalo. Class names pe depend nahi (woh change hote rehte hain).

URL: free-text query se city + purpose detect karke SSR listing URL banate hain.
"""

import asyncio
import logging
import re
from typing import Any, Dict, List

from scraping_engine.configs.property_config import DEFAULT_USER_AGENT, PROPERTY_SOURCES
from scraping_engine.engine.browser import BrowserManager
from scraping_engine.playwright_scraper.property_common import (
    absolutize_url,
    listing_payload,
)

logger = logging.getLogger(__name__)

SOURCE = "graana"
CFG = PROPERTY_SOURCES[SOURCE]

# Graana city -> location id (jo confirm hain). Unknown city = id ke bagair best-effort.
_GRAANA_CITY_ID = {
    "islamabad": 1,
    "karachi": 169,
    # niche wale ids confirm nahi — id ke bagair URL try hoga (redirect/empty ho to log mein dikhega)
    "lahore": None,
    "rawalpindi": None,
    "faisalabad": None,
    "multan": None,
    "peshawar": None,
}


def _graana_url(query: str) -> str:
    q = query.lower()
    purpose = "rent" if ("rent" in q or "rental" in q) else "sale"
    city = next((c for c in _GRAANA_CITY_ID if c in q), "islamabad")
    city_id = _GRAANA_CITY_ID.get(city)
    slug = f"residential-properties-{purpose}-{city}"
    if city_id is not None:
        slug = f"{slug}-{city_id}"
    return f"{CFG['base_url']}/{purpose}/{slug}/"


_LIST_JS = r"""() => {
    const out = [];
    const seen = new Set();
    const anchors = Array.from(document.querySelectorAll('a[href*="/property/"]'));

    function bestImage(container) {
        if (!container) return '';
        // Try all img tags inside the anchor
        const imgs = Array.from(container.querySelectorAll('img'));
        // Also try picture > source srcset
        const sources = Array.from(container.querySelectorAll('picture source, source[srcset]'));

        const candidates = [];

        for (const img of imgs) {
            // Try multiple attributes in priority order
            const attrs = [
                img.getAttribute('data-src'),
                img.getAttribute('data-lazy-src'),
                img.getAttribute('data-original'),
                img.getAttribute('data-srcset') ? img.getAttribute('data-srcset').split(',')[0].trim().split(' ')[0] : null,
                img.getAttribute('srcset') ? img.getAttribute('srcset').split(',')[0].trim().split(' ')[0] : null,
                img.getAttribute('src'),
            ];
            for (const val of attrs) {
                if (!val) continue;
                if (val.startsWith('data:')) continue;              // base64 placeholder
                if (/placeholder|blur|pixel|1x1|spinner/i.test(val)) continue;
                candidates.push(val);
            }
        }

        for (const src of sources) {
            const ss = src.getAttribute('srcset') || '';
            const first = ss.split(',')[0].trim().split(' ')[0];
            if (first && !first.startsWith('data:') && !/placeholder|blur/i.test(first)) {
                candidates.push(first);
            }
        }

        // Also check background images
        const bgEls = Array.from(container.querySelectorAll('[style*="background-image"]'));
        for (const bgEl of bgEls) {
            const bg = bgEl.style.backgroundImage;
            const match = bg.match(/url\(["']?(.*?)["']?\)/);
            if (match && match[1] && !match[1].startsWith('data:')) {
                candidates.push(match[1]);
            }
        }

        // Prefer URLs with graana/property/image/next in path, otherwise take first candidate
        const graanaImg = candidates.find(u => /graana|property|upload|image|next/i.test(u));
        return graanaImg || candidates[0] || '';
    }

    for (const a of anchors) {
        try {
            const href = a.href || a.getAttribute('href') || '';
            if (!href || seen.has(href)) continue;
            const t = (a.innerText || '').replace(/\s+/g, ' ').trim();
            if (!t) continue;
            seen.add(href);

            let card = a;
            while (card.parentElement && card.parentElement.tagName !== 'BODY') {
                const parent = card.parentElement;
                // If the parent contains multiple property links, we've climbed too far (into the list container)
                if (parent.querySelectorAll('a[href*="/property/"]').length > 1) {
                    break;
                }
                card = parent;
                if (card.querySelector('img') || card.querySelector('picture')) {
                    break; // Found a safe container that holds the image
                }
            }

            // price
            let price = '';
            const pm = t.match(/(?:pkr|rs\.?)\s*[\d.,]+\s*(?:crore|lakh|lac|arab|thousand|k)?/i);
            if (pm) price = pm[0].trim();

            // area
            let area = '';
            const am = t.match(/[\d.,]+\s*(?:marla|kanal|sqft|sq\.?\s*ft|sq\s*yd|sq\.?\s*m)/i);
            if (am) area = am[0].trim();

            // property type
            let ptype = '';
            const ty = t.match(/\b(house|flat|apartment|plot|shop|office|building|farmhouse|penthouse|portion|room)\b/i);
            if (ty) ptype = ty[1].toLowerCase();

            // purpose from URL
            let purpose = href.includes('/rent/') ? 'rent' : 'sale';

            // title from URL slug
            let title = '';
            const slugMatch = href.match(/\/property\/([^/]+?)-\d+\/?$/);
            if (slugMatch) title = slugMatch[1].replace(/-/g, ' ').trim();
            if (!title) title = t.slice(0, 80);

            // location: look for city-like text after last comma or at end
            let location = '';
            const locMatch = t.match(/(?:,\s*)([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)(?:\s*$|\s*\n)/);
            if (locMatch) location = locMatch[1].trim();

            const image_url = bestImage(card);

            // Build synthetic description when card has no text description
            const parts = [];
            if (ptype) parts.push(ptype.charAt(0).toUpperCase() + ptype.slice(1));
            if (purpose) parts.push(`for ${purpose}`);
            if (area) parts.push(`• ${area}`);
            if (location) parts.push(`in ${location}`);
            const description = parts.join(' ') || title;

            out.push({
                title, price, area, property_type: ptype,
                listing_url: href,
                image_url,
                location,
                description,
                raw_text: t
            });
        } catch (e) {}
    }
    return { items: out, debug: { propAnchors: anchors.length, bodyLen: document.body ? document.body.innerText.length : 0 } };
}"""




def scrape_graana_products(query: str, max_products: int = 20) -> Dict[str, Any]:
    try:
        asyncio.get_running_loop()
        import concurrent.futures

        with concurrent.futures.ThreadPoolExecutor(max_workers=1) as pool:
            return pool.submit(_scrape_graana_products_sync, query, max_products).result(timeout=170)
    except RuntimeError:
        return _scrape_graana_products_sync(query, max_products)


def _scrape_graana_products_sync(query: str, max_products: int = 20) -> Dict[str, Any]:
    url = _graana_url(query)
    listings: List[Dict[str, Any]] = []

    with BrowserManager(headless=True, user_agent=DEFAULT_USER_AGENT) as mgr:
        page = mgr.new_page()
        try:
            logger.info("[Graana] Search: %s", url)
            page.goto(url, wait_until="domcontentloaded", timeout=60000)
            try:
                page.wait_for_load_state("networkidle", timeout=15000)
            except Exception:
                pass
            try:
                page.wait_for_selector('a[href*="/property/"]', timeout=15000)
            except Exception:
                pass
            for _ in range(6):
                page.evaluate("window.scrollBy(0, 1100)")
                page.wait_for_timeout(900)
            result = page.evaluate(_LIST_JS)
            try:
                logger.info("[Graana] title=%r final_url=%s debug=%s", page.title(), page.url, result.get("debug"))
            except Exception:
                pass
            raw_items = result.get("items", []) if isinstance(result, dict) else (result or [])
        except Exception as exc:
            logger.error("[Graana] Search failed: %s", exc)
            return {"data": [], "source": SOURCE, "count": 0, "error": str(exc)}

        # location query se infer (Graana card mein location alag se reliable nahi)
        loc_guess = next((c.title() for c in _GRAANA_CITY_ID if c in query.lower()), "")

        for raw in raw_items[:max_products]:
            # Use JS-extracted location if available, otherwise infer from query
            location = raw.get("location") or loc_guess
            description = raw.get("description") or ""
            listings.append(listing_payload(
                source=SOURCE, source_label=CFG["label"],
                title=raw.get("title", ""), price=raw.get("price", ""),
                listing_url=absolutize_url(raw.get("listing_url", ""), CFG["base_url"]),
                image_url=absolutize_url(raw.get("image_url", ""), CFG["base_url"]),
                area=raw.get("area", ""), property_type=raw.get("property_type", ""),
                location=location, description=description, raw=raw,
            ))

    return {"data": listings, "source": SOURCE, "count": len(listings)}


_DETAIL_JS = r"""() => {
    const text = (sel) => { const el = document.querySelector(sel); return el ? el.innerText.trim() : ''; };
    const attr = (sel, n) => { const el = document.querySelector(sel); return el ? (el.getAttribute(n) || '') : ''; };

    // Robust description finder: look for a sibling/nearby block after the heading/price
    let description = '';
    const descSelectors = [
        '#description', '[id*="description"]',
        '[class*="description"]', '[class*="desc-content"]',
        '[class*="detail-content"]', '[class*="property-desc"]',
        'article', 'section[class*="content"]'
    ];
    for (const sel of descSelectors) {
        const el = document.querySelector(sel);
        if (el) {
            const t = (el.innerText || '').trim();
            if (t && t.length > 80) { description = t; break; }
        }
    }
    if (!description) {
        // Walk all divs/sections, find longest text block between 100-8000 chars
        let best = '';
        document.querySelectorAll('div, section, p').forEach(el => {
            const t = (el.innerText || '').trim();
            if (t.length > best.length && t.length > 100 && t.length < 8000 && t.split(' ').length > 20) {
                best = t;
            }
        });
        description = best;
    }

    // Image: prefer slider/gallery image; fall back to any graana.com image
    let image_url = '';
    const sliderImg = document.querySelector('img[alt="sliderCard"], [class*="gallery"] img[src*="_next/image"], [class*="slider"] img');
    if (sliderImg) image_url = sliderImg.getAttribute('src') || '';
    if (!image_url) image_url = attr('img[src*="graana"], img[src*="_next/image"]', 'src');

    return {
        title: text('h1, [class*="title"]'),
        price: text('[class*="price"], [class*="Price"]'),
        location: text('[class*="location"], [class*="address"]'),
        agent_name: text('[class*="agent"], [class*="seller"], [class*="author"]'),
        description,
        image_url
    };
}"""


def scrape_graana_detail(url: str) -> Dict[str, Any]:
    with BrowserManager(headless=True, user_agent=DEFAULT_USER_AGENT) as mgr:
        page = mgr.new_page()
        page.goto(url, wait_until="domcontentloaded", timeout=60000)
        try:
            page.wait_for_load_state("networkidle", timeout=10000)
        except Exception:
            pass
        page.wait_for_timeout(1500)
        raw = page.evaluate(_DETAIL_JS)
    return listing_payload(
        source=SOURCE, source_label=CFG["label"],
        title=raw.get("title", ""), price=raw.get("price", ""), listing_url=url,
        image_url=absolutize_url(raw.get("image_url", ""), CFG["base_url"]),
        description=raw.get("description", ""), location=raw.get("location", ""),
        agent_name=raw.get("agent_name", ""), raw=raw,
    )