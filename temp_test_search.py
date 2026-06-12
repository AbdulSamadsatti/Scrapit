import asyncio, json
from scraping_engine.search_services import search_jobs

async def main():
    result = await search_jobs(query='software engineer', max_jobs_per_site=20, force_scrape=True)
    print(json.dumps(result, indent=2))

if __name__ == '__main__':
    asyncio.run(main())
