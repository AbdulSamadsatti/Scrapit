"""
auto_scheduler.py — background scheduler for automobile listings.

Scrapes popular car queries every N minutes and saves to DB
so the frontend loads instantly. Mirrors travel_scheduler.py exactly.
"""

import logging
import threading
from scraping_engine.core.auto_search_services import search_automobiles

logger = logging.getLogger(__name__)

AUTO_QUERIES = [
    # Popular makes in Pakistan
    "Toyota Corolla",
    "Honda Civic",
    "Honda City",
    "Suzuki Alto",
    "Suzuki Cultus",
    "Suzuki WagonR",
    "Suzuki Swift",
    "Toyota Yaris",
    "Hyundai Tucson",
    "Hyundai Elantra",
    "KIA Sportage",
    "KIA Picanto",
    "Toyota Fortuner",
    "Toyota Hilux",
    "Honda BR-V",
    "Changan Alsvin",
    "MG HS",
    "MG ZS",
    "Haval H6",
    "Haval Jolion",
    # Bikes
    "Honda 125",
    "Yamaha YBR 125",
    "Honda CD 70",
    # Generic searches
    "used cars Islamabad",
    "used cars Lahore",
    "used cars Karachi",
    "cheap cars Pakistan",
    "automatic cars Pakistan",
]

BATCH_SIZE = 3


class AutoScheduler:
    def __init__(self, interval_minutes: int = 15):
        self.interval_minutes = interval_minutes
        self.current_index = 0
        self.cycle_count = 0
        self.batch_count = 0
        self._stop_event = threading.Event()
        self._thread = None

    def _run_batch(self):
        batch = AUTO_QUERIES[self.current_index: self.current_index + BATCH_SIZE]
        if not batch:
            self.current_index = 0
            batch = AUTO_QUERIES[:BATCH_SIZE]

        logger.info("[AutoScheduler] Running batch: %s", batch)

        for query in batch:
            try:
                result = search_automobiles(query, max_items=20, force_scrape=False)
                logger.info(
                    "[AutoScheduler] '%s' => %d items",
                    query, result.get("total_results", 0),
                )
            except Exception as exc:
                logger.error("[AutoScheduler] Error for '%s': %s", query, exc)

        self.batch_count += 1
        self.current_index += BATCH_SIZE

        if self.current_index >= len(AUTO_QUERIES):
            self.current_index = 0
            self.cycle_count += 1
            logger.info(
                "[AutoScheduler] Full cycle #%d complete (%d batches total)",
                self.cycle_count, self.batch_count,
            )

    def _loop(self):
        while not self._stop_event.is_set():
            try:
                self._run_batch()
            except Exception as exc:
                logger.error("[AutoScheduler] Unexpected error: %s", exc)
            self._stop_event.wait(timeout=self.interval_minutes * 60)

    def start(self):
        logger.info(
            "[AutoScheduler] Starting — batch %d, interval %d min",
            BATCH_SIZE, self.interval_minutes,
        )
        self._thread = threading.Thread(target=self._loop, daemon=True)
        self._thread.start()

    def shutdown(self):
        logger.info("[AutoScheduler] Shutting down...")
        self._stop_event.set()
        if self._thread:
            self._thread.join(timeout=5)


def start_auto_scheduler(interval_minutes: int = 15) -> AutoScheduler:
    scheduler = AutoScheduler(interval_minutes=interval_minutes)
    scheduler.start()
    return scheduler
