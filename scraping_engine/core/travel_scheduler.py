"""
travel_scheduler.py — exact counterpart of scheduler.py for travel.

Scrapes popular travel queries in the background every N minutes
and saves results to DB so the frontend loads instantly.
"""

import logging
import threading
from scraping_engine.core.travel_search_services import search_travel

logger = logging.getLogger(__name__)

TRAVEL_QUERIES = [
    # Northern Pakistan hotels
    "Hunza hotels Pakistan",
    "Skardu hotels Pakistan",
    "Gilgit hotels Pakistan",
    "Naran hotels Pakistan",
    "Swat hotels Pakistan",
    "Murree hotels Pakistan",
    "Chitral hotels Pakistan",
    "Kaghan valley hotels Pakistan",
    "Fairy Meadows hotels Pakistan",
    "Neelum Valley hotels Pakistan",
    # Major cities hotels
    "Islamabad hotels Pakistan",
    "Karachi hotels Pakistan",
    "Lahore hotels Pakistan",
    "Peshawar hotels Pakistan",
    "Rawalpindi hotels Pakistan",
    # Tour packages
    "Hunza tour package",
    "Skardu tour package",
    "Swat tour package",
    "Naran Kaghan tour package",
    "Northern Pakistan tour",
    "Pakistan honeymoon package",
    "Pakistan family tour",
    # Flights
    "Karachi to Islamabad flight",
    "Lahore to Islamabad flight",
    "Karachi to Lahore flight",
    "Islamabad to Skardu flight",
    "Islamabad to Gilgit flight",
    "Pakistan domestic flights",
]

BATCH_SIZE = 3


class TravelScheduler:
    def __init__(self, interval_minutes: int = 15):
        self.interval_minutes = interval_minutes
        self.current_index = 0
        self.cycle_count = 0
        self.batch_count = 0
        self._stop_event = threading.Event()
        self._thread = None

    def _run_batch(self):
        batch = TRAVEL_QUERIES[self.current_index: self.current_index + BATCH_SIZE]
        if not batch:
            self.current_index = 0
            batch = TRAVEL_QUERIES[:BATCH_SIZE]

        logger.info("[TravelScheduler] Running batch: %s", batch)

        for query in batch:
            try:
                result = search_travel(query, max_items=20, force_scrape=False)
                logger.info(
                    "[TravelScheduler] '%s' => %d items saved",
                    query, result.get("total_results", 0)
                )
            except Exception as exc:
                logger.error("[TravelScheduler] Error for '%s': %s", query, exc)

        self.batch_count += 1
        self.current_index += BATCH_SIZE

        if self.current_index >= len(TRAVEL_QUERIES):
            self.current_index = 0
            self.cycle_count += 1
            logger.info(
                "[TravelScheduler] Full cycle #%d complete (%d batches total)",
                self.cycle_count, self.batch_count
            )

    def _loop(self):
        while not self._stop_event.is_set():
            try:
                self._run_batch()
            except Exception as exc:
                logger.error("[TravelScheduler] Unexpected error: %s", exc)
            self._stop_event.wait(timeout=self.interval_minutes * 60)

    def start(self):
        logger.info(
            "[TravelScheduler] Starting — batch %d, interval %d min",
            BATCH_SIZE, self.interval_minutes
        )
        self._thread = threading.Thread(target=self._loop, daemon=True)
        self._thread.start()

    def shutdown(self):
        logger.info("[TravelScheduler] Shutting down...")
        self._stop_event.set()
        if self._thread:
            self._thread.join(timeout=5)


def start_travel_scheduler(interval_minutes: int = 15) -> TravelScheduler:
    scheduler = TravelScheduler(interval_minutes=interval_minutes)
    scheduler.start()
    return scheduler
