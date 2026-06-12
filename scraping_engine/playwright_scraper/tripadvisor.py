"""
TripAdvisor travel scraper — Playwright.

Scrapes hotel/tour listings from TripAdvisor search results.
"""

from typing import Any, Dict

from scraping_engine.configs.travel_config import TRAVEL_SITES
from scraping_engine.playwright_scraper.travel_common import scrape_travel_site


def scrape_tripadvisor_travel(query: str = "Pakistan hotels", max_items: int = 10) -> Dict[str, Any]:
    config = TRAVEL_SITES["tripadvisor"]
    return scrape_travel_site(
        source="tripadvisor",
        source_label=config["label"],
        urls=config["search_urls"],
        query=query,
        max_items=max_items,
        offer_type="hotel",
    )
