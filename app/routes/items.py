from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app import models, schemas
from app.database import get_db


router = APIRouter(prefix="/items", tags=["items"])


@router.get("", response_model=list[schemas.ItemRead])
def list_items(
    domain_id: int | None = None,
    q: str | None = None,
    city: str | None = None,
    country: str | None = None,
    limit: int = Query(default=20, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    db: Session = Depends(get_db),
):
    query = db.query(models.Item)
    if domain_id:
        query = query.filter(models.Item.domain_id == domain_id)
    if q:
        query = query.filter(models.Item.title.ilike(f"%{q}%"))
    if city:
        query = query.filter(models.Item.city == city)
    if country:
        query = query.filter(models.Item.country == country)

    return query.order_by(models.Item.created_at.desc()).offset(offset).limit(limit).all()


@router.get("/{item_id}", response_model=schemas.ItemRead)
def get_item(item_id: int, db: Session = Depends(get_db)):
    item = db.get(models.Item, item_id)
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    return item
