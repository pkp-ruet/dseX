import time
import random
import logging
import requests
import urllib3
from bs4 import BeautifulSoup
from config import USER_AGENTS, REQUEST_DELAY, REQUEST_TIMEOUT, MAX_RETRIES, DSE_SSL_FALLBACK

logger = logging.getLogger(__name__)


class BaseScraper:
    # Flips to False process-wide the first time TLS verification fails (with fallback
    # enabled), so we don't re-attempt — and re-fail — verification on every later URL.
    _verify_ssl = True

    def __init__(self):
        self.session = requests.Session()
        self._rotate_user_agent()

    def _rotate_user_agent(self):
        ua = random.choice(USER_AGENTS)
        self.session.headers.update({"User-Agent": ua})

    def fetch(self, url, params=None):
        """Fetch a URL with retry logic and rate limiting."""
        for attempt in range(1, MAX_RETRIES + 1):
            try:
                self._rotate_user_agent()
                resp = self.session.get(
                    url, params=params, timeout=REQUEST_TIMEOUT,
                    verify=BaseScraper._verify_ssl,
                )
                resp.raise_for_status()
                time.sleep(REQUEST_DELAY)
                return resp
            except requests.exceptions.SSLError as e:
                # Incomplete cert chain (e.g. dsebd.org on Windows). Retrying with the
                # same settings can't fix a cert problem, so either drop verification
                # for the rest of the process and retry now, or fail fast.
                if BaseScraper._verify_ssl and DSE_SSL_FALLBACK:
                    logger.warning(
                        "TLS verification failed for %s (%s) — continuing without "
                        "verification for the rest of this run. Set DSE_SSL_FALLBACK=false "
                        "to fail instead.",
                        url, e,
                    )
                    BaseScraper._verify_ssl = False
                    urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)
                    continue  # retry this same URL immediately, now unverified
                logger.error("TLS verification failed for %s and SSL fallback is off: %s", url, e)
                return None
            except requests.RequestException as e:
                wait = 2 ** attempt
                logger.warning(
                    "Attempt %d/%d failed for %s: %s  — retrying in %ds",
                    attempt, MAX_RETRIES, url, e, wait,
                )
                if attempt < MAX_RETRIES:
                    time.sleep(wait)
        logger.error("All %d attempts failed for %s", MAX_RETRIES, url)
        return None

    def fetch_soup(self, url, params=None):
        """Fetch a URL and return a BeautifulSoup object."""
        resp = self.fetch(url, params)
        if resp is None:
            return None
        return BeautifulSoup(resp.content, "lxml")
