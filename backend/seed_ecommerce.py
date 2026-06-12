import os
import sys

from dotenv import load_dotenv

load_dotenv()

project_root = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if project_root not in sys.path:
    sys.path.append(project_root)

from app.database import Base, SessionLocal, engine
from app import models


DOMAINS = [
    ("ecommerce", "E-commerce", "Products, prices, categories, availability, and offers."),
]

WEBSITES = [
    ("Daraz", "https://www.daraz.pk", ""),
    ("OLX", "https://www.olx.com.pk", ""),
    ("PriceOye", "https://priceoye.pk", ""),
    ("Amazon", "https://www.amazon.com", ""),
]


def seed_ecommerce() -> None:
    Base.metadata.create_all(bind=engine)

    db = SessionLocal()
    try:
        for code, name, description in DOMAINS:
            domain = db.query(models.Domain).filter(models.Domain.code == code).first()
            if not domain:
                domain = models.Domain(code=code, name=name, description=description)
                db.add(domain)
                db.flush()

        ecommerce_domain = db.query(models.Domain).filter(models.Domain.code == "ecommerce").first()
        if not ecommerce_domain:
            raise RuntimeError("Could not create or find ecommerce domain.")

        for name, base_url, logo_url in WEBSITES:
            exists = (
                db.query(models.Website)
                .filter(models.Website.domain_id == ecommerce_domain.id)
                .filter(models.Website.name == name)
                .first()
            )
            if not exists:
                db.add(
                    models.Website(
                        domain_id=ecommerce_domain.id,
                        name=name,
                        base_url=base_url,
                        logo_url=logo_url,
                        is_active=True,
                    )
                )

        db.commit()
        print("Ecommerce seed completed.")
    finally:
        db.close()


if __name__ == "__main__":
    seed_ecommerce()