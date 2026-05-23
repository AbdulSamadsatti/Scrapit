import os
from dotenv import load_dotenv, find_dotenv
from sqlalchemy import create_engine, inspect

load_dotenv(find_dotenv())

DATABASE_URL = os.getenv("DATABASE_URL")
if DATABASE_URL.startswith("postgresql://"):
    DATABASE_URL = DATABASE_URL.replace("postgresql://", "postgresql+psycopg://", 1)

print(f"Connecting to: {DATABASE_URL}")
try:
    engine = create_engine(DATABASE_URL)
    inspector = inspect(engine)
    tables = inspector.get_table_names()
    print("Tables in database:")
    for t in tables:
        print(f"  - {t}")
        if t == "job_listings":
            columns = inspector.get_columns(t)
            print("    Columns:")
            for col in columns:
                print(f"      * {col['name']}: {col['type']} (nullable={col['nullable']})")
except Exception as e:
    print(f"Error: {e}")
