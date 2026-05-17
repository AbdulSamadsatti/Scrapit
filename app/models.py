from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    ForeignKey,
    Integer,
    Numeric,
    String,
    Text,
    UniqueConstraint,
    func,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import relationship

from app.database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    firebase_uid = Column(String(255), nullable=False, unique=True, index=True)
    name = Column(String(150))
    email = Column(String(255), unique=True, index=True)
    created_at = Column(DateTime, nullable=False, server_default=func.now())
    updated_at = Column(DateTime, nullable=False, server_default=func.now())

    favorites = relationship("Favorite", back_populates="user", cascade="all, delete-orphan")
    chatbot_messages = relationship(
        "ChatbotMessage",
        back_populates="user",
        cascade="all, delete-orphan",
    )
    search_history = relationship(
        "SearchHistory",
        back_populates="user",
        cascade="all, delete-orphan",
    )


class Domain(Base):
    __tablename__ = "domains"

    id = Column(Integer, primary_key=True, index=True)
    code = Column(String(50), nullable=False, unique=True, index=True)
    name = Column(String(100), nullable=False, unique=True)
    description = Column(Text)
    created_at = Column(DateTime, nullable=False, server_default=func.now())

    websites = relationship("Website", back_populates="domain")
    scrape_runs = relationship("ScrapeRun", back_populates="domain")
    raw_scraped_items = relationship("RawScrapedItem", back_populates="domain")
    items = relationship("Item", back_populates="domain")


class Website(Base):
    __tablename__ = "websites"

    id = Column(Integer, primary_key=True, index=True)
    domain_id = Column(Integer, ForeignKey("domains.id", ondelete="RESTRICT"), index=True)
    name = Column(String(150), nullable=False)
    base_url = Column(Text, nullable=False)
    logo_url = Column(Text)
    is_active = Column(Boolean, nullable=False, server_default="true")
    created_at = Column(DateTime, nullable=False, server_default=func.now())
    updated_at = Column(DateTime, nullable=False, server_default=func.now())

    domain = relationship("Domain", back_populates="websites")
    products = relationship("Product", back_populates="website")
    raw_scraped_products = relationship("RawScrapedProduct", back_populates="website")
    scrape_runs = relationship("ScrapeRun", back_populates="website")
    raw_scraped_items = relationship("RawScrapedItem", back_populates="website")
    items = relationship("Item", back_populates="website")


class RawScrapedProduct(Base):
    __tablename__ = "raw_scraped_products"

    id = Column(Integer, primary_key=True, index=True)
    website_id = Column(Integer, ForeignKey("websites.id", ondelete="RESTRICT"), nullable=False)
    raw_title = Column(Text)
    raw_price = Column(Text)
    raw_data = Column(JSONB)
    scraped_at = Column(DateTime, nullable=False, server_default=func.now(), index=True)

    website = relationship("Website", back_populates="raw_scraped_products")


class Product(Base):
    __tablename__ = "products"
    __table_args__ = (
        UniqueConstraint("website_id", "product_url", name="unique_product_per_website"),
    )

    id = Column(Integer, primary_key=True, index=True)
    website_id = Column(Integer, ForeignKey("websites.id", ondelete="RESTRICT"), nullable=False)
    title = Column(String(500), nullable=False, index=True)
    normalized_name = Column(String(500), index=True)
    description = Column(Text)
    price = Column(Numeric(12, 2))
    currency = Column(String(10))
    image_url = Column(Text)
    product_url = Column(Text, nullable=False)
    category = Column(String(150), index=True)
    availability = Column(String(100))
    metadata_json = Column("metadata", JSONB)
    created_at = Column(DateTime, nullable=False, server_default=func.now(), index=True)
    updated_at = Column(DateTime, nullable=False, server_default=func.now())
    last_seen_at = Column(DateTime, nullable=False, server_default=func.now())

    website = relationship("Website", back_populates="products")
    favorites = relationship("Favorite", back_populates="product", cascade="all, delete-orphan")


class Favorite(Base):
    __tablename__ = "favorites"
    __table_args__ = (
        UniqueConstraint("user_id", "product_id", name="unique_user_favorite"),
    )

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    product_id = Column(
        Integer,
        ForeignKey("products.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    created_at = Column(DateTime, nullable=False, server_default=func.now())

    user = relationship("User", back_populates="favorites")
    product = relationship("Product", back_populates="favorites")


class ChatbotMessage(Base):
    __tablename__ = "chatbot_messages"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    message = Column(Text, nullable=False)
    response = Column(Text)
    created_at = Column(DateTime, nullable=False, server_default=func.now(), index=True)

    user = relationship("User", back_populates="chatbot_messages")


class SearchHistory(Base):
    __tablename__ = "search_history"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    query = Column(String(500), nullable=False)
    searched_at = Column(DateTime, nullable=False, server_default=func.now(), index=True)

    user = relationship("User", back_populates="search_history")


class ScrapeRun(Base):
    __tablename__ = "scrape_runs"

    id = Column(Integer, primary_key=True, index=True)
    domain_id = Column(Integer, ForeignKey("domains.id", ondelete="RESTRICT"), nullable=False, index=True)
    website_id = Column(Integer, ForeignKey("websites.id", ondelete="RESTRICT"), nullable=False, index=True)
    scraper_name = Column(String(150), nullable=False)
    status = Column(String(50), nullable=False, server_default="running")
    started_at = Column(DateTime, nullable=False, server_default=func.now(), index=True)
    finished_at = Column(DateTime)
    total_found = Column(Integer, nullable=False, server_default="0")
    total_saved = Column(Integer, nullable=False, server_default="0")
    total_failed = Column(Integer, nullable=False, server_default="0")
    stats = Column(JSONB, nullable=False, server_default="{}")
    error_message = Column(Text)

    domain = relationship("Domain", back_populates="scrape_runs")
    website = relationship("Website", back_populates="scrape_runs")
    raw_scraped_items = relationship("RawScrapedItem", back_populates="scrape_run")


class RawScrapedItem(Base):
    __tablename__ = "raw_scraped_items"

    id = Column(Integer, primary_key=True, index=True)
    scrape_run_id = Column(Integer, ForeignKey("scrape_runs.id", ondelete="SET NULL"))
    domain_id = Column(Integer, ForeignKey("domains.id", ondelete="RESTRICT"), nullable=False, index=True)
    website_id = Column(Integer, ForeignKey("websites.id", ondelete="RESTRICT"), nullable=False, index=True)
    source_url = Column(Text)
    source_item_id = Column(String(255))
    raw_title = Column(Text)
    raw_price = Column(Text)
    raw_location = Column(Text)
    raw_data = Column(JSONB, nullable=False, server_default="{}")
    raw_fingerprint = Column(String(64))
    processing_status = Column(String(50), nullable=False, server_default="pending", index=True)
    processed_at = Column(DateTime)
    error_message = Column(Text)
    scraped_at = Column(DateTime, nullable=False, server_default=func.now(), index=True)

    scrape_run = relationship("ScrapeRun", back_populates="raw_scraped_items")
    domain = relationship("Domain", back_populates="raw_scraped_items")
    website = relationship("Website", back_populates="raw_scraped_items")
    item = relationship("Item", back_populates="raw_scraped_item", uselist=False)


class Item(Base):
    __tablename__ = "items"
    __table_args__ = (
        UniqueConstraint("website_id", "item_url", name="unique_item_per_website_url"),
    )

    id = Column(Integer, primary_key=True, index=True)
    domain_id = Column(Integer, ForeignKey("domains.id", ondelete="RESTRICT"), nullable=False, index=True)
    website_id = Column(Integer, ForeignKey("websites.id", ondelete="RESTRICT"), nullable=False, index=True)
    raw_scraped_item_id = Column(Integer, ForeignKey("raw_scraped_items.id", ondelete="SET NULL"))
    title = Column(String(700), nullable=False)
    normalized_title = Column(String(700), index=True)
    summary = Column(Text)
    item_url = Column(Text, nullable=False)
    image_url = Column(Text)
    location_text = Column(String(300))
    city = Column(String(150), index=True)
    country = Column(String(150), index=True)
    latitude = Column(Numeric(10, 7))
    longitude = Column(Numeric(10, 7))
    price_amount = Column(Numeric(14, 2), index=True)
    currency = Column(String(10))
    status = Column(String(100))
    metadata_json = Column("metadata", JSONB, nullable=False, server_default="{}")
    first_seen_at = Column(DateTime, nullable=False, server_default=func.now())
    last_seen_at = Column(DateTime, nullable=False, server_default=func.now(), index=True)
    created_at = Column(DateTime, nullable=False, server_default=func.now(), index=True)
    updated_at = Column(DateTime, nullable=False, server_default=func.now())

    domain = relationship("Domain", back_populates="items")
    website = relationship("Website", back_populates="items")
    raw_scraped_item = relationship("RawScrapedItem", back_populates="item")
    ecommerce = relationship("EcommerceItem", back_populates="item", uselist=False, cascade="all, delete-orphan")
    real_estate = relationship("RealEstateItem", back_populates="item", uselist=False, cascade="all, delete-orphan")
    job = relationship("JobItem", back_populates="item", uselist=False, cascade="all, delete-orphan")
    travel = relationship("TravelItem", back_populates="item", uselist=False, cascade="all, delete-orphan")
    automobile = relationship("AutomobileItem", back_populates="item", uselist=False, cascade="all, delete-orphan")


class EcommerceItem(Base):
    __tablename__ = "ecommerce_items"

    item_id = Column(Integer, ForeignKey("items.id", ondelete="CASCADE"), primary_key=True)
    brand = Column(String(150), index=True)
    category = Column(String(150), index=True)
    subcategory = Column(String(150))
    sku = Column(String(255))
    item_condition = Column("condition", String(100))
    availability = Column(String(100))
    rating = Column(Numeric(3, 2))
    review_count = Column(Integer)
    seller_name = Column(String(255))
    shipping_info = Column(Text)
    specs = Column(JSONB, nullable=False, server_default="{}")

    item = relationship("Item", back_populates="ecommerce")


class RealEstateItem(Base):
    __tablename__ = "real_estate_items"

    item_id = Column(Integer, ForeignKey("items.id", ondelete="CASCADE"), primary_key=True)
    listing_type = Column(String(50), index=True)
    property_type = Column(String(100), index=True)
    bedrooms = Column(Integer, index=True)
    bathrooms = Column(Numeric(4, 1))
    area_value = Column(Numeric(12, 2), index=True)
    area_unit = Column(String(50))
    address = Column(Text)
    agency_name = Column(String(255))
    agent_name = Column(String(255))
    contact_phone = Column(String(100))
    furnished = Column(Boolean)
    amenities = Column(JSONB, nullable=False, server_default="[]")

    item = relationship("Item", back_populates="real_estate")


class JobItem(Base):
    __tablename__ = "job_items"

    item_id = Column(Integer, ForeignKey("items.id", ondelete="CASCADE"), primary_key=True)
    company_name = Column(String(255), index=True)
    employment_type = Column(String(100), index=True)
    workplace_type = Column(String(100), index=True)
    experience_level = Column(String(100))
    salary_min = Column(Numeric(14, 2))
    salary_max = Column(Numeric(14, 2))
    salary_period = Column(String(50))
    skills = Column(JSONB, nullable=False, server_default="[]")
    apply_url = Column(Text)
    posted_at = Column(DateTime, index=True)
    expires_at = Column(DateTime)

    item = relationship("Item", back_populates="job")


class TravelItem(Base):
    __tablename__ = "travel_items"

    item_id = Column(Integer, ForeignKey("items.id", ondelete="CASCADE"), primary_key=True)
    offer_type = Column(String(100), index=True)
    origin = Column(String(150), index=True)
    destination = Column(String(150), index=True)
    departure_at = Column(DateTime, index=True)
    return_at = Column(DateTime)
    airline = Column(String(150))
    hotel_name = Column(String(255))
    nights = Column(Integer)
    travelers = Column(Integer)
    booking_url = Column(Text)
    baggage_info = Column(Text)
    details = Column(JSONB, nullable=False, server_default="{}")

    item = relationship("Item", back_populates="travel")


class AutomobileItem(Base):
    __tablename__ = "automobile_items"

    item_id = Column(Integer, ForeignKey("items.id", ondelete="CASCADE"), primary_key=True)
    vehicle_type = Column(String(100), index=True)
    make = Column(String(150), index=True)
    model = Column(String(150), index=True)
    variant = Column(String(150))
    year = Column(Integer, index=True)
    mileage_km = Column(Integer, index=True)
    fuel_type = Column(String(100))
    transmission = Column(String(100))
    engine_capacity = Column(String(100))
    color = Column(String(100))
    registration_city = Column(String(150))
    vehicle_condition = Column(String(100))
    seller_type = Column(String(100))
    specs = Column(JSONB, nullable=False, server_default="{}")

    item = relationship("Item", back_populates="automobile")


class ItemPriceHistory(Base):
    __tablename__ = "item_price_history"

    id = Column(Integer, primary_key=True, index=True)
    item_id = Column(Integer, ForeignKey("items.id", ondelete="CASCADE"), nullable=False, index=True)
    price_amount = Column(Numeric(14, 2))
    currency = Column(String(10))
    observed_at = Column(DateTime, nullable=False, server_default=func.now(), index=True)


class SavedItem(Base):
    __tablename__ = "saved_items"
    __table_args__ = (
        UniqueConstraint("user_id", "item_id", name="unique_user_saved_item"),
    )

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    item_id = Column(Integer, ForeignKey("items.id", ondelete="CASCADE"), nullable=False, index=True)
    created_at = Column(DateTime, nullable=False, server_default=func.now())
