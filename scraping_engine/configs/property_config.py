"""
Shared property / real-estate scraper configuration.

Same idea as ecommerce_config.py — selectors aur URLs ek jagah centralize hain
taake site HTML change hone par scraper ka control-flow chherne ki zaroorat na ho,
sirf yeh file patch karni padti hai.

Teen sources:
  - zameen   -> Playwright (Zameen.com, Pakistan ka #1 portal)
  - olx      -> Playwright (OLX.com.pk property section)
  - graana   -> Playwright (Graana.com)

NOTE: Zameen aur Graana free-text "?q=" search use nahi karte, woh slug-based
URLs use karte hain. Is liye query ko slug mein convert karte hain
(spaces -> hyphens). OLX generic q-search support karta hai.
"""

PROPERTY_SOURCES = {
    "zameen": {
        "label": "Zameen",
        "base_url": "https://www.zameen.com",
        # /s/<slug>/ Zameen ka free-text keyword search endpoint hai.
        # e.g. https://www.zameen.com/s/houses-for-sale-in-islamabad/
        "search_url": "https://www.zameen.com/s/{slug}/",
        "url_style": "slug",
    },
    "olx": {
        "label": "OLX",
        "base_url": "https://www.olx.com.pk",
        # OLX generic items search; property queries (e.g. "house for sale islamabad")
        # property results surface kar dete hain. Optional category scope niche.
        "search_url": "https://www.olx.com.pk/items/q-{query}",
        "url_style": "query",
    },
    "graana": {
        "label": "Graana",
        "base_url": "https://www.graana.com",
        # Graana bhi slug-based hai. /search/ generic listing slug.
        # e.g. https://www.graana.com/search/houses-for-sale-in-islamabad
        "search_url": "https://www.graana.com/search/{slug}",
        "url_style": "slug",
    },
}

# Per-site listing limit (resource exhaustion avoid karne ke liye)
MAX_LISTINGS_PER_SITE = 20

DEFAULT_USER_AGENT = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
    "AppleWebKit/537.36 (KHTML, like Gecko) "
    "Chrome/124.0.0.0 Safari/537.36"
)

# ---------------------------------------------------------------------------
# CSS / aria-label selectors (centralized — linkdin_config.py jaisa style)
# ---------------------------------------------------------------------------
# Zameen heavily relies on aria-label attributes which are far more stable than
# their obfuscated class names — is liye unhi ko prefer kiya hai, with class
# fallbacks just in case.
ZAMEEN_SELECTORS = {
    "card": (
        'li[role="article"], article[aria-label="Listing"], '
        'li[aria-label="Listing"], div[role="article"], article'
    ),
    "title": 'h2[aria-label="Title"], h2[aria-label="title"], a[aria-label="Title"], h2',
    "price": 'span[aria-label="Price"], div[aria-label="Price"], span[class*="price"]',
    "location": 'div[aria-label="Location"], span[aria-label="Location"], [class*="location"]',
    "beds": 'span[aria-label="Beds"], [class*="bed"]',
    "baths": 'span[aria-label="Baths"], [class*="bath"]',
    "area": 'span[aria-label="Area"], [class*="area"]',
    "link": 'a[href*="/Property/"], a[href*="/property/"], a[href]',
    "image": "img",
}

GRAANA_SELECTORS = {
    "card": (
        'div[class*="propertyCard"], div[class*="PropertyCard"], '
        'div[class*="listing"], article, a[href*="/sale/"], a[href*="/rent/"]'
    ),
    "title": 'h2, h3, [class*="title"], [class*="Title"]',
    "price": '[class*="price"], [class*="Price"]',
    "location": '[class*="location"], [class*="Location"], [class*="address"]',
    "beds": '[class*="bed"], [class*="Bed"]',
    "baths": '[class*="bath"], [class*="Bath"]',
    "area": '[class*="area"], [class*="Area"], [class*="size"]',
    "link": 'a[href*="/sale/"], a[href*="/rent/"], a[href]',
    "image": "img",
}

OLX_PROPERTY_SELECTORS = {
    "card": 'li[aria-label], article, div[data-aut-id="itemBox"], a[href*="/item/"]',
    "title": '[data-aut-id="itemTitle"], h2, h3, [class*="title"]',
    "price": '[data-aut-id="itemPrice"], [class*="price"]',
    "location": '[data-aut-id="item-location"], [class*="location"]',
    "link": 'a[href*="/item/"], a[href]',
    "image": "img",
}