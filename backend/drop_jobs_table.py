import os
import sys
from dotenv import load_dotenv, find_dotenv
from sqlalchemy import create_engine, text

# Load env variables from root .env
load_dotenv(find_dotenv())

DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql+psycopg://postgres:postgres@localhost:5432/scrapit_db",
)

if DATABASE_URL.startswith("postgresql://"):
    DATABASE_URL = DATABASE_URL.replace("postgresql://", "postgresql+psycopg://", 1)

print(f"Connecting to database to check and drop table: {DATABASE_URL}")

try:
    engine = create_engine(DATABASE_URL)
    with engine.connect() as conn:
        # Drop the table if it exists
        print("Dropping table job_listings if it exists...")
        conn.execute(text("DROP TABLE IF EXISTS job_listings CASCADE;"))
        conn.commit()
        print("Table job_listings dropped successfully.")
except Exception as e:
    print(f"Error dropping table: {e}", file=sys.stderr)
