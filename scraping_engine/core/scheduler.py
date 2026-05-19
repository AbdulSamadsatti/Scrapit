import threading
import time
import logging
from scraping_engine.core.runner import run_all_scrapers

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


class JobScheduler:
    def __init__(self, interval_minutes=10):
        self.interval_minutes = interval_minutes
        self.current_index = 0
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
                total = sum(
                    len(v.get("data", [])) for v in results.values() if isinstance(v, dict)
                )
                logger.info(f"[Scheduler] '{query}' => {total} jobs found")
            except Exception as e:
                logger.error(f"[Scheduler] Error scraping '{query}': {e}")

        self.current_index += BATCH_SIZE
        if self.current_index >= len(QUERIES_TO_SCRAPE):
            self.current_index = 0
            logger.info("[Scheduler] Full cycle complete. Restarting from beginning.")

    def _loop(self):
        while not self._stop_event.is_set():
            try:
                self._run_batch()
            except Exception as e:
                logger.error(f"[Scheduler] Unexpected error: {e}")
            self._stop_event.wait(timeout=self.interval_minutes * 60)

    def start(self):
        logger.info(
            f"[Scheduler] Starting — batch size {BATCH_SIZE}, interval {self.interval_minutes} min"
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