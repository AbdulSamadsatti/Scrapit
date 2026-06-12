"""
runner.py — Master orchestrator
--------------------------------
Sab scrapers yahan se call hote hain.
Function names ek jagah fix hain — koi confusion nahi.

Scraper function map:
  google_jobs  → scrape_google_jobs()   (serp/google_job.py)
  linkedin     → scrape_linkedin_jobs() (playwright_scraper/linkdin.py)  ← original
  careerokay   → scrape_careerokay()    (playwright_scraper/careerokay.py)

Threading note:
  Playwright sync_api is NOT thread-safe for concurrent Browser launches.
  Google SERP (no browser) runs in a thread.
  Playwright scrapers run SEQUENTIALLY in main thread.
"""
import logging
import threading
from typing import Dict, Any

logger = logging.getLogger(__name__)


def run_all_scrapers(query: str, max_jobs_per_site: int = 25) -> Dict[str, Any]:
    """
    Run all scrapers. Google SERP in parallel thread,
    Playwright scrapers sequentially (thread-safe).

    Returns:
        {
            "google_jobs":  {"data": [...], "source": "...", "count": N},
            "linkedin":     {"data": [...], "source": "...", "count": N},
            "careerokay":   {"data": [...], "source": "...", "count": N},
        }
    """

    # ── Imports (here so missing package = graceful error, not crash) ──
    from scraping_engine.serp.google_job import scrape_google_jobs
    from scraping_engine.playwright_scraper.linkdin import scrape_linkedin_jobs
    
    from scraping_engine.playwright_scraper.careerokay import scrape_careerokay

    # Define per‑source job limits using weighted distribution
    def calculate_source_limits(total: int) -> dict[str, int]:
        """Calculate per‑source job limits based on total desired jobs.
        Uses predefined weights and ensures the sum does not exceed the requested total.
        """
        total = max(1, total)
        # Weights must sum to 1.0 (or close) – they define relative share.
        SOURCE_WEIGHTS = {
            "linkedin": 0.40,
            "google_jobs": 0.30,
            "careerokay": 0.30,
        }
        # Initial rounding based on weights
        limits = {
            src: max(1, round(total * w)) for src, w in SOURCE_WEIGHTS.items()
        }
        # Adjust so total matches exactly the requested amount
        while sum(limits.values()) > total:
            for src in ["linkedin", "google_jobs", "careerokay"]:
                if limits[src] > 1 and sum(limits.values()) > total:
                    limits[src] -= 1
        while sum(limits.values()) < total:
            for src in ["linkedin", "google_jobs", "careerokay"]:
                if sum(limits.values()) < total:
                    limits[src] += 1
        return limits

    # Compute limits for this query
    SOURCE_LIMITS = calculate_source_limits(max_jobs_per_site)


    results: Dict[str, Any] = {}

    # ── Step 1: SERP API in background thread (no browser = thread-safe) ──
    google_result = {}

    def _run_google():
        nonlocal google_result
        try:
            google_result = scrape_google_jobs(query, max_jobs=SOURCE_LIMITS.get("google_jobs", max_jobs_per_site))
            logger.info(f"[Runner] google_jobs => {google_result.get('count', 0)} jobs")
        except Exception as e:
            logger.error(f"[Runner] google_jobs failed: {e}")
            google_result = {"data": [], "source": "google_jobs", "count": 0, "error": str(e)}

    import threading
    google_thread = threading.Thread(target=_run_google)
    google_thread.start()

    def _safe_run(name: str, fn, *args, **kwargs) -> Dict:
        try:
            logger.info(f"[Runner] Starting: {name}")
            result = fn(*args, **kwargs)
            # Normalize to dict
            if isinstance(result, list):
                result = {"data": result, "source": name, "count": len(result)}
            logger.info(f"[Runner] {name} => {result.get('count', 0)} jobs")
            return result
        except Exception as e:
            logger.error(f"[Runner] {name} failed: {e}")
            return {"data": [], "source": name, "count": 0, "error": str(e)}

    # Use limits when calling scrapers sequentially
    results["linkedin"] = _safe_run(
        "linkedin",
        scrape_linkedin_jobs,
        query,
        max_jobs=SOURCE_LIMITS.get("linkedin", max_jobs_per_site),
    )

    def _clean_job_query(query: str) -> str:
        return (
            query.replace(" jobs in Pakistan", "")
                 .replace(" jobs", "")
                 .replace(" in Pakistan", "")
                 .strip()
        )

    clean_query = _clean_job_query(query)

    results["careerokay"] = _safe_run(
        "careerokay",
        scrape_careerokay,
        clean_query,
        max_jobs=SOURCE_LIMITS.get("careerokay", max_jobs_per_site),
    )

    # ── Step 3: Wait for Google thread ──
    google_thread.join(timeout=30)
    results["google_jobs"] = google_result

    total = sum(v.get("count", 0) for v in results.values())
    logger.info(f"[Runner] ✅ Done. Total: {total} jobs for '{query}'")
    return results