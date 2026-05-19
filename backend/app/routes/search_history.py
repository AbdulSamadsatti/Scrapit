from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app import models, schemas
from app.database import get_db


router = APIRouter(prefix="/search-history", tags=["search history"])


@router.post("", response_model=schemas.SearchHistoryRead, status_code=status.HTTP_201_CREATED)
def create_search_history(
    search: schemas.SearchHistoryCreate,
    db: Session = Depends(get_db),
):
    if not db.get(models.User, search.user_id):
        raise HTTPException(status_code=404, detail="User not found")

    db_search = models.SearchHistory(**search.model_dump())
    db.add(db_search)
    db.commit()
    db.refresh(db_search)
    return db_search


@router.get("/users/{user_id}", response_model=list[schemas.SearchHistoryRead])
def get_user_search_history(
    user_id: int,
    limit: int = Query(default=20, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    db: Session = Depends(get_db),
):
    if not db.get(models.User, user_id):
        raise HTTPException(status_code=404, detail="User not found")

    return (
        db.query(models.SearchHistory)
        .filter(models.SearchHistory.user_id == user_id)
        .order_by(models.SearchHistory.searched_at.desc())
        .offset(offset)
        .limit(limit)
        .all()
    )
