import os
import sys
from dotenv import load_dotenv

load_dotenv()
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.database import SessionLocal
from app import models

def run():
    db = SessionLocal()

    # 1. CareerOkay
    jobs = db.query(models.JobListing).filter(
        models.JobListing.source == 'careerokay',
        (models.JobListing.logo == '') | (models.JobListing.logo == None) | 
        (models.JobListing.description == '') | (models.JobListing.description == None)
    ).all()
    print(f"Deleting {len(jobs)} CareerOkay jobs with missing info to force refetch...")
    for j in jobs:
        db.delete(j)

    # 2. Graana
    props = db.query(models.PropertyListing).filter(
        models.PropertyListing.source == 'graana',
        (models.PropertyListing.image_url == '') | (models.PropertyListing.image_url == None)
    ).all()
    print(f"Deleting {len(props)} Graana properties with missing info to force refetch...")
    for p in props:
        db.delete(p)

    # 3. Daraz
    daraz_website = db.query(models.Website).filter(models.Website.name == 'Daraz').first()
    if daraz_website:
        prods = db.query(models.Product).filter(
            models.Product.website_id == daraz_website.id,
            (models.Product.image_url == '') | (models.Product.image_url == None)
        ).all()
        print(f"Deleting {len(prods)} Daraz products with missing info to force refetch...")
        for p in prods:
            # Clean up related items
            db.query(models.EcommerceItem).filter(models.EcommerceItem.item_id == p.id).delete(synchronize_session=False)
            db.query(models.Item).filter(models.Item.website_id == daraz_website.id, models.Item.id == p.id).delete(synchronize_session=False)
            db.delete(p)

    db.commit()
    db.close()
    print("Database cleanup complete.")

if __name__ == "__main__":
    run()
