"""
Travel scraper configuration.

These are broad selectors because travel pages can change often. Each scraper
also has fallback extraction logic so one selector change does not break
everything.
"""

TRAVEL_SITES = {
    "kipgo": {
        "label": "Kipgo",
        "base_url": "https://www.gokipgo.com",
        "search_urls": [
            "https://www.gokipgo.com/search?q={query}",
            "https://www.gokipgo.com/tours",
            "https://www.gokipgo.com/stays",
        ],
    },
    "sastaticket": {
        "label": "Sastaticket",
        "base_url": "https://www.sastaticket.pk",
        "search_urls": [
            "https://www.sastaticket.pk/hotels/search?query={query}",
            "https://www.sastaticket.pk/flights",
            "https://www.sastaticket.pk/umrah",
        ],
    },
    "bookme": {
        "label": "Bookme",
        "base_url": "https://bookme.pk",
        "search_urls": [
            "https://bookme.pk/hotels",
            "https://bookme.pk/flights",
            "https://bookme.pk/bus",
        ],
    },
}
