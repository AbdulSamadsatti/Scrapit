import asyncio
import logging
import threading
from decimal import Decimal
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.concurrency import run_in_threadpool
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func

from app import models
from app.database import get_db, SessionLocal
from scraping_engine.core.ecommerce_runner import (
    flatten_ecommerce_results,
    run_all_ecommerce_scrapers,
    scrape_ecommerce_detail,
)
from scraping_engine.core.ecommerce_storage import save_ecommerce_products
from app.services.redis_client import get_cache, set_cache, delete_cache, make_key, redis_lock

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/ecommerce", tags=["ecommerce"])


def _num(value: Any) -> Optional[float]:
    if isinstance(value, Decimal):
        return float(value)
    if value is None:
        return None
    try:
        return float(value)
    except (TypeError, ValueError):
        return None


def _product_to_api(product: models.Product) -> Dict[str, Any]:
    meta = product.metadata_json or {}
    website = product.website
    source = (meta.get("source") or (website.name.lower() if website else "")).lower()
    return {
        "id": str(product.id),
        "title": product.title,
        "price": f"{product.currency or 'PKR'} {product.price}" if product.price is not None else "",
        "price_amount": _num(product.price),
        "currency": product.currency or "PKR",
        "image_url": product.image_url or "",
        "product_url": product.product_url or "",
        "description": product.description or "",
        "rating": meta.get("rating") or "",
        "review_count": meta.get("review_count") or "",
        "seller_name": meta.get("seller_name") or "",
        "availability": product.availability or "",
        "location": meta.get("location") or "",
        "category": product.category or "",
        "brand": meta.get("brand") or "",
        "source": source,
        "source_label": meta.get("source_label") or (website.name if website else source.title()),
        "created_at": product.created_at.isoformat() if product.created_at else "",
        "last_seen_at": product.last_seen_at.isoformat() if product.last_seen_at else "",
    }


def interleave_by_source(items: List[Dict[str, Any]], total: int, source_key: str = "source") -> List[Dict[str, Any]]:
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


def _query_db_products(db: Session, q: str, limit: int, shuffle: bool = False) -> List[Dict[str, Any]]:
    query = db.query(models.Product).options(joinedload(models.Product.website))
    if q:
        query = query.filter(models.Product.title.ilike(f"%{q}%"))
        query = query.order_by(models.Product.last_seen_at.desc())
        rows = query.limit(limit).all()
    else:
        from sqlalchemy.sql.expression import func
        # If no query, randomize the results to show diverse categories
        query = query.order_by(func.random())
        rows = query.limit(limit).all()
    return [_product_to_api(row) for row in rows]


def _query_db_products_per_source(db: Session, q: str, per_source_limit: int) -> List[Dict[str, Any]]:
    sources = ["daraz", "olx", "priceoye", "amazon"]
    all_rows = []
    for src in sources:
        query = db.query(models.Product).join(models.Product.website).options(joinedload(models.Product.website))
        if q:
            query = query.filter(models.Product.title.ilike(f"%{q}%"))
        # Filter by source website name
        query = query.filter(models.Website.name.ilike(src))
        rows = query.order_by(models.Product.last_seen_at.desc()).limit(per_source_limit).all()
        for r in rows:
            all_rows.append(_product_to_api(r))
    return all_rows


def _dedupe_and_sort_products(products: List[Dict[str, Any]], max_results: int = 40) -> List[Dict[str, Any]]:
    seen = set()
    unique = []
    for p in products:
        key = p.get("product_url") or (p.get("title", "").lower().strip(), p.get("source", ""))
        if key not in seen:
            seen.add(key)
            unique.append(p)
    return interleave_by_source(unique, max_results, source_key="source")


_ecommerce_scrape_in_progress: Dict[str, bool] = {}


def _background_ecommerce_sync(q: str, max_products: int):
    """Runs in a daemon thread — NEVER called from the request path."""
    key = f"ecommerce:{q}:{max_products}"
    if _ecommerce_scrape_in_progress.get(key):
        return
    _ecommerce_scrape_in_progress[key] = True
    db = SessionLocal()
    try:
        import random
        target_q = q
        if not target_q:
            target_q = random.choice(["laptop", "camera", "shoes", "watch", "perfume", "headphones", "bag", "sunglasses", "smartphone", "smartwatch", "gaming console"])
        live = run_all_ecommerce_scrapers(
            query=target_q,
            max_products_per_site=max(1, min(max_products, 30)),
        )
        scraped_products = flatten_ecommerce_results(live)
        if scraped_products:
            save_ecommerce_products(q or "manual", scraped_products)
        logger.info("Background ecommerce scrape done for query='%s' (%s products)", q, len(scraped_products))
    except Exception as exc:
        logger.error("Background ecommerce scrape error: %s", exc)
    finally:
        _ecommerce_scrape_in_progress[key] = False
        db.close()


def _trigger_ecommerce_bg(q: str, max_products: int):
    """Fire-and-forget background scrape (daemon thread, guarded)."""
    import threading
    threading.Thread(
        target=_background_ecommerce_sync,
        args=(q, max_products),
        daemon=True,
    ).start()


def _query_db_products_per_source_broad(db: Session, q: str, per_source_limit: int, shuffle: bool = False) -> List[Dict[str, Any]]:
    """Per-source DB query with broad fallback if exact query yields too few results."""
    sources = ["daraz", "olx", "priceoye", "amazon"]
    all_rows = []
    for src in sources:
        query = db.query(models.Product).join(models.Product.website).options(joinedload(models.Product.website))
        if q:
            query = query.filter(models.Product.title.ilike(f"%{q}%"))
        query = query.filter(models.Website.name.ilike(src))
        if shuffle:
            query = query.order_by(func.random())
        else:
            query = query.order_by(models.Product.last_seen_at.desc())
        rows = query.limit(per_source_limit).all()
        # Broad fallback
        if len(rows) < 3:
            broad = (
                db.query(models.Product)
                .join(models.Product.website)
                .options(joinedload(models.Product.website))
                .filter(models.Website.name.ilike(src))
                .order_by(models.Product.last_seen_at.desc())
                .limit(per_source_limit)
                .all()
            )
            seen_ids = {r.id for r in rows}
            rows += [r for r in broad if r.id not in seen_ids]
            rows = rows[:per_source_limit]
        for r in rows:
            all_rows.append(_product_to_api(r))
    return all_rows

@router.get("/products")
async def search_ecommerce_products(
    q: str = Query("", description="Product search query e.g. 'iphone 15'"),
    max_products: int = Query(40, ge=1, le=100),
    force_refresh: bool = Query(False, description="Set true to trigger a background rescrape"),
    shuffle: bool = Query(False, description="Shuffle results"),
    refresh_token: Optional[str] = Query(None, description="Client token to bust cache"),
    db: Session = Depends(get_db),
) -> Dict[str, Any]:
    """DB-ONLY path.  Always returns in < 2s.  Background scrape keeps data fresh."""
    try:
        # Always trigger a background scrape for freshness (guarded, won't double-scrape)
        _trigger_ecommerce_bg(q, max_products)

        # Return DB data immediately
        db_products = await run_in_threadpool(
            _query_db_products_per_source_broad, db, q, max_products, shuffle
        )
        if shuffle:
            import random
            random.shuffle(db_products)
        interleaved = _dedupe_and_sort_products(db_products, max_products)

        return {
            "status": "success",
            "source": "database",
            "query": q,
            "total_results": len(interleaved),
            "products": interleaved,
        }
    except Exception as exc:
        logger.error("/api/ecommerce/products error: %s", exc)
        raise HTTPException(status_code=500, detail=str(exc)) from exc



@router.get("/products/detail")
async def ecommerce_product_detail(
    source: str = Query("", description="daraz / olx / priceoye / amazon"),
    url: str = Query("", description="Product detail URL, or Amazon ASIN/URL for Oxylabs"),
    product_id: Optional[int] = Query(None, description="DB product id"),
    db: Session = Depends(get_db),
) -> Dict[str, Any]:
    try:
        if product_id:
            product = (
                db.query(models.Product)
                .options(joinedload(models.Product.website))
                .filter(models.Product.id == product_id)
                .first()
            )
            if not product:
                raise HTTPException(status_code=404, detail="Product not found")
            return {"status": "success", "source": "database", "product": _product_to_api(product)}

        if not source or not url:
            raise HTTPException(status_code=400, detail="Provide product_id or source + url")

        detail = await asyncio.wait_for(
            run_in_threadpool(scrape_ecommerce_detail, source, url),
            timeout=100.0,
        )
        return {"status": "success", "source": "live_detail", "product": detail}
    except asyncio.TimeoutError as exc:
        raise HTTPException(status_code=504, detail="Product detail scrape timed out.") from exc
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except HTTPException:
        raise
    except Exception as exc:
        logger.error("/api/ecommerce/products/detail error: %s", exc)
        raise HTTPException(status_code=500, detail=str(exc)) from exc