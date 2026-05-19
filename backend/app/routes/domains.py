from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app import models, schemas
from app.database import get_db


router = APIRouter(prefix="/domains", tags=["domains"])


@router.get("", response_model=list[schemas.DomainRead])
def list_domains(db: Session = Depends(get_db)):
    return db.query(models.Domain).order_by(models.Domain.id).all()
