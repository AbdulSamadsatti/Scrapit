"""
runner.py — Master orchestrator
--------------------------------
Sab scrapers yahan se call hote hain.
Function names ek jagah fix hain — koi confusion nahi.

Scraper function map:
  google_jobs  → scrape_google_jobs()   (serp/google_job.py)
  linkedin     → scrape_linkedin_jobs() (playwright_scraper/linkdin.py)  ← original
  indeed       → scrape_indeed()        (playwright_scraper/indeed.py)   ← new name
  rozee        → scrape_rozee()         (playwright_scraper/rozee.py)    ← new name

Threading note:
  Playwright sync_api is NOT thread-safe for concurrent Browser launches.
  Google SERP (no browser) runs in a thread.
  Playwright scrapers run SEQUENTIALLY in main thread.
"""
import logging
import threading
from typing import Dict, Any

logger = logging.getLogger(__name__)


def run_all_scrapers(query: str, max_jobs_per_site: int = 10) -> Dict[str, Any]:
    """
    Run all scrapers. Google SERP in parallel thread,
    Playwright scrapers sequentially (thread-safe).

    Returns:
        {
            "google_jobs":  {"data": [...], "source": "...", "count": N},
            "linkedin":     {"data": [...], "source": "...", "count": N},
            "indeed":       {"data": [...], "source": "...", "count": N},
            "rozee":        {"data": [...], "source": "...", "count": N},
        }
    """
    # ── Imports (here so missing package = graceful error, not crash) ──
    from scraping_engine.serp.google_job import scrape_google_jobs
    from scraping_engine.playwright_scraper.linkdin import scrape_linkedin_jobs
    from scraping_engine.playwright_scraper.indeed import scrape_indeed
    from scraping_engine.playwright_scraper.rozee import scrape_rozee

    results: Dict[str, Any] = {}

    # ── Step 1: SERP API in background thread (no browser = thread-safe) ──
    google_result = {}

    def _run_google():
        nonlocal google_result
        try:
            google_result = scrape_google_jobs(query, max_jobs=max_jobs_per_site)
            logger.info(f"[Runner] google_jobs => {google_result.get('count', 0)} jobs")
        except Exception as e:
            logger.error(f"[Runner] google_jobs failed: {e}")
            google_result = {"data": [], "source": "google_jobs", "count": 0, "error": str(e)}

    google_thread = threading.Thread(target=_run_google)
    google_thread.start()

    # ── Step 2: Playwright scrapers — sequential (avoids deadlocks) ──
    def _safe_run(name: str, fn, *args, **kwargs) -> Dict:
        try:
            logger.info(f"[Runner] Starting: {name}")
            result = fn(*args, **kwargs)
            # linkedin returns list — normalize to dict
            if isinstance(result, list):
                result = {"data": result, "source": name, "count": len(result)}
            logger.info(f"[Runner] {name} => {result.get('count', 0)} jobs")
            return result
        except Exception as e:
            logger.error(f"[Runner] {name} failed: {e}")
            return {"data": [], "source": name, "count": 0, "error": str(e)}

    results["linkedin"] = _safe_run("linkedin", scrape_linkedin_jobs, query, max_jobs=max_jobs_per_site)
    results["indeed"]   = _safe_run("indeed",   scrape_indeed,        query, max_jobs=max_jobs_per_site)
    results["rozee"]    = _safe_run("rozee",     scrape_rozee,         query, max_jobs=max_jobs_per_site)

    # ── Step 3: Wait for Google thread ──
    google_thread.join(timeout=30)
    results["google_jobs"] = google_result

    total = sum(v.get("count", 0) for v in results.values())
    logger.info(f"[Runner] ✅ Done. Total: {total} jobs for '{query}'")
    return results