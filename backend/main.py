import sys
import os
import re
import asyncio
import logging
import threading

from dotenv import load_dotenv

load_dotenv()

# Ensure the project root (scrapers) is on PYTHONPATH so that 'scraping_engine' can be imported
project_root = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if project_root not in sys.path:
    sys.path.insert(0, project_root)


from fastapi import FastAPI, Query, HTTPException, BackgroundTasks
from fastapi.concurrency import run_in_threadpool
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from scraping_engine.core.scheduler import start_scheduler
from scraping_engine.core.ecommerce_scheduler import start_ecommerce_scheduler
from scraping_engine.core.property_scheduler import start_property_scheduler
from scraping_engine.search_services import (
    search_jobs,
    purge_all_jobs,
    search_in_db as search_jobs_in_db,
)
from scraping_engine.property_search_services import search_property, search_in_db
from scraping_engine.core.property_runner import scrape_property_detail

# Database imports
from app.database import Base, SessionLocal, engine
from app import models
from seed_ecommerce import seed_ecommerce
from app.routes import (
    users,
    domains,
    websites,
    items,
    products,
    raw_scraped_products,
    scraper as db_scraper,
    favorites,
    chatbot as db_chatbot,
    search_history,
    ecommerce,
    ai,
)
from app.services.redis_client import get_cache, set_cache, delete_cache, make_key, redis_lock

logger = logging.getLogger(__name__)

SOURCE_PRIORITY = {
    "linkedin": 1,
    "careerokay": 2,
    "google_jobs": 4,
}

SOURCE_LABELS = {
    "linkedin": "LinkedIn",
    "careerokay": "CareerOkay",
    "google_jobs": "Google Jobs",
}

_scrape_in_progress: Dict[str, bool] = {}


def interleave_by_source(items: List[Dict[str, Any]], total: int, source_key: str = "source") -> List[Dict[str, Any]]:
    """Round-robin interleave items so every source contributes equally."""
    from collections import OrderedDict
    groups: OrderedDict = OrderedDict()
    for it in items:
        key = (it.get(source_key) or "unknown").lower()
        groups.setdefault(key, []).append(it)
    out: List[Dict[str, Any]] = []
    i = 0
    srcs = [s for s in groups if groups[s]]
    while len(out) < total and any(groups.values()):
        s = srcs[i % len(srcs)]
        if groups[s]:
            out.append(groups[s].pop(0))
        i += 1
    return out


def seed_domains():
    domains_data = [
        ("ecommerce", "E-commerce", "Products, prices, categories, availability, and offers."),
        ("real_estate", "Real Estate", "Properties for sale or rent."),
        ("jobs", "Jobs", "Job posts, companies, salaries, and work locations."),
        ("flights_travel", "Flights & Travel", "Flights, hotels, packages, and travel offers."),
        ("automobiles", "Automobiles", "Cars, bikes, and vehicle listings."),
    ]
    db = SessionLocal()
    try:
        for code, name, description in domains_data:
            if not db.query(models.Domain).filter(models.Domain.code == code).first():
                db.add(models.Domain(code=code, name=name, description=description))
        db.commit()
    finally:
        db.close()


@asynccontextmanager
async def lifespan(app: FastAPI):
    try:
        Base.metadata.create_all(bind=engine)
        seed_domains()
        seed_ecommerce()
    except Exception as e:
        logger.error(f"Failed to initialize database: {e}")

    job_scheduler = start_scheduler(interval_minutes=10)
    ecommerce_scheduler = start_ecommerce_scheduler(interval_minutes=15)
    property_scheduler = start_property_scheduler(interval_minutes=15)

    yield

    job_scheduler.shutdown()
    ecommerce_scheduler.shutdown()
    property_scheduler.shutdown()


app = FastAPI(title="ScrapIt Unified API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Database API routers
app.include_router(users.router)
app.include_router(domains.router)
app.include_router(websites.router)
app.include_router(items.router)
app.include_router(products.router)
app.include_router(raw_scraped_products.router)
app.include_router(db_scraper.router)
app.include_router(favorites.router)
app.include_router(db_chatbot.router)
app.include_router(search_history.router)
app.include_router(ecommerce.router)
app.include_router(ai.router)


class ChatRequest(BaseModel):
    user_id: Optional[str] = "user123"
    message: str


class ChatResponse(BaseModel):
    reply: str
    suggestions: List[str] = Field(default_factory=list)


@app.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    user_message = request.message.lower()
    if re.search(r"\b(hello|hi)\b", user_message):
        return {
            "reply": "Hello! I am ScrapBot. How can I help you today?",
            "suggestions": ["Show trending items", "Help with cart", "About ScrapIt"],
        }
    if "trending" in user_message:
        return {
            "reply": "Trending: Laptops, Honda Civic, Property in Islamabad.",
            "suggestions": ["View Laptops", "View Cars"],
        }
    if "cart" in user_message:
        return {
            "reply": "View your items in the Cart section.",
            "suggestions": ["Go to Cart", "Check Total"],
        }
    return {
        "reply": f"I received: '{request.message}'. I can help you find jobs and products!",
        "suggestions": ["Search Jobs", "Search Products", "Contact Support"],
    }


@app.get("/")
async def root():
    return {"message": "ScrapBot API is running"}


def _clean_salary(raw: str, source: str = "") -> str:
    if not raw or not raw.strip():
        return "Not disclosed"
    s = raw.strip()
    blocked = {
        "google_jobs",
        "google",
        "linkedin",
        "careerokay",
        "careerokay.com",
        "not disclosed",
        "n/a",
        "-",
        "",
    }
    if s.lower() in blocked:
        return "Not disclosed"
    if not re.search(r"\d", s):
        return "Not disclosed"
    if re.match(r"^(rs\.?|pkr|usd|\$)", s, re.IGNORECASE):
        return s
    return f"Rs {s}"


def extract_salary_from_text(text: str) -> str:
    if not text:
        return ""
    pattern = (
        r"\b(?:rs\.?|pkr)\s*(\d{2,3},?\d{3})\b"
        r"(?:\s*(?:-|to)\s*(?:rs\.?|pkr)?\s*(\d{2,3},?\d{3})\b)?"
    )
    match = re.search(pattern, text, re.IGNORECASE)
    if match:
        g = match.groups()
        return f"Rs {g[0]} - {g[1]}" if g[1] else f"Rs {g[0]}"
    pattern_k = (
        r"\b(?:rs\.?|pkr)\s*(\d{2,3}\s*k)\b"
        r"(?:\s*(?:-|to)\s*(?:rs\.?|pkr)?\s*(\d{2,3}\s*k)\b)?"
    )
    match_k = re.search(pattern_k, text, re.IGNORECASE)
    if match_k:
        g = match_k.groups()
        return f"Rs {g[0].strip()} - {g[1].strip()}" if g[1] else f"Rs {g[0].strip()}"
    return ""


def _normalize(raw: Dict[str, Any]) -> Dict[str, Any]:
    description = raw.get("description") or raw.get("body") or ""
    if not description.strip():
        snippet_fallback = raw.get("snippet") or raw.get("summary") or ""
        description = snippet_fallback if snippet_fallback.strip() else "No description provided"

    snippet = raw.get("snippet") or raw.get("summary") or ""
    if not snippet and description:
        snippet = (description[:200] + "...") if len(description) > 200 else description

    logo = (
        raw.get("logo")
        or raw.get("image")
        or raw.get("thumbnail")
        or raw.get("company_logo")
        or raw.get("company_thumbnail")
        or ""
    )
    banner = raw.get("banner") or ""
    apply_link = (
        raw.get("apply_link")
        or raw.get("link")
        or raw.get("direct_url")
        or raw.get("job_link")
        or raw.get("url")
        or ""
    )
    if not apply_link:
        opts = raw.get("apply_options", [])
        if opts:
            apply_link = opts[0].get("link", "")

    source = (raw.get("source") or "").strip()
    raw_salary = raw.get("salary") or ""
    salary = _clean_salary(raw_salary, source)
    if salary == "Not disclosed" and description:
        extracted = extract_salary_from_text(description)
        if extracted:
            salary = extracted

    source_label = SOURCE_LABELS.get(source, source.title() if source else "")

    return {
        "title": (raw.get("title") or "").strip(),
        "company": (raw.get("company") or "").strip(),
        "location": (raw.get("location") or "Pakistan").strip(),
        "posted_at": raw.get("posted_at") or raw.get("posted_date") or "",
        "snippet": snippet.strip(),
        "logo": logo.strip(),
        "banner": banner.strip(),
        "source": source,
        "source_label": source_label,
        "description": description.strip(),
        "salary": salary,
        "apply_link": apply_link.strip(),
    }


def _dedupe_and_sort(jobs: List[Dict[str, Any]], max_results: int = 50) -> List[Dict[str, Any]]:
    seen = set()
    unique: List[Dict[str, Any]] = []
    for job in jobs:
        key = (job["title"].lower().strip(), job["company"].lower().strip())
        if key not in seen:
            seen.add(key)
            unique.append(job)
    # Round-robin interleave so every source gets equal representation
    return interleave_by_source(unique, max_results, source_key="source")


def _background_scrape_sync(query: str, max_jobs: int) -> None:
    """Runs in a daemon thread — NEVER called from the request path."""
    key = f"{query}:{max_jobs}"
    if _scrape_in_progress.get(key):
        return
    _scrape_in_progress[key] = True
    try:
        search_jobs(
            query=query,
            max_jobs_per_site=max_jobs,
            force_scrape=True,
        )
        logger.info(f"Background scrape done for query='{query}'")
    except Exception as e:
        logger.error(f"Background scrape failed for query='{query}': {e}")
    finally:
        _scrape_in_progress[key] = False


def _trigger_jobs_bg(query: str, max_jobs: int) -> None:
    """Fire-and-forget background scrape (daemon thread, guarded)."""
    threading.Thread(
        target=_background_scrape_sync,
        args=(query, max_jobs),
        daemon=True,
    ).start()


def _search_jobs_per_source(query: str, per_source_limit: int, shuffle: bool = False) -> List[Dict[str, Any]]:
    """Query each job source separately so interleaving is always balanced.
    Broad fallback: if exact query match yields < 3 for any source, pull latest rows."""
    db = None
    try:
        from app.database import SessionLocal
        from app.models import JobListing
        db = SessionLocal()
        sources = ["linkedin", "careerokay", "google_jobs"]
        all_rows: List[Dict[str, Any]] = []
        for src in sources:
            q_obj = db.query(JobListing).filter(JobListing.source == src)
            if query:
                q_obj = q_obj.filter(JobListing.query.ilike(f"%{query.lower()}%"))
            if shuffle:
                from sqlalchemy.sql.expression import func as sqlfunc
                rows = q_obj.order_by(sqlfunc.random()).limit(per_source_limit).all()
            else:
                rows = q_obj.order_by(JobListing.scraped_at.desc()).limit(per_source_limit).all()
            # Broad fallback
            if len(rows) < 3:
                broad = (
                    db.query(JobListing)
                    .filter(JobListing.source == src)
                    .order_by(JobListing.scraped_at.desc())
                    .limit(per_source_limit)
                    .all()
                )
                seen_ids = {r.id for r in rows}
                rows += [r for r in broad if r.id not in seen_ids]
                rows = rows[:per_source_limit]
            for r in rows:
                try:
                    from scraping_engine.search_services import _row_to_dict as jobs_row_to_dict
                    all_rows.append(jobs_row_to_dict(r))
                except Exception:
                    all_rows.append({"title": r.title, "company": r.company,
                                     "source": r.source, "apply_link": r.apply_link or "",
                                     "location": r.location or "", "salary": r.salary or "",
                                     "description": r.description or "", "snippet": r.snippet or "",
                                     "logo": r.logo or "", "banner": r.banner or "",
                                     "posted_at": r.posted_at or ""})
        logger.info("[PerSourceJobs] %s", {s: sum(1 for r in all_rows if r.get('source') == s) for s in sources})
        return all_rows
    except Exception as exc:
        logger.error("[PerSourceJobs] error: %s", exc)
        return []
    finally:
        if db:
            db.close()


@app.get("/api/jobs")
async def fetch_jobs(
    q: str = Query(..., description="Job search query e.g. 'mechanical engineer'"),
    max_jobs: int = Query(25, ge=1, le=50),
    force_scrape: bool = Query(False),
    exclude_google: bool = Query(False, description="Set true to hide Google Jobs results"),
    shuffle: bool = Query(False, description="Shuffle results"),
    refresh_token: Optional[str] = Query(None, description="Client token to bust cache"),
):
    """DB-ONLY path.  Always returns in < 2s.  Background scrape keeps data fresh."""
    try:
        # Always trigger a background scrape for freshness (guarded, won't double-scrape)
        _trigger_jobs_bg(q, max_jobs)

        # Return DB data immediately
        cached_jobs = await run_in_threadpool(_search_jobs_per_source, q, max_jobs, shuffle)
        normalized = [_normalize(j) for j in cached_jobs]
        if exclude_google:
            normalized = [j for j in normalized if j["source"] != "google_jobs"]
        if shuffle:
            import random
            random.shuffle(normalized)
        result = _dedupe_and_sort(normalized, max_jobs)

        return {
            "status": "success",
            "source": "database",
            "total_results": len(result),
            "jobs": result,
        }
    except Exception as e:
        logger.error(f"/api/jobs error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/jobs/refresh")
async def refresh_jobs(
    q: str = Query(..., description="Job search query e.g. 'mechanical engineer'"),
    max_jobs: int = Query(25, ge=1, le=50),
) -> Dict[str, Any]:
    """Refresh = shuffled DB rows + background scrape trigger.  < 2s."""
    try:
        _trigger_jobs_bg(q, max_jobs)

        cached_jobs = await run_in_threadpool(_search_jobs_per_source, q, max_jobs, True)
        normalized = [_normalize(j) for j in cached_jobs]
        import random
        random.shuffle(normalized)
        result = _dedupe_and_sort(normalized)

        return {
            "status": "refreshing",
            "message": "Background scrape started. Data will be updated shortly.",
            "source": "database_shuffled",
            "total_results": len(result),
            "jobs": result,
        }
    except Exception as e:
        logger.error(f"/api/jobs/refresh error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/refresh-all")
async def refresh_all() -> Dict[str, Any]:
    _trigger_jobs_bg("", 25)
    return {
        "status": "refreshing",
        "message": "Background scrape started. Pull /api/jobs again in a few seconds for fresh results.",
    }


DETAIL_SEL = {
    "linkedin": {
        "description": "div.show-more-less-html__markup",
        "salary": "div.compensation__salary-range, span.salary",
        "posted_at": "span.posted-time-ago__text",
        "logo": "img.artdeco-entity-image",
    },
    "careerokay": {
        "description": "article, [class*='description']",
        "salary": "[class*='salary']",
        "posted_at": "time, [class*='date']",
        "logo": "img[class*='logo']",
    },
}


@app.get("/api/jobs/detail")
async def job_detail(
    link: str = Query(..., description="Job page URL"),
    source: str = Query("", description="linkedin / careerokay"),
):
    from scraping_engine.engine.browser import BrowserManager

    sel = DETAIL_SEL.get(source, {})

    def _scrape():
        with BrowserManager(headless=True) as mgr:
            page = mgr.new_page()
            page.goto(link, wait_until="domcontentloaded", timeout=30000)
            page.wait_for_timeout(2000)
            if source == "linkedin":
                page.evaluate(
                    "document.querySelectorAll('.modal__overlay,.contextual-sign-in-modal')"
                    ".forEach(e=>e.remove())"
                )

            def _t(s):
                if not s:
                    return ""
                loc = page.locator(s)
                return loc.first.inner_text().strip() if loc.count() > 0 else ""

            def _a(s, attr):
                if not s:
                    return ""
                loc = page.locator(s)
                return loc.first.get_attribute(attr) or "" if loc.count() > 0 else ""

            raw_salary = _t(sel.get("salary"))
            return {
                "description": _t(sel.get("description")),
                "salary": _clean_salary(raw_salary, source),
                "posted_at": _t(sel.get("posted_at")),
                "logo": _a(sel.get("logo"), "src"),
                "apply_link": link,
                "source_label": SOURCE_LABELS.get(source, source.title()),
            }

    try:
        result = await asyncio.wait_for(
            run_in_threadpool(_scrape),
            timeout=60.0,
        )
        return result
    except asyncio.TimeoutError:
        raise HTTPException(status_code=504, detail="Detail scrape timed out.")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ===========================================================================
#  PROPERTY / REAL-ESTATE  (zameen / olx / graana)
#  jobs jaisa hi pattern: redis cache -> DB -> live scrape, with redis_lock
# ===========================================================================

PROPERTY_SOURCE_PRIORITY = {
    "zameen": 1,
    "graana": 2,
    "olx": 3,
}

PROPERTY_SOURCE_LABELS = {
    "zameen": "Zameen",
    "graana": "Graana",
    "olx": "OLX",
}

_property_scrape_in_progress: Dict[str, bool] = {}


def _normalize_property(raw: Dict[str, Any]) -> Dict[str, Any]:
    source = (raw.get("source") or "").strip().lower()
    image = raw.get("image_url") or raw.get("image") or ""
    listing_url = raw.get("listing_url") or raw.get("url") or raw.get("link") or ""
    description = raw.get("description") or ""
    if not description.strip():
        description = "No description provided"

    return {
        "id": str(raw.get("id") or ""),
        "title": (raw.get("title") or "").strip(),
        "price": (raw.get("price") or "").strip(),
        "price_amount": raw.get("price_amount"),
        "currency": raw.get("currency") or "PKR",
        "location": (raw.get("location") or "").strip(),
        "beds": (raw.get("beds") or "").strip(),
        "baths": (raw.get("baths") or "").strip(),
        "area": (raw.get("area") or "").strip(),
        "purpose": (raw.get("purpose") or "").strip(),
        "property_type": (raw.get("property_type") or "").strip(),
        "image_url": image.strip(),
        "listing_url": listing_url.strip(),
        "description": description.strip(),
        "agent_name": (raw.get("agent_name") or "").strip(),
        "posted_at": raw.get("posted_at") or "",
        "source": source,
        "source_label": PROPERTY_SOURCE_LABELS.get(source, raw.get("source_label") or source.title()),
    }


def _dedupe_and_sort_property(items: List[Dict[str, Any]], max_results: int = 60) -> List[Dict[str, Any]]:
    seen = set()
    unique: List[Dict[str, Any]] = []
    for it in items:
        key = it.get("listing_url") or (it.get("title", "").lower().strip(), it.get("price", ""))
        if key not in seen:
            seen.add(key)
            unique.append(it)
    # Round-robin interleave so zameen/olx/graana each contribute equally
    return interleave_by_source(unique, max_results, source_key="source")


def _background_scrape_property_sync(query: str, max_listings: int) -> None:
    """Runs in a daemon thread — NEVER called from the request path."""
    key = f"property:{query}:{max_listings}"
    if _property_scrape_in_progress.get(key):
        return
    _property_scrape_in_progress[key] = True
    try:
        search_property(
            query=query,
            max_listings_per_site=max_listings,
            force_scrape=True,
        )
        logger.info(f"Background property scrape done for query='{query}'")
    except Exception as e:
        logger.error(f"Background property scrape failed for query='{query}': {e}")
    finally:
        _property_scrape_in_progress[key] = False


def _trigger_property_bg(query: str, max_listings: int) -> None:
    """Fire-and-forget background scrape (daemon thread, guarded)."""
    threading.Thread(
        target=_background_scrape_property_sync,
        args=(query, max_listings),
        daemon=True,
    ).start()


import threading


def _search_property_per_source(query: str, per_source_limit: int, shuffle: bool = False) -> List[Dict[str, Any]]:
    """Query each property source separately so interleaving is always balanced.
    If exact-query returns too few rows for a source, fall back to broadest recent rows."""
    db = None
    try:
        from app.database import SessionLocal
        from app.models import PropertyListing
        db = SessionLocal()
        sources = ["zameen", "olx", "graana"]
        all_rows: List[Dict[str, Any]] = []
        for src in sources:
            # 1) Exact query match
            q_obj = db.query(PropertyListing).filter(PropertyListing.source == src)
            if query:
                q_obj = q_obj.filter(PropertyListing.query.ilike(f"%{query.lower()}%"))
            if shuffle:
                from sqlalchemy.sql.expression import func as sqlfunc
                rows = q_obj.order_by(sqlfunc.random()).limit(per_source_limit).all()
            else:
                rows = q_obj.order_by(PropertyListing.scraped_at.desc()).limit(per_source_limit).all()
            # 2) Broad fallback: if exact query gave < 3 rows, also pull latest from this source
            if len(rows) < 3:
                broad = (
                    db.query(PropertyListing)
                    .filter(PropertyListing.source == src)
                    .order_by(PropertyListing.scraped_at.desc())
                    .limit(per_source_limit)
                    .all()
                )
                seen_ids = {r.id for r in rows}
                rows += [r for r in broad if r.id not in seen_ids]
                rows = rows[:per_source_limit]
            for r in rows:
                all_rows.append({
                    "id": str(r.id),
                    "title": r.title, "price": r.price,
                    "price_amount": float(r.price_amount) if r.price_amount else None,
                    "currency": r.currency, "location": r.location,
                    "beds": r.beds, "baths": r.baths, "area": r.area,
                    "purpose": r.purpose, "property_type": r.property_type,
                    "image_url": r.image_url, "listing_url": r.listing_url,
                    "description": r.description, "agent_name": r.agent_name,
                    "posted_at": r.posted_at, "source": r.source, "source_label": r.source_label,
                })
        logger.info("[PerSourceProp] %s", {s: sum(1 for r in all_rows if r.get('source') == s) for s in sources})
        return all_rows
    except Exception as exc:
        logger.error("[PerSourceProp] error: %s", exc)
        return []
    finally:
        if db:
            db.close()


@app.get("/api/property")
async def get_properties(
    q: str = Query("", description="Search query e.g. 'houses for sale'"),
    max_listings: int = Query(40, ge=1, le=60),
    force_scrape: bool = Query(False),
    shuffle: bool = Query(False),
    refresh_token: Optional[str] = Query(None),
) -> Dict[str, Any]:
    """DB-ONLY path.  Always returns in < 2s.  Background scrape keeps data fresh."""
    try:
        # Always trigger a background scrape for freshness (guarded, won't double-scrape)
        _trigger_property_bg(q, max_listings)

        # Return DB data immediately
        db_rows = await run_in_threadpool(_search_property_per_source, q, max_listings, shuffle)
        normalized = [_normalize_property(p) for p in db_rows]
        if shuffle:
            import random
            random.shuffle(normalized)
        result = _dedupe_and_sort_property(normalized, max_listings)

        return {
            "status": "success",
            "source": "database",
            "total_results": len(result),
            "listings": result,
        }
    except Exception as e:
        logger.error(f"/api/property error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/property/refresh")
async def refresh_property(
    q: str = Query(..., description="Property search query"),
    max_listings: int = Query(40, ge=1, le=60),
) -> Dict[str, Any]:
    """Refresh = shuffled DB rows + background scrape trigger.  < 2s."""
    try:
        _trigger_property_bg(q, max_listings)

        db_rows = await run_in_threadpool(_search_property_per_source, q, max_listings, True)
        normalized = [_normalize_property(p) for p in db_rows]
        import random
        random.shuffle(normalized)
        result = _dedupe_and_sort_property(normalized)

        return {
            "status": "refreshing",
            "message": "Background scrape started. Data will be updated shortly.",
            "source": "database_shuffled",
            "total_results": len(result),
            "listings": result,
        }
    except Exception as e:
        logger.error(f"/api/property/refresh error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/property/detail")
async def property_detail(
    url: str = Query(..., description="Listing page URL"),
    source: str = Query(..., description="zameen / olx / graana"),
):
    try:
        raw = await asyncio.wait_for(
            run_in_threadpool(scrape_property_detail, source, url),
            timeout=90.0,
        )
        return {"status": "success", "listing": _normalize_property(raw)}
    except asyncio.TimeoutError:
        raise HTTPException(status_code=504, detail="Property detail scrape timed out.")
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"/api/property/detail error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    import uvicorn

    host = os.environ.get("HOST", "0.0.0.0")
    uvicorn.run(app, host=host, port=8000)