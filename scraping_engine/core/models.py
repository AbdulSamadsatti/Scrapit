# ---------------------------------------------------------------------------
# PASTE THIS INTO app/models.py  (JobListing ke just neeche)
# ---------------------------------------------------------------------------
# property_storage.py aur property_search_services.py isi model pe rely karte hain.
# Aap ke existing models.py mein already `Base`, `Column`, `Integer`, `String`,
# `Text`, `DateTime`, `Numeric` imports hone chahiyein (JobListing waise hi use
# karta hai). Agar Numeric/DateTime import nahi to upar add kar lein:
#
#   from sqlalchemy import Column, Integer, String, Text, DateTime, Numeric, Index
#   from datetime import datetime, timezone
#
# ---------------------------------------------------------------------------

from datetime import datetime, timezone

from sqlalchemy import Column, Integer, String, Text, DateTime, Numeric, Index

# `Base` aap ke project ka declarative base hai (app.database se aata hai jaisa
# baqi models use karte hain). Agar yahan alag se import chahiye:
#   from app.database import Base


class PropertyListing(Base):
    __tablename__ = "property_listings"

    id = Column(Integer, primary_key=True, index=True)

    query = Column(String(300), index=True)          # jis search se mila
    source = Column(String(50), index=True)           # zameen / olx / graana
    source_label = Column(String(80))

    title = Column(String(500))
    price = Column(String(200))                       # raw price text e.g. "PKR 2.5 Crore"
    price_amount = Column(Numeric(18, 2), nullable=True, index=True)  # numeric PKR
    currency = Column(String(10), default="PKR")

    location = Column(String(300), index=True)
    beds = Column(String(50))
    baths = Column(String(50))
    area = Column(String(100))                        # e.g. "10 Marla", "1 Kanal"
    purpose = Column(String(20), index=True)          # sale / rent
    property_type = Column(String(50), index=True)    # house / flat / plot / commercial

    image_url = Column(Text, default="")
    listing_url = Column(Text, index=True)
    description = Column(Text, default="")
    agent_name = Column(String(200), default="")
    posted_at = Column(String(100), default="")

    fingerprint = Column(String(64), index=True)
    scraped_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), index=True)

    __table_args__ = (
        Index("ix_property_source_url", "source", "listing_url"),
    )