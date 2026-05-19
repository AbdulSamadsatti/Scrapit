from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app import models, schemas
from app.database import get_db
from app.services.item_cleaner import upsert_item_from_raw


router = APIRouter(prefix="/scraper", tags=["scraper pipeline"])


@router.post("/ingest", response_model=schemas.MultiDomainScraperIngestResult, status_code=status.HTTP_201_CREATED)
def ingest_scraped_products(
    request: schemas.MultiDomainScraperIngestRequest,
    db: Session = Depends(get_db),
):
    raw_item_ids: list[int] = []
    item_ids: list[int] = []
    skipped: list[str] = []
    scrape_run: models.ScrapeRun | None = None

    first_item = request.items[0] if request.items else None
    if first_item:
        if not db.get(models.Domain, first_item.domain_id):
            raise HTTPException(status_code=404, detail="Domain not found")
        if not db.get(models.Website, first_item.website_id):
            raise HTTPException(status_code=404, detail="Website not found")

        scrape_run = models.ScrapeRun(
            domain_id=first_item.domain_id,
            website_id=first_item.website_id,
            scraper_name=request.scraper_name,
            total_found=len(request.items),
        )
        db.add(scrape_run)
        db.commit()
        db.refresh(scrape_run)

    for item in request.items:
        domain = db.get(models.Domain, item.domain_id)
        if not domain:
            skipped.append(f"domain_id {item.domain_id} not found")
            continue

        website = db.get(models.Website, item.website_id)
        if not website:
            skipped.append(f"website_id {item.website_id} not found")
            continue
        if website.domain_id and website.domain_id != item.domain_id:
            skipped.append(f"website_id {item.website_id} does not belong to domain_id {item.domain_id}")
            continue

        item_data = item.model_dump(exclude={"detail_data"})
        raw_item = models.RawScrapedItem(
            **item_data,
            scrape_run_id=scrape_run.id if scrape_run else None,
        )
        db.add(raw_item)
        db.commit()
        db.refresh(raw_item)
        raw_item_ids.append(raw_item.id)

        if not request.normalize:
            continue

        try:
            clean_item = upsert_item_from_raw(db, raw_item, item.detail_data)
        except ValueError as exc:
            raw_item.processing_status = "failed"
            raw_item.error_message = str(exc)
            db.commit()
            skipped.append(f"raw_item_id {raw_item.id}: {exc}")
            continue

        item_ids.append(clean_item.id)

    if not raw_item_ids:
        raise HTTPException(status_code=400, detail="No scraped products were saved")

    if scrape_run:
        scrape_run.status = "completed" if not skipped else "completed_with_errors"
        scrape_run.total_saved = len(item_ids)
        scrape_run.total_failed = len(skipped)
        db.commit()

    return schemas.MultiDomainScraperIngestResult(
        scrape_run_id=scrape_run.id if scrape_run else None,
        raw_item_ids=raw_item_ids,
        item_ids=item_ids,
        skipped=skipped,
    )
