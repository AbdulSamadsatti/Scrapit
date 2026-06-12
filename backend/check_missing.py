import os
import sys
from dotenv import load_dotenv

load_dotenv()
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from app.database import SessionLocal
from app import models

db = SessionLocal()

# Check JobListing
jobs = db.query(models.JobListing).filter(
    models.JobListing.source == 'careerokay',
    (models.JobListing.logo == '') | (models.JobListing.logo == None) | 
    (models.JobListing.description == '') | (models.JobListing.description == None)
).all()
print(f"Missing CareerOkay jobs: {len(jobs)}")

# Check PropertyListing
props = db.query(models.PropertyListing).filter(
    models.PropertyListing.source == 'graana',
    (models.PropertyListing.image_url == '') | (models.PropertyListing.image_url == None)
).all()
print(f"Missing Graana props: {len(props)}")

# Check Product
daraz_website = db.query(models.Website).filter(models.Website.name == 'Daraz').first()
if daraz_website:
    prods = db.query(models.Product).filter(
        models.Product.website_id == daraz_website.id,
        (models.Product.image_url == '') | (models.Product.image_url == None)
    ).all()
    print(f"Missing Daraz products: {len(prods)}")
else:
    print("Daraz website not found")

db.close()
