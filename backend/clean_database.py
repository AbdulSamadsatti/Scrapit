import os
import sys

# Ensure backend modules can be imported
project_root = os.path.abspath(os.path.join(os.path.dirname(__file__), "."))
if project_root not in sys.path:
    sys.path.insert(0, project_root)

from app.database import SessionLocal
from app.models import Product, PropertyListing, JobListing

def clean_database():
    db = SessionLocal()
    try:
        print("Starting database cleanup...")
        
        # 1. Clean Ecommerce Products
        # Delete products missing image, price, title, or url
        # (OLX products with missing prices will have price=None or price="")
        deleted_products = db.query(Product).filter(
            (Product.image_url == None) | (Product.image_url == "") |
            (Product.price == None) | (Product.price == 0) |
            (Product.title == None) | (Product.title == "") |
            (Product.product_url == None) | (Product.product_url == "")
        ).delete(synchronize_session=False)
        print(f"[*] Deleted {deleted_products} invalid Ecommerce Products.")

        # 2. Clean Property Listings
        deleted_properties = db.query(PropertyListing).filter(
            (PropertyListing.image_url == None) | (PropertyListing.image_url == "") |
            (PropertyListing.price == None) | (PropertyListing.price == "") |
            (PropertyListing.title == None) | (PropertyListing.title == "") |
            (PropertyListing.listing_url == None) | (PropertyListing.listing_url == "")
        ).delete(synchronize_session=False)
        print(f"[*] Deleted {deleted_properties} invalid Property Listings.")

        # 3. Clean Job Listings
        # Salary is optional, so we only check title, image (logo/banner), and link
        deleted_jobs = db.query(JobListing).filter(
            (JobListing.title == None) | (JobListing.title == "") |
            (JobListing.apply_link == None) | (JobListing.apply_link == "") |
            ((JobListing.logo == "") & (JobListing.banner == "")) |
            ((JobListing.logo == None) & (JobListing.banner == None))
        ).delete(synchronize_session=False)
        print(f"[*] Deleted {deleted_jobs} invalid Job Listings.")

        db.commit()
        print("Cleanup completed successfully!")

    except Exception as e:
        db.rollback()
        print(f"Error during cleanup: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    clean_database()
