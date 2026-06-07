import sys
import os
import re

# Add parent directory to sys.path so backend can access scraping_engine
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from fastapi import FastAPI, Query, HTTPException
from fastapi.concurrency import run_in_threadpool
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from fastapi.middleware.cors import CORSMiddleware

from scraping_engine.serp.google_job import get_google_jobs
from scraping_engine.core.travel_runner import (
    flatten_travel_results,
    run_all_travel_scrapers,
)

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


class ChatRequest(BaseModel):
    user_id: Optional[str] = "user123"
    message: str


class ChatResponse(BaseModel):
    reply: str
    suggestions: List[str] = Field(default_factory=list)


@app.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    print(f"Received message: {request.message}")
    user_message = request.message.lower()

    if re.search(r'\b(hello|hi)\b', user_message):
        return {
            "reply": "Hello! I am ScrapBot. How can I help you today?",
            "suggestions": ["Show trending items", "Help with cart", "About ScrapIt"],
        }
    elif "trending" in user_message:
        return {
            "reply": "Our current trending items include Laptops, Honda Civic, and Property in Islamabad.",
            "suggestions": ["View Laptops", "View Cars"],
        }
    elif "cart" in user_message:
        return {
            "reply": "You can view your items in the Cart section and proceed to checkout.",
            "suggestions": ["Go to Cart", "Check Total"],
        }
    else:
        return {
            "reply": f"I received your message: '{request.message}'. I'm still learning, but I can help you find products!",
            "suggestions": ["Search Products", "Contact Support"],
        }


@app.get("/")
async def root():
    return {"message": "ScrapBot API is running"}


@app.get("/api/jobs")
async def fetch_jobs(
    query: str = Query(..., description="Job search query, e.g., 'python developer'"),
    location: Optional[str] = Query(None, description="Location, e.g., 'Islamabad, Pakistan'"),
    gl: str = Query("us", description="Country code, e.g., 'us'"),
    hl: str = Query("en", description="Language code, e.g., 'en'")
):
    """
    Fetch job postings from Google Jobs via SerpApi.
    """
    try:
        jobs = get_google_jobs(query=query, location=location, gl=gl, hl=hl)
        return {
            "status": "success",
            "total_results": len(jobs),
            "jobs": jobs
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/travel")
async def fetch_travel(
    q: str = Query("Hunza tour", description="Travel search query, e.g., 'Hunza tour'"),
    max_items: int = Query(5, ge=1, le=20, description="Maximum items per travel source"),
):
    """
    Fetch travel listings from Kipgo, Sastaticket, and Bookme.
    """
    try:
        results = await run_in_threadpool(
            run_all_travel_scrapers,
            query=q,
            max_items_per_site=max_items,
        )
        travel_items = flatten_travel_results(results)
        return {
            "status": "success",
            "source": "live_travel_scrape",
            "query": q,
            "total_results": len(travel_items),
            "results_by_source": results,
            "travel_items": travel_items,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    import uvicorn

    host = os.environ.get("HOST", "127.0.0.1")
    uvicorn.run(app, host=host, port=8000)
