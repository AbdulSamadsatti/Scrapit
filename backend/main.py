from fastapi import FastAPI
from pydantic import BaseModel, Field
from typing import List, Optional
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class ChatRequest(BaseModel):
    user_id: Optional[str] = "user123"
    message: str


class ChatResponse(BaseModel):
    reply: str
    suggestions: List[str] = Field(default_factory=list)


@app.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    print(f"Received message: {request.message}")
    user_message = request.message.lower()

    if "hello" in user_message or "hi" in user_message:
        return {
            "reply": "Hello! I am ScrapBot. How can I help you today?",
            "suggestions": ["Show trending items", "Help with cart", "About ScrapIt"],
        }
    elif "trending" in user_message:
        return {
            "reply": "Our current trending items include Laptops, Honda Civic, and Property in Islamabad.",
            "suggestions": ["View Laptops", "View Cars"],
        }
    elif "cart" in user_message:
        return {
            "reply": "You can view your items in the Cart section and proceed to checkout.",
            "suggestions": ["Go to Cart", "Check Total"],
        }
    else:
        return {
            "reply": f"I received your message: '{request.message}'. I'm still learning, but I can help you find products!",
            "suggestions": ["Search Products", "Contact Support"],
        }


@app.get("/")
async def root():
    return {"message": "ScrapBot API is running"}


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)
