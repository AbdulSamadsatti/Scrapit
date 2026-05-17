print("STARTED")

from serpapi import GoogleSearch

print("IMPORT DONE")

from scraping_engine.config import SERP_API_KEY

print("API KEY:", SERP_API_KEY)

params = {
    "engine": "google_jobs",
    "q": "python developer",
    "location": "Islamabad, Pakistan",
    "api_key": SERP_API_KEY
}

print("PARAMS READY")

search = GoogleSearch(params)

print("SEARCH OBJECT CREATED")

results = search.get_dict()

print("RESULTS RECEIVED")

print(results)