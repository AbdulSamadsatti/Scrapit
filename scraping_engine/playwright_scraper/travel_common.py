import logging
import re
import urllib.parse
from typing import Any, Dict, List

from scraping_engine.engine.browser import BrowserManager


logger = logging.getLogger(__name__)

USER_AGENT = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
    "AppleWebKit/537.36 (KHTML, like Gecko) "
    "Chrome/120.0.0.0 Safari/537.36"
)


TRAVEL_LIST_JS = """(siteConfig) => {
    const results = [];
    const seen = new Set();

    const isUsefulLink = (href) => {
        if (!href) return false;
        const bad = ['#', 'javascript:', 'mailto:', 'tel:', 'login', 'signup', 'privacy', 'terms'];
        const lower = href.toLowerCase();
        return !bad.some(part => lower.includes(part));
    };

    const clean = (value) => (value || '').replace(/\\s+/g, ' ').trim();

    const absUrl = (value) => {
        if (!value) return '';
        try { return new URL(value, window.location.href).href; }
        catch(e) { return value; }
    };

    const getImage = (root) => {
        const img = root.querySelector('img');
        if (!img) return '';
        const src = img.getAttribute('data-src') || img.getAttribute('data-lazy')
            || img.getAttribute('srcset')?.split(' ')[0] || img.src || '';
        if (/pixel|tracker|blank|placeholder|base64/i.test(src)) return '';
        return absUrl(src);
    };

    const getPrice = (text) => {
        const match = text.match(/(?:rs\\.?|pkr|usd|\\$|aed|gbp|eur|£|€)\\s*[0-9][0-9,]*(?:\\.\\d+)?/i);
        return match ? clean(match[0]) : '';
    };

    const cardSelectors = [
        '[data-testid*="card"]',
        '[class*="card"]',
        '[class*="Card"]',
        '[class*="package"]',
        '[class*="Package"]',
        '[class*="tour"]',
        '[class*="Tour"]',
        '[class*="hotel"]',
        '[class*="Hotel"]',
        '[class*="flight"]',
        '[class*="Flight"]',
        'article',
        'li'
    ];

    const cards = Array.from(document.querySelectorAll(cardSelectors.join(',')))
        .filter(card => clean(card.innerText).length > 25);

    for (const card of cards) {
        const linkEl = card.querySelector('a[href]') || card.closest('a[href]');
        const source_url = absUrl(linkEl ? linkEl.getAttribute('href') || linkEl.href : '');
        if (!isUsefulLink(source_url) || seen.has(source_url)) continue;

        const text = clean(card.innerText);
        const titleEl = card.querySelector('h1,h2,h3,h4,[class*="title"],[class*="Title"],[class*="name"],[class*="Name"]') || linkEl;
        const title = clean(titleEl ? titleEl.innerText : '');
        if (!title || title.length < 3 || title.length > 180) continue;

        seen.add(source_url);

        const price = getPrice(text);
        const image_url = getImage(card);
        const description = text.replace(title, '').replace(price, '').trim().slice(0, 1000);

        results.push({
            title,
            description,
            price,
            image_url,
            source_url,
            booking_url: source_url,
            location: '',
            offer_type: siteConfig.offer_type || 'travel',
            source: siteConfig.source,
            source_label: siteConfig.source_label,
            raw_text: text,
        });
    }

    if (results.length === 0) {
        const links = Array.from(document.querySelectorAll('a[href]'));
        for (const link of links) {
            const href = absUrl(link.getAttribute('href') || link.href);
            if (!isUsefulLink(href) || seen.has(href)) continue;
            const title = clean(link.innerText);
            if (!title || title.length < 5 || title.length > 160) continue;
            const lower = title.toLowerCase();
            if (/login|sign|privacy|terms|help|contact|about/.test(lower)) continue;
            seen.add(href);
            results.push({
                title,
                description: '',
                price: '',
                image_url: '',
                source_url: href,
                booking_url: href,
                location: '',
                offer_type: siteConfig.offer_type || 'travel',
                source: siteConfig.source,
                source_label: siteConfig.source_label,
                raw_text: title,
            });
        }
    }

    return results.slice(0, siteConfig.max_items || 20);
}"""


TRAVEL_DETAIL_JS = """() => {
    const clean = (value) => (value || '').replace(/\\s+/g, ' ').trim();
    const absUrl = (value) => {
        if (!value) return '';
        try { return new URL(value, window.location.href).href; }
        catch(e) { return value; }
    };

    const titleEl = document.querySelector('h1,h2,[class*="title"],[class*="Title"]');
    const title = clean(titleEl ? titleEl.innerText : document.title);

    const descSelectors = [
        '[class*="description"]',
        '[class*="Description"]',
        '[class*="overview"]',
        '[class*="Overview"]',
        '[class*="details"]',
        '[class*="Details"]',
        'article',
        'main'
    ];
    let description = '';
    for (const sel of descSelectors) {
        const el = document.querySelector(sel);
        if (el && clean(el.innerText).length > description.length) {
            description = clean(el.innerText);
        }
    }
    if (!description) description = clean(document.body.innerText).slice(0, 2500);

    const bodyText = clean(document.body.innerText);
    const priceMatch = bodyText.match(/(?:rs\\.?|pkr|usd|\\$|aed|gbp|eur|£|€)\\s*[0-9][0-9,]*(?:\\.\\d+)?/i);
    const price = priceMatch ? clean(priceMatch[0]) : '';

    const images = Array.from(document.querySelectorAll('img'))
        .map(img => img.getAttribute('data-src') || img.getAttribute('data-lazy') || img.src || '')
        .filter(src => src && !/pixel|tracker|blank|placeholder|base64/i.test(src))
        .map(absUrl);

    const bookingEl = document.querySelector(
        'a[href*="book"], a[href*="checkout"], a[href*="reserve"], a[href*="contact"], a[href*="flight"], a[href*="hotel"]'
    );
    const booking_url = bookingEl ? absUrl(bookingEl.getAttribute('href') || bookingEl.href) : window.location.href;

    return {
        title,
        description,
        price,
        image_url: images[0] || '',
        images,
        booking_url,
        source_url: window.location.href,
    };
}"""


def _run_async_safe(sync_fn, *args, **kwargs) -> Dict[str, Any]:
    import asyncio
    try:
        asyncio.get_running_loop()
        import concurrent.futures
        with concurrent.futures.ThreadPoolExecutor(max_workers=1) as pool:
            future = pool.submit(sync_fn, *args, **kwargs)
            return future.result(timeout=180)
    except RuntimeError:
        return sync_fn(*args, **kwargs)


def _clean_price(raw: str) -> str:
    if not raw:
        return ""
    return re.sub(r"\\s+", " ", raw).strip()


def _detect_currency(raw_price: str) -> str:
    value = (raw_price or "").lower()
    if "rs" in value or "pkr" in value:
        return "PKR"
    if "$" in raw_price or "usd" in value:
        return "USD"
    if "aed" in value:
        return "AED"
    if "£" in raw_price or "gbp" in value:
        return "GBP"
    if "€" in raw_price or "eur" in value:
        return "EUR"
    return ""


def _guess_location(text: str) -> str:
    if not text:
        return ""
    cities = [
        "Karachi", "Lahore", "Islamabad", "Rawalpindi", "Peshawar", "Quetta",
        "Hunza", "Skardu", "Naran", "Kaghan", "Murree", "Swat", "Gilgit",
        "Dubai", "Jeddah", "Riyadh", "Istanbul", "Baku", "Bangkok", "London",
    ]
    lower = text.lower()
    for city in cities:
        if city.lower() in lower:
            return city
    return ""


def _guess_offer_type(text: str, default: str = "travel") -> str:
    lower = (text or "").lower()
    if "flight" in lower or "airline" in lower:
        return "flight"
    if "hotel" in lower or "room" in lower or "stay" in lower:
        return "hotel"
    if "umrah" in lower:
        return "umrah"
    if "tour" in lower or "trip" in lower or "package" in lower or "trek" in lower:
        return "package"
    if "bus" in lower:
        return "bus"
    return default


def _looks_like_travel_listing(item: Dict[str, Any], source: str) -> bool:
    title = (item.get("title") or "").strip().lower()
    url = (item.get("source_url") or item.get("booking_url") or "").strip().lower()
    text = f"{title} {url} {item.get('description') or ''} {item.get('raw_text') or ''}".lower()

    blocked_terms = [
        "why book",
        "why kipgo",
        "blog",
        "blogs",
        "announcement",
        "announcements",
        "privacy",
        "terms",
        "contact",
        "about us",
        "careers",
        "login",
        "sign up",
        "faq",
        "help",
    ]
    if any(term in text for term in blocked_terms):
        return False

    blocked_url_parts = [
        "/why-",
        "/blog",
        "/blogs",
        "/announcement",
        "/announcements",
        "/privacy",
        "/terms",
        "/contact",
        "/about",
        "/login",
        "/signup",
    ]
    if any(part in url for part in blocked_url_parts):
        return False

    source_rules = {
        "kipgo": ["/tour/", "/stay/", "/activity/", "/experience/", "/rental/"],
        "sastaticket": ["/hotel", "/flight", "/umrah", "/bus", "/tour", "/holiday", "/package"],
        "bookme": ["/hotel", "/flight", "/bus", "/tour", "/travel", "/package"],
        "booking": ["/hotel", "/searchresults", "/city/", "/region/", "/landmark/"],
        "tripadvisor": ["/Hotel", "/Tourism", "/Attraction", "/Restaurant", "/VacationRental"],
        "jovago": ["/hotel", "/en-pk/"],
    }
    allowed_parts = source_rules.get(source, [])
    if allowed_parts and not any(part in url for part in allowed_parts):
        return False

    travel_words = [
        "tour",
        "trip",
        "package",
        "hotel",
        "flight",
        "bus",
        "umrah",
        "stay",
        "trek",
        "skardu",
        "hunza",
        "naran",
        "kaghan",
        "swat",
        "gilgit",
        "islamabad",
        "lahore",
        "karachi",
    ]
    has_travel_word = any(word in text for word in travel_words)
    has_price = bool(item.get("price"))

    return has_travel_word or has_price


def normalize_travel_item(raw: Dict[str, Any], source: str, source_label: str) -> Dict[str, Any]:
    raw_text = raw.get("raw_text") or raw.get("description") or raw.get("title") or ""
    price = _clean_price(raw.get("price", ""))
    offer_type = raw.get("offer_type") or _guess_offer_type(raw_text)
    location = raw.get("location") or _guess_location(raw_text)
    source_url = raw.get("source_url") or raw.get("booking_url") or ""

    return {
        "title": (raw.get("title") or "").strip(),
        "description": (raw.get("description") or "").strip(),
        "price": price,
        "currency": _detect_currency(price),
        "image_url": (raw.get("image_url") or "").strip(),
        "images": raw.get("images") or [],
        "location": location,
        "city": location,
        "country": raw.get("country") or "Pakistan",
        "offer_type": offer_type,
        "origin": raw.get("origin") or "",
        "destination": raw.get("destination") or location,
        "departure_at": raw.get("departure_at") or "",
        "return_at": raw.get("return_at") or "",
        "airline": raw.get("airline") or "",
        "hotel_name": raw.get("hotel_name") or "",
        "nights": raw.get("nights") or "",
        "travelers": raw.get("travelers") or "",
        "booking_url": raw.get("booking_url") or source_url,
        "source_url": source_url,
        "source": source,
        "source_label": source_label,
        "raw_data": raw,
    }


def scrape_travel_site(
    source: str,
    source_label: str,
    urls: List[str],
    query: str = "",
    max_items: int = 10,
    offer_type: str = "travel",
) -> Dict[str, Any]:
    return _run_async_safe(_scrape_travel_site_sync, source, source_label, urls, query, max_items, offer_type)


def _scrape_travel_site_sync(
    source: str,
    source_label: str,
    urls: List[str],
    query: str = "",
    max_items: int = 10,
    offer_type: str = "travel",
) -> Dict[str, Any]:
    logger.info("[%s] Travel query: '%s'", source_label, query)
    encoded_query = urllib.parse.quote(query or "travel")
    collected: List[Dict[str, Any]] = []
    seen = set()

    with BrowserManager(headless=True, user_agent=USER_AGENT) as mgr:
        page = mgr.new_page()

        for template in urls:
            if len(collected) >= max_items:
                break
            url = template.format(query=encoded_query)
            try:
                logger.info("[%s] Opening %s", source_label, url)
                page.goto(url, wait_until="domcontentloaded", timeout=45000)
                try:
                    page.wait_for_load_state("networkidle", timeout=20000)
                except Exception:
                    logger.info("[%s] Network idle timeout; continuing", source_label)

                for _ in range(5):
                    page.evaluate("window.scrollBy(0, 900)")
                    page.wait_for_timeout(700)

                raw_items = page.evaluate(
                    TRAVEL_LIST_JS,
                    {
                        "source": source,
                        "source_label": source_label,
                        "offer_type": offer_type,
                        "max_items": max_items,
                    },
                )

                for item in raw_items:
                    source_url = item.get("source_url") or item.get("booking_url")
                    if not source_url or source_url in seen:
                        continue
                    if not _looks_like_travel_listing(item, source):
                        continue
                    seen.add(source_url)
                    collected.append(item)
                    if len(collected) >= max_items:
                        break
            except Exception as exc:
                logger.warning("[%s] List page failed %s: %s", source_label, url, exc)

        enriched: List[Dict[str, Any]] = []
        for item in collected[:max_items]:
            detail_url = item.get("source_url") or item.get("booking_url")
            detail = {}
            if detail_url:
                try:
                    page.goto(detail_url, wait_until="domcontentloaded", timeout=45000)
                    try:
                        page.wait_for_load_state("networkidle", timeout=15000)
                    except Exception:
                        pass
                    detail = page.evaluate(TRAVEL_DETAIL_JS)
                except Exception as exc:
                    logger.info("[%s] Detail failed %s: %s", source_label, detail_url, exc)

            merged = {**item, **{k: v for k, v in detail.items() if v}}
            enriched.append(normalize_travel_item(merged, source, source_label))

    logger.info("[%s] Total travel items: %s", source_label, len(enriched))
    return {"data": enriched, "source": source, "count": len(enriched)}
