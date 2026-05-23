import threading
import time
import logging
from scraping_engine.core.runner import run_all_scrapers
from scraping_engine.search_services import (
    save_to_db,
    purge_expired_jobs,
    purge_stale_jobs,
    purge_replaced_duplicates,
)

logger = logging.getLogger(__name__)

# 70+ broad queries covering all job domains in Pakistan
QUERIES_TO_SCRAPE = [
    # IT / Software
    "software engineer",
    "web developer",
    "python developer",
    "frontend developer",
    "backend developer",
    "full stack developer",
    "mobile app developer",
    "flutter developer",
    "react developer",
    "node js developer",
    "java developer",
    "php developer",
    "data scientist",
    "machine learning engineer",
    "ai engineer",
    "devops engineer",
    "cloud engineer",
    "cybersecurity analyst",
    "database administrator",
    "network engineer",
    "system administrator",
    "it support engineer",
    "qa engineer",
    "software tester",
    "blockchain developer",
    "ui ux designer",
    "graphic designer",
    "wordpress developer",
    # Engineering
    "mechanical engineer",
    "electrical engineer",
    "civil engineer",
    "structural engineer",
    "chemical engineer",
    "industrial engineer",
    "hvac engineer",
    "automation engineer",
    "project engineer",
    "site engineer",
    "production engineer",
    "quality control engineer",
    "safety officer",
    "autocad designer",
    # Medical / Health
    "doctor",
    "nurse",
    "pharmacist",
    "medical officer",
    "physiotherapist",
    "lab technician",
    "dentist",
    "radiologist",
    # Finance / Accounting
    "accountant",
    "financial analyst",
    "auditor",
    "tax consultant",
    "banker",
    "investment analyst",
    "chartered accountant",
    # Business / Management
    "business analyst",
    "project manager",
    "product manager",
    "operations manager",
    "supply chain manager",
    "hr manager",
    "recruitment officer",
    "admin officer",
    "office assistant",
    "executive assistant",
    # Sales / Marketing
    "sales manager",
    "marketing manager",
    "digital marketing",
    "seo specialist",
    "content writer",
    "social media manager",
    "brand manager",
    "business development",
    # Education
    "teacher",
    "lecturer",
    "professor",
    "tutor",
    "trainer",
    "curriculum developer",
    # Trades / Labour
    "electrician",
    "plumber",
    "welder",
    "technician",
    "mechanic",
    "driver",
    "security guard",
    "chef",
    "cook",
    "waiter",
    # Other
    "customer service",
    "call center agent",
    "data entry operator",
    "receptionist",
    "logistics coordinator",
    "real estate agent",
    "fashion designer",
    "architect",
    "interior designer",
]

BATCH_SIZE = 5  # queries per run cycle

# After this many FULL cycles through all queries, run a deep DB cleanup
# With 70+ queries and batch_size=5, one full cycle = ~14 batches (~140 min)
# So 5 full cycles ≈ 70 batches ≈ ~12 hours of scheduler running
DEEP_CLEANUP_EVERY_N_CYCLES = 5


class JobScheduler:
    def __init__(self, interval_minutes=10):
        self.interval_minutes = interval_minutes
        self.current_index = 0
        self.cycle_count = 0        # how many FULL cycles completed
        self.batch_count = 0        # total batches run since start
        self._stop_event = threading.Event()
        self._thread = None

    def _run_batch(self):
        """Run a batch of queries starting from current_index."""
        batch = QUERIES_TO_SCRAPE[self.current_index: self.current_index + BATCH_SIZE]
        if not batch:
            # Cycle complete — restart from beginning
            self.current_index = 0
            batch = QUERIES_TO_SCRAPE[:BATCH_SIZE]

        logger.info(f"[Scheduler] Running batch: {batch}")

        for query in batch:
            try:
                search_query = f"{query} jobs in Pakistan"
                logger.info(f"[Scheduler] Scraping: {search_query}")
                results = run_all_scrapers(search_query)
                all_jobs = []
                for v in results.values():
                    if isinstance(v, dict):
                        all_jobs.extend(v.get("data", []))
                total = len(all_jobs)
                logger.info(f"[Scheduler] '{query}' => {total} jobs found")

                # Save fresh data to DB
                if all_jobs:
                    save_to_db(query, all_jobs)
            except Exception as e:
                logger.error(f"[Scheduler] Error scraping '{query}': {e}")

        # Auto-cleanup expired jobs after each batch
        purge_expired_jobs()

        self.batch_count += 1
        self.current_index += BATCH_SIZE

        if self.current_index >= len(QUERIES_TO_SCRAPE):
            self.current_index = 0
            self.cycle_count += 1
            logger.info(
                f"[Scheduler] ✅ Full cycle #{self.cycle_count} complete "
                f"({self.batch_count} total batches). Restarting from beginning."
            )

            # ── DEEP CLEANUP every N full cycles ─────────────────
            if self.cycle_count % DEEP_CLEANUP_EVERY_N_CYCLES == 0:
                logger.info(
                    f"[Scheduler] 🧹 Deep cleanup triggered after "
                    f"{self.cycle_count} cycles — purging stale + duplicate data"
                )
                stale = purge_stale_jobs()      # delete jobs older than 24h
                dupes = purge_replaced_duplicates()  # remove older duplicates
                logger.info(
                    f"[Scheduler] 🧹 Deep cleanup done: "
                    f"{stale} stale removed, {dupes} duplicates removed"
                )

        # Log DB stats every 5 batches for visibility
        if self.batch_count % 5 == 0:
            self._log_db_stats()


    def _loop(self):
        while not self._stop_event.is_set():
            try:
                self._run_batch()
            except Exception as e:
                logger.error(f"[Scheduler] Unexpected error: {e}")
            self._stop_event.wait(timeout=self.interval_minutes * 60)

    def _log_db_stats(self):
        """Log current DB job count for monitoring."""
        try:
            from app.database import SessionLocal
            from app.models import JobListing
            db = SessionLocal()
            total = db.query(JobListing).count()
            db.close()
            logger.info(
                f"[Scheduler] 📊 DB stats: {total} jobs in database | "
                f"cycle #{self.cycle_count} | batch #{self.batch_count}"
            )
        except Exception as e:
            logger.debug(f"[Scheduler] Could not log DB stats: {e}")

    def start(self):
        logger.info(
            f"[Scheduler] Starting — batch size {BATCH_SIZE}, "
            f"interval {self.interval_minutes} min, "
            f"deep cleanup every {DEEP_CLEANUP_EVERY_N_CYCLES} cycles"
        )
        self._thread = threading.Thread(target=self._loop, daemon=True)
        self._thread.start()

    def shutdown(self):
        logger.info("[Scheduler] Shutting down...")
        self._stop_event.set()
        if self._thread:
            self._thread.join(timeout=5)


def start_scheduler(interval_minutes=10) -> JobScheduler:
    """Start and return the scheduler instance. Called from main.py lifespan."""
    scheduler = JobScheduler(interval_minutes=interval_minutes)
    scheduler.start()
    return scheduler