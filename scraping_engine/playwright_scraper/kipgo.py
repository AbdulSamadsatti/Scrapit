"""
Kipgo travel scraper.

Returns tours, stays, activities, and travel packages in the same normalized
shape used by the other scraping_engine modules.
"""

from typing import Any, Dict

from scraping_engine.configs.travel_config import TRAVEL_SITES
from scraping_engine.playwright_scraper.travel_common import scrape_travel_site


def scrape_kipgo_travel(query: str = "Pakistan tours", max_items: int = 10) -> Dict[str, Any]:
    config = TRAVEL_SITES["kipgo"]
    return scrape_travel_site(
        source="kipgo",
        source_label=config["label"],
        urls=config["search_urls"],
        query=query,
        max_items=max_items,
        offer_type="package",
    )
