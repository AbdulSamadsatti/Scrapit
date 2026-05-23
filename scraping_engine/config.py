import os
from dotenv import load_dotenv, find_dotenv

load_dotenv(find_dotenv())

SERP_API_KEY = os.getenv("SERP_API_KEY")