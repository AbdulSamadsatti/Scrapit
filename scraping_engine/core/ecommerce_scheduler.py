import logging
import threading
from typing import List

from scraping_engine.core.ecommerce_runner import flatten_ecommerce_results, run_all_ecommerce_scrapers
from scraping_engine.core.ecommerce_storage import save_ecommerce_products

logger = logging.getLogger(__name__)

ECOMMERCE_QUERIES_TO_SCRAPE: List[str] = [
    "iphone",
    "samsung mobile",
    "laptop",
    "gaming laptop",
    "headphones",
    "airpods",
    "smart watch",
    "led tv",
    "camera",
    "printer",
    "keyboard",
    "mouse",
    "power bank",
    "charger",
    "shoes",
    "men shoes",
    "women shoes",
    "watch",
    "bag",
    "makeup",
    "perfume",
    "skin care",
    "baby toys",
    "books",
    "home appliances",
    "refrigerator",
    "washing machine",
    "microwave oven",
]

BATCH_SIZE = 2


class EcommerceScheduler:
    def __init__(self, interval_minutes: int = 10, max_products_per_site: int = 15):
        self.interval_minutes = interval_minutes
        self.max_products_per_site = max_products_per_site
        self.current_index = 0
        self.batch_count = 0
        self._stop_event = threading.Event()
        self._thread: threading.Thread | None = None

    def _run_batch(self) -> None:
        batch = ECOMMERCE_QUERIES_TO_SCRAPE[self.current_index:self.current_index + BATCH_SIZE]
        if not batch:
            self.current_index = 0
            batch = ECOMMERCE_QUERIES_TO_SCRAPE[:BATCH_SIZE]

        logger.info("[EcommerceScheduler] Running batch: %s", batch)

        for query in batch:
            try:
                results = run_all_ecommerce_scrapers(
                    query=query,
                    max_products_per_site=self.max_products_per_site,
                )
                products = flatten_ecommerce_results(results)
                stats = save_ecommerce_products(query, products)
                logger.info(
                    "[EcommerceScheduler] '%s' found=%s saved=%s failed=%s",
                    query,
                    stats["found"],
                    stats["saved"],
                    stats["failed"],
                )
            except Exception as exc:
                logger.error("[EcommerceScheduler] Error scraping '%s': %s", query, exc)

        self.batch_count += 1
        self.current_index += BATCH_SIZE
        if self.current_index >= len(ECOMMERCE_QUERIES_TO_SCRAPE):
            self.current_index = 0
            logger.info("[EcommerceScheduler] Full ecommerce query cycle complete.")

    def _loop(self) -> None:
        while not self._stop_event.is_set():
            try:
                self._run_batch()
            except Exception as exc:
                logger.error("[EcommerceScheduler] Unexpected error: %s", exc)
            self._stop_event.wait(timeout=self.interval_minutes * 60)

    def start(self) -> None:
        logger.info(
            "[EcommerceScheduler] Starting - batch size %s, interval %s min",
            BATCH_SIZE,
            self.interval_minutes,
        )
        self._thread = threading.Thread(target=self._loop, daemon=True)
        self._thread.start()

    def shutdown(self) -> None:
        logger.info("[EcommerceScheduler] Shutting down...")
        self._stop_event.set()
        if self._thread:
            self._thread.join(timeout=5)


def start_ecommerce_scheduler(interval_minutes: int = 10) -> EcommerceScheduler:
    scheduler = EcommerceScheduler(interval_minutes=interval_minutes)
    scheduler.start()
    return scheduler