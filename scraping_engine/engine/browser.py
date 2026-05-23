import logging
from typing import Optional
from playwright.sync_api import sync_playwright, Browser, Page, Playwright

# Configure basic logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

class BrowserManager:
    """
    A robust browser manager using Playwright to handle web scraping tasks.
    Provides context isolation and basic anti-bot evasion.
    """

    def __init__(self, headless: bool = True, user_agent: str | None = None):
        self.headless = headless
        self.user_agent = user_agent
        self._playwright: Optional[Playwright] = None
        self._browser: Optional[Browser] = None

    def start(self):
        """Starts the Playwright process and launches the browser."""
        if self._playwright is None:
            self._playwright = sync_playwright().start()
            
            # Launch chromium with arguments to help avoid basic bot detection
            self._browser = self._playwright.chromium.launch(
                headless=self.headless,
                args=[
                    "--disable-blink-features=AutomationControlled",
                    "--disable-infobars"
                ]
            )
            logger.info("Browser started successfully.")
        return self

    def new_page(self) -> Page:
        """Creates a new isolated browser context and returns a new page."""
        if self._browser is None:
            raise RuntimeError("Browser is not started. Call start() first or use 'with BrowserManager() as browser:'.")
        # Create a new context to isolate cookies and cache per scraping task
        context_kwargs = {
            "viewport": {"width": 1920, "height": 1080},
        }
        if self.user_agent:
            context_kwargs["user_agent"] = self.user_agent
        context = self._browser.new_context(**context_kwargs)
        return context.new_page()

    def close(self):
        """Safely closes the browser and stops Playwright."""
        if self._browser:
            self._browser.close()
            self._browser = None
        if self._playwright:
            self._playwright.stop()
            self._playwright = None
        logger.info("Browser closed safely.")

    def __enter__(self):
        """Allows using the BrowserManager in a 'with' statement."""
        return self.start()

    def __exit__(self, exc_type, exc_val, exc_tb):
        """Ensures the browser is closed when exiting the 'with' block."""
        self.close()

# --- Example Usage ---
# if __name__ == "__main__":
#     with BrowserManager(headless=False) as browser_mgr:
#         page = browser_mgr.new_page()
#         page.goto("https://example.com")
#         print(page.title())
