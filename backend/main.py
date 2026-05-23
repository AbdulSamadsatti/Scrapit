import sys
import os
import re
import asyncio
import logging

# Ensure the project root (scrapers) is on PYTHONPATH so that 'scraping_engine' can be imported
project_root = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
if project_root not in sys.path:
    sys.path.append(project_root)

sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from fastapi import FastAPI, Query, HTTPException, BackgroundTasks
from fastapi.concurrency import run_in_threadpool
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from scraping_engine.core.runner import run_all_scrapers
from scraping_engine.core.scheduler import start_scheduler
from scraping_engine.search_services import (
    search_jobs,
    purge_all_jobs,
)

# Database imports
from app.database import Base, SessionLocal, engine
from app import models
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
)

logger = logging.getLogger(__name__)

# ── Source priority: LinkedIn > Rozee > Indeed > Google ──────────
SOURCE_PRIORITY = {
    "linkedin":    1,
    "rozee":       2,
    "indeed":      3,
    "google_jobs": 4,
}

# ── Source display labels ─────────────────────────────────────────
SOURCE_LABELS = {
    "linkedin":    "LinkedIn",
    "rozee":       "Rozee.pk",
    "indeed":      "Indeed",
    "google_jobs": "Google Jobs",
}

# ── Background scrape tracker (query -> is_running) ──────────────
_scrape_in_progress: Dict[str, bool] = {}


def seed_domains():
    domains_data = [
        ("ecommerce",     "E-commerce",      "Products, prices, categories, availability, and offers."),
        ("real_estate",   "Real Estate",      "Properties for sale or rent."),
        ("jobs",          "Jobs",             "Job posts, companies, salaries, and work locations."),
        ("flights_travel","Flights & Travel", "Flights, hotels, packages, and travel offers."),
        ("automobiles",   "Automobiles",      "Cars, bikes, and vehicle listings."),
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
    except Exception as e:
        logger.error(f"Failed to initialize database: {e}")

    scheduler = start_scheduler(interval_minutes=10)
    yield
    scheduler.shutdown()


app = FastAPI(title="ScrapIt Unified API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include Database API Routers
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


# ── Chat ──────────────────────────────────────────────────────────

class ChatRequest(BaseModel):
    user_id: Optional[str] = "user123"
    message: str

class ChatResponse(BaseModel):
    reply: str
    suggestions: List[str] = Field(default_factory=list)

@app.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    user_message = request.message.lower()
    if re.search(r'\b(hello|hi)\b', user_message):
        return {"reply": "Hello! I am ScrapBot. How can I help you today?",
                "suggestions": ["Show trending items", "Help with cart", "About ScrapIt"]}
    elif "trending" in user_message:
        return {"reply": "Trending: Laptops, Honda Civic, Property in Islamabad.",
                "suggestions": ["View Laptops", "View Cars"]}
    elif "cart" in user_message:
        return {"reply": "View your items in the Cart section.",
                "suggestions": ["Go to Cart", "Check Total"]}
    else:
        return {"reply": f"I received: '{request.message}'. I can help you find jobs!",
                "suggestions": ["Search Jobs", "Contact Support"]}

@app.get("/")
async def root():
    return {"message": "ScrapBot API is running"}


# ── Normalizer ────────────────────────────────────────────────────

def _clean_salary(raw: str, source: str = "") -> str:
    if not raw or not raw.strip():
        return "Not disclosed"
    s = raw.strip()
    blocked = {
        "google_jobs", "google", "linkedin", "rozee",
        "indeed", "rozee.pk", "not disclosed", "n/a", "-", ""
    }
    if s.lower() in blocked:
        return "Not disclosed"
    if not re.search(r'\d', s):
        return "Not disclosed"
    if re.match(r'^(rs\.?|pkr|usd|\$)', s, re.IGNORECASE):
        return s
    return f"Rs {s}"


def extract_salary_from_text(text: str) -> str:
    if not text:
        return ""
    pattern = r'\b(?:rs\.?|pkr)\s*(\d{2,3},?\d{3})\b(?:\s*(?:-|to)\s*(?:rs\.?|pkr)?\s*(\d{2,3},?\d{3})\b)?'
    match = re.search(pattern, text, re.IGNORECASE)
    if match:
        g = match.groups()
        return f"Rs {g[0]} - {g[1]}" if g[1] else f"Rs {g[0]}"
    pattern_k = r'\b(?:rs\.?|pkr)\s*(\d{2,3}\s*k)\b(?:\s*(?:-|to)\s*(?:rs\.?|pkr)?\s*(\d{2,3}\s*k)\b)?'
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
        raw.get("logo") or raw.get("image") or raw.get("thumbnail")
        or raw.get("company_logo") or raw.get("company_thumbnail") or ""
    )
    banner = raw.get("banner") or ""
    apply_link = (
        raw.get("apply_link") or raw.get("link") or raw.get("direct_url")
        or raw.get("job_link") or raw.get("url") or ""
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
        "title":        (raw.get("title")    or "").strip(),
        "company":      (raw.get("company")  or "").strip(),
        "location":     (raw.get("location") or "Pakistan").strip(),
        "posted_at":    raw.get("posted_at") or raw.get("posted_date") or "",
        "snippet":      snippet.strip(),
        "logo":         logo.strip(),
        "banner":       banner.strip(),
        "source":       source,
        "source_label": source_label,
        "description":  description.strip(),
        "salary":       salary,
        "apply_link":   apply_link.strip(),
    }


def _dedupe_and_sort(jobs: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """Remove duplicates by title+company and sort by source priority."""
    seen = set()
    unique: List[Dict[str, Any]] = []
    for job in jobs:
        key = (job["title"].lower().strip(), job["company"].lower().strip())
        if key not in seen:
            seen.add(key)
            unique.append(job)
    unique.sort(key=lambda j: SOURCE_PRIORITY.get(j["source"], 99))
    return unique


# ── Background scraper (fire-and-forget) ─────────────────────────

async def _background_scrape(query: str, max_jobs: int) -> None:
    """
    Runs a live scrape in background so the next request gets fresh DB results.
    Guarded by _scrape_in_progress to prevent duplicate parallel scrapes.
    """
    key = f"{query}:{max_jobs}"
    if _scrape_in_progress.get(key):
        return
    _scrape_in_progress[key] = True
    try:
        await run_in_threadpool(
            search_jobs,
            query=query,
            max_jobs_per_site=max_jobs,
            force_scrape=True,
        )
        logger.info(f"Background scrape done for query='{query}'")
    except Exception as e:
        logger.error(f"Background scrape failed for query='{query}': {e}")
    finally:
        _scrape_in_progress[key] = False


# ── /api/jobs ─────────────────────────────────────────────────────

@app.get("/api/jobs")
async def fetch_jobs(
    background_tasks: BackgroundTasks,
    q: str = Query(..., description="Job search query e.g. 'mechanical engineer'"),
    max_jobs: int = Query(25, ge=1, le=50),
    force_scrape: bool = Query(False),
    exclude_google: bool = Query(False, description="Set true to hide Google Jobs results"),
):
    """
    Cache-first strategy:
    1. Try DB cache first (fast, < 1s).
    2. If cache hit → return immediately + trigger background scrape for next time.
    3. If cache miss → do a live scrape with a 60s timeout (not 300s).
    4. force_scrape=True skips cache and scrapes live (60s timeout).

    This eliminates 504s for cached queries.
    """
    try:
        if not force_scrape:
            # ── Step 1: Try cache (force_scrape=False, fast DB lookup) ──
            cached = await run_in_threadpool(
                search_jobs,
                query=q,
                max_jobs_per_site=max_jobs,
                force_scrape=False,
            )
            cached_jobs = cached.get("jobs", [])

            if cached_jobs:
                # Cache hit → respond immediately
                normalized = [_normalize(j) for j in cached_jobs]
                if exclude_google:
                    normalized = [j for j in normalized if j["source"] != "google_jobs"]
                result = _dedupe_and_sort(normalized)

                # Kick off a background scrape so next request gets fresher data
                background_tasks.add_task(_background_scrape, q, max_jobs)

                return {
                    "status":        "success",
                    "source":        "cache",
                    "total_results": len(result),
                    "jobs":          result,
                }

        # ── Step 2: Cache miss or force_scrape → live scrape (180s timeout) ──
        live = await asyncio.wait_for(
            run_in_threadpool(
                search_jobs,
                query=q,
                max_jobs_per_site=max_jobs,
                force_scrape=True,
            ),
            timeout=180.0,   # Increased timeout so scrape can actually finish
        )
        normalized = [_normalize(j) for j in live.get("jobs", [])]
        if exclude_google:
            normalized = [j for j in normalized if j["source"] != "google_jobs"]
        result = _dedupe_and_sort(normalized)

        return {
            "status":        "success",
            "source":        live.get("source", "live_scrape"),
            "total_results": len(result),
            "jobs":          result,
        }

    except asyncio.TimeoutError:
        raise HTTPException(
            status_code=504,
            detail="Live scrape timed out (180s). Cached results may be available — retry without force_scrape.",
        )
    except Exception as e:
        logger.error(f"/api/jobs error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ── /api/jobs/refresh ─────────────────────────────────────────────

@app.get("/api/jobs/refresh")
async def refresh_jobs(
    q: str = Query(..., description="Job search query e.g. 'mechanical engineer'"),
    max_jobs: int = Query(25, ge=1, le=50),
) -> Dict[str, Any]:
    """
    Force a live scrape and return fresh results.
    Timeout: 60s (was 300s).
    """
    try:
        live = await asyncio.wait_for(
            run_in_threadpool(
                search_jobs,
                query=q,
                max_jobs_per_site=max_jobs,
                force_scrape=True,
            ),
            timeout=180.0,
        )
        normalized = [_normalize(j) for j in live.get("jobs", [])]
        result = _dedupe_and_sort(normalized)
        return {
            "status":        "success",
            "source":        live.get("source", "live_scrape"),
            "total_results": len(result),
            "jobs":          result,
        }
    except asyncio.TimeoutError:
        raise HTTPException(status_code=504, detail="Scraping timed out (180s). Try again.")
    except Exception as e:
        logger.error(f"/api/jobs/refresh error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ── /api/refresh-all ─────────────────────────────────────────────

@app.get("/api/refresh-all")
async def refresh_all(background_tasks: BackgroundTasks) -> Dict[str, Any]:
    """
    Triggers a background scrape for all sources.
    Returns immediately with status instead of hanging for 300s.
    """
    background_tasks.add_task(_background_scrape, "", 25)
    return {
        "status":  "refreshing",
        "message": "Background scrape started. Pull /api/jobs again in a few seconds for fresh results.",
    }


# ── /api/jobs/detail ─────────────────────────────────────────────

DETAIL_SEL = {
    "linkedin": {
        "description": "div.show-more-less-html__markup",
        "salary":      "div.compensation__salary-range, span.salary",
        "posted_at":   "span.posted-time-ago__text",
        "logo":        "img.artdeco-entity-image",
    },
    "indeed": {
        "description": "div#jobDescriptionText",
        "salary":      "div#salaryInfoAndJobType span",
        "posted_at":   "span[data-testid='myJobsStateDate']",
        "logo":        "img[class*='companyAvatar']",
    },
    "rozee": {
        "description": "div.j-desc, div.job-detail-desc",
        "salary":      "span.salary, div.salary-detail",
        "posted_at":   "span.time, span.posted",
        "logo":        "div.logo img, img.company-logo",
    },
}

@app.get("/api/jobs/detail")
async def job_detail(
    link:   str = Query(..., description="Job page URL"),
    source: str = Query("",  description="linkedin / indeed / rozee"),
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
                if not s: return ""
                loc = page.locator(s)
                return loc.first.inner_text().strip() if loc.count() > 0 else ""
            def _a(s, attr):
                if not s: return ""
                loc = page.locator(s)
                return loc.first.get_attribute(attr) or "" if loc.count() > 0 else ""

            raw_salary = _t(sel.get("salary"))
            return {
                "description":  _t(sel.get("description")),
                "salary":       _clean_salary(raw_salary, source),
                "posted_at":    _t(sel.get("posted_at")),
                "logo":         _a(sel.get("logo"), "src"),
                "apply_link":   link,
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


if __name__ == "__main__":
    import uvicorn
    host = os.environ.get("HOST", "0.0.0.0")
    uvicorn.run(app, host=host, port=8000)