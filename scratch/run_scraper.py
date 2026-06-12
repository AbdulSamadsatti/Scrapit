import json, sys
sys.path.append('c:/Users/HP/OneDrive/Desktop/scrapers')
from scraping_engine.core.runner import run_all_scrapers
result = run_all_scrapers('software engineer', max_jobs_per_site=5)
print(json.dumps(result, indent=2))
