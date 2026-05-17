from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app import models, schemas
from app.database import get_db


router = APIRouter(prefix="/chatbot", tags=["chatbot"])


@router.post("/messages", response_model=schemas.ChatbotMessageRead, status_code=status.HTTP_201_CREATED)
def create_chatbot_message(
    message: schemas.ChatbotMessageCreate,
    db: Session = Depends(get_db),
):
    if not db.get(models.User, message.user_id):
        raise HTTPException(status_code=404, detail="User not found")

    db_message = models.ChatbotMessage(**message.model_dump())
    db.add(db_message)
    db.commit()
    db.refresh(db_message)
    return db_message


@router.get("/users/{user_id}/history", response_model=list[schemas.ChatbotMessageRead])
def get_chatbot_history(
    user_id: int,
    limit: int = Query(default=20, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    db: Session = Depends(get_db),
):
    if not db.get(models.User, user_id):
        raise HTTPException(status_code=404, detail="User not found")

    return (
        db.query(models.ChatbotMessage)
        .filter(models.ChatbotMessage.user_id == user_id)
        .order_by(models.ChatbotMessage.created_at.desc())
        .offset(offset)
        .limit(limit)
        .all()
    )
