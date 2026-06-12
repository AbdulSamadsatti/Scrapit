"""
Bookme travel scraper.

Targets public hotels, flights, and bus pages and returns normalized travel
offers with source URLs for frontend click-through.
"""

from typing import Any, Dict

from scraping_engine.configs.travel_config import TRAVEL_SITES
from scraping_engine.playwright_scraper.travel_common import scrape_travel_site


def scrape_bookme_travel(query: str = "Pakistan travel", max_items: int = 10) -> Dict[str, Any]:
    config = TRAVEL_SITES["bookme"]
    return scrape_travel_site(
        source="bookme",
        source_label=config["label"],
        urls=config["search_urls"],
        query=query,
        max_items=max_items,
        offer_type="travel",
    )
