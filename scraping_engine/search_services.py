import logging
from datetime import datetime, timedelta, timezone
from typing import List, Dict, Any

from scraping_engine.core.runner import run_all_scrapers

logger = logging.getLogger(__name__)

# Jobs older than this are considered stale and auto-deleted
CACHE_TTL_HOURS = 6

# Jobs older than this are ALWAYS deleted, regardless of expires_at
# This is the hard ceiling — even if expires_at wasn't set, jobs this old get purged
MAX_STALE_HOURS = 24


def _get_db():
    try:
        from app.database import SessionLocal
        db = SessionLocal()
        logger.info("[SearchService] DB connection OK")
        return db
    except Exception as e:
        logger.error(f"[SearchService] DB connection FAILED: {e}")
        return None


def purge_expired_jobs() -> int:
    """Disabled by user request."""
    return 0


def purge_stale_jobs(max_age_hours: int = MAX_STALE_HOURS) -> int:
    """Disabled by user request."""
    return 0


def purge_replaced_duplicates() -> int:
    """Disabled by user request."""
    return 0


def purge_all_jobs() -> int:
    """Disabled by user request."""
    return 0


def search_in_db(query: str, shuffle: bool = False, limit: int = 50) -> List[Dict[str, Any]]:
    # Auto-cleanup expired rows before searching
    purge_expired_jobs()

    db = _get_db()
    if not db:
        return []
    try:
        from app.models import JobListing
        from sqlalchemy import func
        now = datetime.now(timezone.utc)
        db_query = db.query(JobListing).filter(JobListing.query.ilike(f"%{query.lower()}%"))
        
        if shuffle:
            import random
            total = db_query.count()
            offset = random.randint(0, max(total - limit, 0))
            rows = db_query.offset(offset).limit(limit).all()
        else:
            db_query = db_query.order_by(JobListing.scraped_at.desc())
            rows = db_query.limit(limit).all()
        if not rows:
            logger.info(f"[SearchService] DB miss for '{query}'")
            return []
        logger.info(f"[SearchService] DB hit: {len(rows)} jobs for '{query}'")
        return [_row_to_dict(r) for r in rows]
    except Exception as e:
        logger.error(f"[SearchService] search_in_db error: {e}")
        return []
    finally:
        db.close()


def save_to_db(query: str, jobs: List[Dict[str, Any]]) -> None:
    if not jobs:
        return
    db = _get_db()
    if not db:
        logger.error("[SearchService] save_to_db: no DB — jobs NOT saved")
        return
    try:
        from app.models import JobListing
        now = datetime.now(timezone.utc)

        existing_links = {
            link[0] for link in db.query(JobListing.apply_link).filter(
                JobListing.query.ilike(f"%{query.lower()}%")
            ).all() if link[0]
        }

        new_rows = []
        for j in jobs:
            link = j.get("apply_link") or ""
            if link and link in existing_links:
                continue
            if link:
                existing_links.add(link)
                
            new_rows.append(JobListing(
                query       = query.lower().strip(),
                title       = (j.get("title")       or "")[:300],
                company     = (j.get("company")     or "")[:200],
                location    = (j.get("location")    or "")[:200],
                salary      = (j.get("salary")      or "")[:200],
                description = (j.get("description") or ""),
                snippet     = (j.get("snippet")     or ""),
                logo        = (j.get("logo")        or ""),
                banner      = (j.get("banner")      or ""),
                apply_link  = (j.get("apply_link")  or ""),
                source      = (j.get("source")      or "")[:100],
                posted_at   = (j.get("posted_at")   or "")[:100],
                scraped_at  = now,
                expires_at  = None,
            ))

        db.bulk_save_objects(new_rows)
        db.commit()
        logger.info(f"[SearchService] Saved {len(new_rows)} jobs to DB for '{query}'")

    except Exception as e:
        logger.error(f"[SearchService] save_to_db error: {e}")
        db.rollback()
    finally:
        db.close()


def _row_to_dict(row) -> Dict[str, Any]:
    return {
        "title":       row.title,
        "company":     row.company,
        "location":    row.location,
        "salary":      row.salary,
        "description": row.description,
        "snippet":     row.snippet,
        "logo":        row.logo,
        "banner":      row.banner,
        "apply_link":  row.apply_link,
        "source":      row.source,
        "posted_at":   row.posted_at,
    }


def search_jobs(
    query: str,
    max_jobs_per_site: int = 10,
    force_scrape: bool = False,
    shuffle: bool = False,
) -> Dict[str, Any]:
    logger.info(f"[SearchService] Query='{query}' force_scrape={force_scrape}")

    # Step 1: Check DB first
    if not force_scrape:
        cached = search_in_db(query, shuffle=shuffle, limit=max_jobs_per_site * 3)
        if cached:
            return {
                "status":        "success",
                "source":        "database",
                "total_results": len(cached),
                "jobs":          cached,
            }

    # Step 2: Live scrape
    scrape_query = query
    if "pakistan" not in query.lower():
        scrape_query = f"{query} jobs in Pakistan"

    raw = run_all_scrapers(scrape_query, max_jobs_per_site=max_jobs_per_site)

    # Aggregate and validate jobs from all sources
    source_lists: Dict[str, List[Dict[str, Any]]] = {}
    for source_key, source_data in raw.items():
        if isinstance(source_data, dict):
            valid_jobs = []
            for job in source_data.get("data", []):
                # Mandatory Fields Validation for Jobs: Title, Link, and Image (Logo/Banner)
                # Salary is optional as per user feedback
                title = (job.get("title") or "").strip()
                link = (job.get("apply_link") or "").strip()
                image = (job.get("logo") or "").strip() or (job.get("banner") or "").strip()

                # CareerOkay listings often have no logo — apply a fallback placeholder
                # so they pass validation and aren't silently discarded
                if not image and source_key == "careerokay":
                    job = job.copy()
                    job["logo"] = "https://www.careerokay.com/favicon.ico"
                    image = job["logo"]

                if not title or not link or not image:
                    continue
                
                job_copy = job.copy()
                job_copy["source"] = source_key
                valid_jobs.append(job_copy)
            source_lists[source_key] = valid_jobs

    logger.info(f"[SearchService] Valid jobs per source: { {k: len(v) for k, v in source_lists.items()} }")

    # Round Robin Distribution logic to ensure perfectly equal representation
    max_total = max_jobs_per_site * max(1, len(source_lists))
    selected: List[Dict[str, Any]] = []
    
    while len(selected) < max_total:
        added_in_round = False
        for source_key in list(source_lists.keys()):
            if source_lists[source_key]:
                selected.append(source_lists[source_key].pop(0))
                added_in_round = True
                if len(selected) >= max_total:
                    break
        if not added_in_round:
            break

    # Use the selected list as final result
    final_jobs = selected

    # Step 3: Save to DB
    save_to_db(query, final_jobs)

    return {
        "status":        "success",
        "source":        "live_scrape",
        "total_results": len(final_jobs),
        "jobs":          final_jobs,
    }