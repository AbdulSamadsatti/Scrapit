"""
Shared ecommerce scraper configuration.

Keep selectors centralized so site HTML changes are easier to patch without
rewriting the scraper control flow.
"""

ECOMMERCE_SOURCES = {
    "daraz": {
        "label": "Daraz",
        "base_url": "https://www.daraz.pk",
        "search_url": "https://www.daraz.pk/catalog/?q={query}",
    },
    "olx": {
        "label": "OLX",
        "base_url": "https://www.olx.com.pk",
        "search_url": "https://www.olx.com.pk/items/q-{query}",
    },
    "priceoye": {
        "label": "PriceOye",
        "base_url": "https://priceoye.pk",
        "search_url": "https://priceoye.pk/search?q={query}",
    },
    "amazon": {
        "label": "Amazon",
        "base_url": "https://www.amazon.com",
    },
}

MAX_PRODUCTS_PER_SITE = 5  # Default limit for per‑site product count to avoid resource exhaustion

DEFAULT_USER_AGENT = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
    "AppleWebKit/537.36 (KHTML, like Gecko) "
    "Chrome/124.0.0.0 Safari/537.36"
)