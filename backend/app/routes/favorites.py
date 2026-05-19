from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app import models, schemas
from app.database import get_db


router = APIRouter(prefix="/favorites", tags=["favorites"])


@router.post("", response_model=schemas.FavoriteRead, status_code=status.HTTP_201_CREATED)
def add_favorite(favorite: schemas.FavoriteCreate, db: Session = Depends(get_db)):
    if not db.get(models.User, favorite.user_id):
        raise HTTPException(status_code=404, detail="User not found")
    if not db.get(models.Product, favorite.product_id):
        raise HTTPException(status_code=404, detail="Product not found")

    db_favorite = models.Favorite(**favorite.model_dump())
    db.add(db_favorite)
    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(status_code=409, detail="Product already in favorites") from exc
    db.refresh(db_favorite)
    return db_favorite


@router.get("/users/{user_id}", response_model=list[schemas.FavoriteRead])
def list_user_favorites(user_id: int, db: Session = Depends(get_db)):
    if not db.get(models.User, user_id):
        raise HTTPException(status_code=404, detail="User not found")

    return (
        db.query(models.Favorite)
        .filter(models.Favorite.user_id == user_id)
        .order_by(models.Favorite.created_at.desc())
        .all()
    )


@router.delete("/users/{user_id}/products/{product_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_favorite(user_id: int, product_id: int, db: Session = Depends(get_db)):
    favorite = (
        db.query(models.Favorite)
        .filter(
            models.Favorite.user_id == user_id,
            models.Favorite.product_id == product_id,
        )
        .first()
    )
    if not favorite:
        raise HTTPException(status_code=404, detail="Favorite not found")

    db.delete(favorite)
    db.commit()
