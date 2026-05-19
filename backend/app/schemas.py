from datetime import datetime
from decimal import Decimal
from typing import Any

from pydantic import BaseModel, ConfigDict, Field


class UserBase(BaseModel):
    firebase_uid: str
    name: str | None = None
    email: str | None = None


class UserCreate(UserBase):
    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "firebase_uid": "firebase_user_123",
                "name": "Hoorain",
                "email": "hoorain@example.com",
            }
        }
    )


class UserRead(UserBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    created_at: datetime
    updated_at: datetime


class DomainCreate(BaseModel):
    code: str
    name: str
    description: str | None = None


class DomainRead(DomainCreate):
    model_config = ConfigDict(from_attributes=True)

    id: int
    created_at: datetime


class WebsiteBase(BaseModel):
    domain_id: int | None = None
    name: str
    base_url: str
    logo_url: str | None = None


class WebsiteCreate(WebsiteBase):
    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "domain_id": 1,
                "name": "Amazon",
                "base_url": "https://amazon.com",
                "logo_url": "https://example.com/amazon-logo.png",
            }
        }
    )


class WebsiteRead(WebsiteBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    is_active: bool = True
    created_at: datetime
    updated_at: datetime


class ProductBase(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    website_id: int
    title: str
    normalized_name: str | None = None
    description: str | None = None
    price: Decimal | None = None
    currency: str | None = None
    image_url: str | None = None
    product_url: str
    category: str | None = None
    availability: str | None = None
    metadata_json: dict[str, Any] | None = Field(default=None, alias="metadata")


class ProductCreate(ProductBase):
    model_config = ConfigDict(
        populate_by_name=True,
        json_schema_extra={
            "example": {
                "website_id": 1,
                "title": "iPhone 15",
                "normalized_name": "iphone 15",
                "description": "Apple iPhone 15",
                "price": "799.00",
                "currency": "USD",
                "image_url": "https://example.com/iphone.jpg",
                "product_url": "https://example.com/iphone-15",
                "category": "phones",
                "availability": "in_stock",
                "metadata": {
                    "storage": "128GB",
                    "color": "Black",
                },
            }
        },
    )


class ProductUpdate(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    title: str | None = None
    normalized_name: str | None = None
    description: str | None = None
    price: Decimal | None = None
    currency: str | None = None
    image_url: str | None = None
    product_url: str | None = None
    category: str | None = None
    availability: str | None = None
    metadata_json: dict[str, Any] | None = Field(default=None, alias="metadata")


class ProductRead(ProductBase):
    model_config = ConfigDict(from_attributes=True, populate_by_name=True)

    id: int
    created_at: datetime
    updated_at: datetime
    last_seen_at: datetime


class FavoriteCreate(BaseModel):
    user_id: int
    product_id: int


class FavoriteRead(FavoriteCreate):
    model_config = ConfigDict(from_attributes=True)

    id: int
    created_at: datetime


class ChatbotMessageCreate(BaseModel):
    user_id: int
    message: str
    response: str | None = None


class ChatbotMessageRead(ChatbotMessageCreate):
    model_config = ConfigDict(from_attributes=True)

    id: int
    created_at: datetime


class SearchHistoryCreate(BaseModel):
    user_id: int
    query: str


class SearchHistoryRead(SearchHistoryCreate):
    model_config = ConfigDict(from_attributes=True)

    id: int
    searched_at: datetime


class RawScrapedProductBase(BaseModel):
    website_id: int
    raw_title: str | None = None
    raw_price: str | None = None
    raw_data: dict[str, Any] | None = None


class RawScrapedProductCreate(RawScrapedProductBase):
    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "website_id": 1,
                "raw_title": "Apple iPhone 15 128GB - Black",
                "raw_price": "$799.00",
                "raw_data": {
                    "title": "Apple iPhone 15 128GB - Black",
                    "price": "$799.00",
                    "product_url": "https://example.com/iphone-15-black",
                    "image_url": "https://example.com/iphone.jpg",
                    "category": "phones",
                    "availability": "in_stock",
                    "specs": {
                        "storage": "128GB",
                        "color": "Black",
                    },
                },
            }
        }
    )


class RawScrapedProductRead(RawScrapedProductBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    scraped_at: datetime


class ScraperIngestRequest(BaseModel):
    normalize: bool = True
    products: list[RawScrapedProductCreate]


class ScraperIngestResult(BaseModel):
    raw_product_ids: list[int]
    product_ids: list[int]
    skipped: list[str]


class RawScrapedItemCreate(BaseModel):
    domain_id: int
    website_id: int
    source_url: str | None = None
    source_item_id: str | None = None
    raw_title: str | None = None
    raw_price: str | None = None
    raw_location: str | None = None
    raw_data: dict[str, Any] = Field(default_factory=dict)


class RawScrapedItemRead(RawScrapedItemCreate):
    model_config = ConfigDict(from_attributes=True)

    id: int
    scrape_run_id: int | None = None
    processing_status: str
    processed_at: datetime | None = None
    error_message: str | None = None
    scraped_at: datetime


class ItemRead(BaseModel):
    model_config = ConfigDict(from_attributes=True, populate_by_name=True)

    id: int
    domain_id: int
    website_id: int
    title: str
    normalized_title: str | None = None
    summary: str | None = None
    item_url: str
    image_url: str | None = None
    location_text: str | None = None
    city: str | None = None
    country: str | None = None
    price_amount: Decimal | None = None
    currency: str | None = None
    status: str | None = None
    metadata_json: dict[str, Any] = Field(default_factory=dict, alias="metadata")
    created_at: datetime
    updated_at: datetime
    last_seen_at: datetime


class MultiDomainScrapedItem(RawScrapedItemCreate):
    detail_data: dict[str, Any] = Field(default_factory=dict)


class MultiDomainScraperIngestRequest(BaseModel):
    scraper_name: str = "manual_scraper"
    normalize: bool = True
    items: list[MultiDomainScrapedItem]

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "scraper_name": "daraz_ecommerce_scraper",
                "normalize": True,
                "items": [
                    {
                        "domain_id": 1,
                        "website_id": 1,
                        "source_url": "https://example.com/iphone-15",
                        "source_item_id": "iphone-15",
                        "raw_title": "Apple iPhone 15 128GB - Black",
                        "raw_price": "Rs. 250000",
                        "raw_location": "Karachi",
                        "raw_data": {
                            "title": "Apple iPhone 15 128GB - Black",
                            "price": "Rs. 250000",
                            "url": "https://example.com/iphone-15",
                            "image_url": "https://example.com/iphone.jpg",
                            "city": "Karachi",
                            "country": "Pakistan",
                            "availability": "in_stock",
                            "brand": "Apple",
                            "category": "phones",
                            "specs": {
                                "storage": "128GB",
                                "color": "Black",
                            },
                        },
                        "detail_data": {
                            "brand": "Apple",
                            "category": "phones",
                            "availability": "in_stock",
                            "specs": {
                                "storage": "128GB",
                                "color": "Black",
                            },
                        },
                    }
                ],
            }
        }
    )


class MultiDomainScraperIngestResult(BaseModel):
    scrape_run_id: int | None
    raw_item_ids: list[int]
    item_ids: list[int]
    skipped: list[str]
