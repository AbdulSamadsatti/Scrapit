import logging
import threading
from typing import List

from scraping_engine.core.property_runner import (
    flatten_property_results,
    run_all_property_scrapers,
)
from scraping_engine.core.property_storage import save_property_listings

logger = logging.getLogger(__name__)

# Broad property queries covering major cities + types + purposes.
# Zameen/Graana slug-based hain, OLX query-based — yeh queries teeno ke liye kaam karti hain.
PROPERTY_QUERIES_TO_SCRAPE: List[str] = [
    # Houses for sale
    "houses for sale in islamabad",
    "houses for sale in rawalpindi",
    "houses for sale in lahore",
    "houses for sale in karachi",
    "houses for sale in faisalabad",
    "houses for sale in multan",
    "houses for sale in peshawar",
    # Flats / apartments
    "flats for sale in islamabad",
    "flats for sale in karachi",
    "apartments for rent in lahore",
    "flats for rent in islamabad",
    # Plots
    "plots for sale in islamabad",
    "plots for sale in lahore",
    "plots for sale in dha lahore",
    "plots for sale in bahria town",
    # Rent
    "houses for rent in islamabad",
    "houses for rent in lahore",
    "houses for rent in karachi",
    # Commercial
    "commercial property for sale in islamabad",
    "shops for sale in lahore",
    "offices for rent in karachi",
    # Popular societies
    "property in dha islamabad",
    "property in bahria town rawalpindi",
    "property in gulberg lahore",
]

BATCH_SIZE = 2


class PropertyScheduler:
    """ecommerce_scheduler.py jaisa — batches of queries, interval loop, daemon thread."""

    def __init__(self, interval_minutes: int = 10, max_listings_per_site: int = 15):
        self.interval_minutes = interval_minutes
        self.max_listings_per_site = max_listings_per_site
        self.current_index = 0
        self.batch_count = 0
        self._stop_event = threading.Event()
        self._thread: threading.Thread | None = None

    def _run_batch(self) -> None:
        batch = PROPERTY_QUERIES_TO_SCRAPE[self.current_index:self.current_index + BATCH_SIZE]
        if not batch:
            self.current_index = 0
            batch = PROPERTY_QUERIES_TO_SCRAPE[:BATCH_SIZE]

        logger.info("[PropertyScheduler] Running batch: %s", batch)

        for query in batch:
            try:
                results = run_all_property_scrapers(
                    query=query,
                    max_listings_per_site=self.max_listings_per_site,
                )
                listings = flatten_property_results(results)
                stats = save_property_listings(query, listings)
                logger.info(
                    "[PropertyScheduler] '%s' found=%s saved=%s failed=%s",
                    query, stats["found"], stats["saved"], stats["failed"],
                )
            except Exception as exc:
                logger.error("[PropertyScheduler] Error scraping '%s': %s", query, exc)

        self.batch_count += 1
        self.current_index += BATCH_SIZE
        if self.current_index >= len(PROPERTY_QUERIES_TO_SCRAPE):
            self.current_index = 0
            logger.info("[PropertyScheduler] Full property query cycle complete.")

    def _loop(self) -> None:
        while not self._stop_event.is_set():
            try:
                self._run_batch()
            except Exception as exc:
                logger.error("[PropertyScheduler] Unexpected error: %s", exc)
            self._stop_event.wait(timeout=self.interval_minutes * 60)

    def start(self) -> None:
        logger.info(
            "[PropertyScheduler] Starting - batch size %s, interval %s min",
            BATCH_SIZE, self.interval_minutes,
        )
        self._thread = threading.Thread(target=self._loop, daemon=True)
        self._thread.start()

    def shutdown(self) -> None:
        logger.info("[PropertyScheduler] Shutting down...")
        self._stop_event.set()
        if self._thread:
            self._thread.join(timeout=5)


def start_property_scheduler(interval_minutes: int = 10) -> PropertyScheduler:
    scheduler = PropertyScheduler(interval_minutes=interval_minutes)
    scheduler.start()
    return scheduler