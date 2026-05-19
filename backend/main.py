import sys
import os
import re
import asyncio
import logging

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from fastapi import FastAPI, Query, HTTPException
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from scraping_engine.core.runner import run_all_scrapers
from scraping_engine.core.scheduler import start_scheduler
from scraping_engine.search_services import search_jobs

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
            existing = db.query(models.Domain).filter(models.Domain.code == code).first()
            if existing:
                continue
            db.add(models.Domain(code=code, name=name, description=description))
        db.commit()
    finally:
        db.close()


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize DB tables and seed domains
    try:
        Base.metadata.create_all(bind=engine)
        seed_domains()
        logger.info("Database initialized and seeded successfully.")
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



# ── Chat (unchanged) ──────────────────────────────────────────────

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


# ── Normalizer — any scraper output → one consistent shape ───────

def _normalize(raw: Dict[str, Any]) -> Dict[str, Any]:
    description = raw.get("description", "")
    snippet = (description[:180] + "...") if len(description) > 180 else description
    logo = raw.get("logo") or raw.get("image") or raw.get("thumbnail") or ""
    apply_link = raw.get("apply_link") or raw.get("link") or raw.get("direct_url") or ""
    if not apply_link:
        opts = raw.get("apply_options", [])
        if opts:
            apply_link = opts[0].get("link", "")
    return {
        "title":       raw.get("title",    ""),
        "company":     raw.get("company",  ""),
        "location":    raw.get("location", ""),
        "posted_at":   raw.get("posted_at") or raw.get("posted_date") or "",
        "snippet":     snippet,
        "logo":        logo,
        "source":      raw.get("source",   ""),
        "description": description,
        "salary":      raw.get("salary",   ""),
        "apply_link":  apply_link,
    }


# ── /api/jobs ─────────────────────────────────────────────────────
# React job list screen — shows cards with logo, title, snippet
# FIX: asyncio executor + 120s timeout so Postman doesn't timeout
# ─────────────────────────────────────────────────────────────────

@app.get("/api/jobs")
async def fetch_jobs(
    q: str = Query(..., description="Job search query e.g. 'mechanical engineer'"),
    max_jobs: int = Query(10, ge=1, le=30),
    force_scrape: bool = Query(False),
):
    """
    Returns:
    {
        "status": "success",
        "source": "live_scrape" | "database",
        "total_results": 25,
        "jobs": [
            {
                "title", "company", "location", "logo",
                "snippet",      <- 180 char preview for list card
                "description",  <- full text for detail screen
                "salary", "apply_link", "source", "posted_at"
            }
        ]
    }
    """
    try:
        loop = asyncio.get_event_loop()
        result = await asyncio.wait_for(
            loop.run_in_executor(
                None,
                lambda: search_jobs(
                    query=q,
                    max_jobs_per_site=max_jobs,
                    force_scrape=force_scrape,
                )
            ),
            timeout=120.0,   # 2 min — enough for all 4 scrapers
        )
        normalized = [_normalize(j) for j in result.get("jobs", [])]
        return {
            "status":        "success",
            "source":        result.get("source", "live_scrape"),
            "total_results": len(normalized),
            "jobs":          normalized,
        }
    except asyncio.TimeoutError:
        raise HTTPException(status_code=504, detail="Scraping timed out. Try again.")
    except Exception as e:
        logger.error(f"/api/jobs error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ── /api/jobs/detail ──────────────────────────────────────────────
# React detail screen — full description, salary, apply button
# ─────────────────────────────────────────────────────────────────

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
    """
    Full job detail for React detail screen.
    User taps Apply Now → apply_link opens in browser (actual website).
    """
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
            return {
                "description": _t(sel.get("description")),
                "salary":      _t(sel.get("salary")),
                "posted_at":   _t(sel.get("posted_at")),
                "logo":        _a(sel.get("logo"), "src"),
                "apply_link":  link,
            }

    try:
        loop = asyncio.get_event_loop()
        result = await asyncio.wait_for(
            loop.run_in_executor(None, _scrape),
            timeout=60.0,
        )
        return result
    except asyncio.TimeoutError:
        raise HTTPException(status_code=504, detail="Detail scrape timed out.")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    import uvicorn
    host = os.environ.get("HOST", "127.0.0.1")
    uvicorn.run(app, host=host, port=8000)