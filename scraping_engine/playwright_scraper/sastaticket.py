"""
Sastaticket travel scraper.

Targets public flights/hotels/Umrah/travel pages. Live flight pricing often
requires date and passenger inputs, so this scraper focuses on public cards and
click-through URLs first.
"""

from typing import Any, Dict

from scraping_engine.configs.travel_config import TRAVEL_SITES
from scraping_engine.playwright_scraper.travel_common import scrape_travel_site


def scrape_sastaticket_travel(query: str = "Pakistan travel", max_items: int = 10) -> Dict[str, Any]:
    config = TRAVEL_SITES["sastaticket"]
    return scrape_travel_site(
        source="sastaticket",
        source_label=config["label"],
        urls=config["search_urls"],
        query=query,
        max_items=max_items,
        offer_type="travel",
    )
