from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app import models, schemas
from app.database import get_db


router = APIRouter(prefix="/websites", tags=["websites"])


@router.post("", response_model=schemas.WebsiteRead, status_code=status.HTTP_201_CREATED)
def create_website(website: schemas.WebsiteCreate, db: Session = Depends(get_db)):
    if website.domain_id and not db.get(models.Domain, website.domain_id):
        raise HTTPException(status_code=404, detail="Domain not found")

    db_website = models.Website(**website.model_dump())
    db.add(db_website)
    db.commit()
    db.refresh(db_website)
    return db_website


@router.get("", response_model=list[schemas.WebsiteRead])
def list_websites(limit: int = 20, offset: int = 0, db: Session = Depends(get_db)):
    return db.query(models.Website).offset(offset).limit(limit).all()


@router.get("/{website_id}", response_model=schemas.WebsiteRead)
def get_website(website_id: int, db: Session = Depends(get_db)):
    website = db.get(models.Website, website_id)
    if not website:
        raise HTTPException(status_code=404, detail="Website not found")
    return website
