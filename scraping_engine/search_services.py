"""
search_service.py — DB-first search with live scrape fallback
--------------------------------------------------------------
Ab (no DB): seedha scrape karta hai.
Baad mein: sirf search_in_db() implement karo — baaki same rahega.
"""
import logging
from typing import Dict, Any, List

logger = logging.getLogger(__name__)


# ── DB stubs (implement when DB is ready) ─────────────────────────

def search_in_db(query: str, limit: int = 30) -> List[Dict]:
    """
    TODO — Firebase/MongoDB se jobs fetch karo.
    Ab empty list return karta hai (DB nahi hai).
    """
    return []


def save_to_db(jobs: List[Dict]) -> None:
    """
    TODO — scraped jobs DB mein save karo.
    Ab kuch nahi karta.
    """
    pass


# ── Main search function ──────────────────────────────────────────

def search_jobs(
    query: str,
    max_jobs_per_site: int = 10,
    force_scrape: bool = False,
) -> Dict[str, Any]:
    """
    React app yahi call karega.

    Flow:
      1. DB check  → agar results mile → turant return
      2. DB miss   → live scrape → DB save → return

    Returns:
        {
            "query":  "mechanical engineer",
            "source": "database" | "live_scrape",
            "total":  25,
            "jobs":   [ {title, company, location, description,
                         salary, logo, apply_link, source, posted_at}, ... ]
        }
    """
    from scraping_engine.core.runner import run_all_scrapers

    logger.info(f"[SearchService] Query: '{query}'")

    # Step 1: DB check
    if not force_scrape:
        db_jobs = search_in_db(query, limit=30)
        if db_jobs:
            logger.info(f"[SearchService] DB hit: {len(db_jobs)} jobs")
            return {
                "query":  query,
                "source": "database",
                "total":  len(db_jobs),
                "jobs":   db_jobs,
            }
        logger.info("[SearchService] DB miss — live scraping...")

    # Step 2: Live scrape
    raw = run_all_scrapers(query, max_jobs_per_site=max_jobs_per_site)

    # Flatten all sources into one list
    all_jobs: List[Dict] = []
    for source_key in ["google_jobs", "linkedin", "indeed", "rozee"]:
        source_data = raw.get(source_key, {})
        all_jobs.extend(source_data.get("data", []))

    # Step 3: Save to DB (stub — does nothing until DB integrated)
    if all_jobs:
        save_to_db(all_jobs)

    logger.info(f"[SearchService] Live scrape done: {len(all_jobs)} total jobs")
    return {
        "query":  query,
        "source": "live_scrape",
        "total":  len(all_jobs),
        "jobs":   all_jobs,
    }