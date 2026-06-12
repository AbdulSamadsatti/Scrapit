import os
import sys

project_root = os.path.abspath(os.path.join(os.path.dirname(__file__), "."))
if project_root not in sys.path:
    sys.path.insert(0, project_root)

from app.database import SessionLocal
from app.models import Product, PropertyListing, JobListing
from sqlalchemy import func

def print_stats():
    db = SessionLocal()
    try:
        print("=== Products ===")
        for source, count in db.query(Product.metadata_json['source'].astext, func.count(Product.id)).group_by(Product.metadata_json['source'].astext).all():
            print(f"Source {source}: {count}")
            
        print("\n=== Properties ===")
        for source, count in db.query(PropertyListing.source, func.count(PropertyListing.id)).group_by(PropertyListing.source).all():
            print(f"Source {source}: {count}")
            
        print("\n=== Jobs ===")
        for source, count in db.query(JobListing.source, func.count(JobListing.id)).group_by(JobListing.source).all():
            print(f"Source {source}: {count}")
    finally:
        db.close()

if __name__ == "__main__":
    print_stats()
