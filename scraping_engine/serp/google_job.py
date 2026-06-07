import logging
from typing import List, Dict, Any, Optional
try:
    from serpapi import GoogleSearch
except ImportError:
    GoogleSearch = None

from scraping_engine.config import SERP_API_KEY

logger = logging.getLogger(__name__)

def get_google_jobs(
    query: str, 
    location: Optional[str] = None,
    gl: str = "us", 
    hl: str = "en"
) -> List[Dict[str, Any]]:
    """
    Fetch job postings from Google Jobs using SerpApi.

    Args:
        query (str): The search query (e.g., 'python developer').
        location (Optional[str]): The location for the job search (e.g., 'Islamabad, Pakistan').
        gl (str): Geolocation/Country code (default: 'us').
        hl (str): Language code (default: 'en').

    Returns:
        List[Dict[str, Any]]: A list of parsed job dictionaries.
    """
    if not SERP_API_KEY:
        logger.error("SERP_API_KEY is not configured or missing in .env.")
        return []
    if GoogleSearch is None:
        logger.error("SerpApi package is not installed. Install google-search-results to use Google Jobs.")
        return []

    params = {
        "engine": "google_jobs",
        "q": query,
        "gl": gl,
        "hl": hl,
        "api_key": SERP_API_KEY
    }

    if location:
        params["location"] = location

    try:
        search = GoogleSearch(params)
        results = search.get_dict()
    except Exception as e:
        logger.error(f"Error fetching jobs from SerpApi: {e}")
        return []

    # Check if the API returned a specific error message
    if "error" in results:
        logger.error(f"SerpApi returned an error: {results['error']}")
        return []

    jobs = []
    job_results = results.get("jobs_results", [])
    
    for job in job_results:
        jobs.append({
            "title": job.get("title", "N/A"),
            "company": job.get("company_name", "N/A"),
            "location": job.get("location", "N/A"),
            "description": job.get("description", ""),
            "thumbnail": job.get("thumbnail"),
            "apply_options": job.get("apply_options", []),
            "job_id": job.get("job_id"),
            "source": "google_jobs"
        })

    return jobs
