from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app import models, schemas
from app.database import get_db
from app.services.product_cleaner import upsert_product_from_raw


router = APIRouter(prefix="/raw-scraped-products", tags=["raw scraped products"])


@router.post("", response_model=schemas.RawScrapedProductRead, status_code=status.HTTP_201_CREATED)
def create_raw_scraped_product(
    raw_product: schemas.RawScrapedProductCreate,
    db: Session = Depends(get_db),
):
    if not db.get(models.Website, raw_product.website_id):
        raise HTTPException(status_code=404, detail="Website not found")

    db_raw_product = models.RawScrapedProduct(**raw_product.model_dump())
    db.add(db_raw_product)
    db.commit()
    db.refresh(db_raw_product)
    return db_raw_product


@router.get("", response_model=list[schemas.RawScrapedProductRead])
def list_raw_scraped_products(
    website_id: int | None = None,
    limit: int = Query(default=20, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    db: Session = Depends(get_db),
):
    query = db.query(models.RawScrapedProduct)
    if website_id:
        query = query.filter(models.RawScrapedProduct.website_id == website_id)

    return (
        query.order_by(models.RawScrapedProduct.scraped_at.desc())
        .offset(offset)
        .limit(limit)
        .all()
    )


@router.post("/{raw_product_id}/normalize", response_model=schemas.ProductRead)
def normalize_raw_scraped_product(raw_product_id: int, db: Session = Depends(get_db)):
    raw_product = db.get(models.RawScrapedProduct, raw_product_id)
    if not raw_product:
        raise HTTPException(status_code=404, detail="Raw scraped product not found")

    try:
        return upsert_product_from_raw(db, raw_product)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
