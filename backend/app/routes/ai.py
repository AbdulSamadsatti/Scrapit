import json
import os
from pathlib import Path
from typing import List, Dict, Any, Optional

from fastapi import APIRouter, HTTPException, Query

router = APIRouter()

# Base directory for AI handoff resources
AI_HANDOFF_DIR = Path(os.path.abspath(os.path.join(os.path.dirname(__file__), "../../../ai_handoff")))

def load_json(filename: str) -> List[Dict[str, Any]]:
    file_path = AI_HANDOFF_DIR / filename
    if not file_path.is_file():
        raise HTTPException(status_code=404, detail=f"Sample data file '{filename}' not found")
    with open(file_path, "r", encoding="utf-8") as f:
        return json.load(f)

# Load datasets lazily
DATASETS: Dict[str, List[Dict[str, Any]]] = {}

def get_dataset(domain: str) -> List[Dict[str, Any]]:
    if domain not in DATASETS:
        filename = f"sample_{domain}.json"
        DATASETS[domain] = load_json(filename)
    return DATASETS[domain]

@router.get("/api/ai/dataset")
async def get_dataset_endpoint(
    domain: str = Query(..., description="Domain: ecommerce, jobs, or property"),
    limit: int = Query(500, ge=1, description="Maximum records to return"),
    offset: int = Query(0, ge=0, description="Number of records to skip"),
):
    items = get_dataset(domain)
    total = len(items)
    sliced = items[offset : offset + limit]
    return {"status": "success", "data": {"total": total, "items": sliced}}

@router.get("/api/ai/item")
async def get_item_endpoint(
    domain: str = Query(...),
    id: str = Query(..., description="Item identifier"),
):
    items = get_dataset(domain)
    for item in items:
        if item.get("id") == id:
            return {"status": "success", "data": item}
    raise HTTPException(status_code=404, detail="Item not found")

@router.get("/api/ai/search")
async def search_items_endpoint(
    domain: str = Query(...),
    q: str = Query(..., description="Search term"),
    limit: int = Query(25, ge=1),
    offset: int = Query(0, ge=0),
):
    items = get_dataset(domain)
    term = q.lower()
    matched = [i for i in items if term in i.get("title", "").lower() or term in i.get("description", "").lower()]
    total = len(matched)
    sliced = matched[offset : offset + limit]
    return {"status": "success", "data": {"total": total, "items": sliced}}

@router.post("/api/ai/events")
async def post_event_endpoint(event: Dict[str, Any]):
    # In a real implementation this would be persisted or forwarded.
    # Here we simply acknowledge receipt.
    return {"status": "success", "data": {"received": event}}

@router.get("/api/ai/recommendations")
async def get_recommendations_endpoint(
    user_id: str = Query(..., description="User identifier"),
    limit: int = Query(10, ge=1),
):
    # For demo purposes we return the first `limit` items from the ecommerce dataset.
    items = get_dataset("ecommerce")
    return {"status": "success", "data": {"user_id": user_id, "recommendations": items[:limit]}}
