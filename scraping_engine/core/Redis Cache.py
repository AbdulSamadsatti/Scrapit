"""
Lightweight Redis cache helper.

Graceful: agar redis package ya server available nahi to chup-chaap no-op kar deta
hai (scraper phir bhi chalta rahega, bas cache miss ho ga). REDIS_URL env se
connection leta hai, e.g. redis://localhost:6379/0
"""

import json
import logging
import os
from typing import Any, Optional

logger = logging.getLogger(__name__)

REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379/0")
DEFAULT_TTL_SECONDS = int(os.getenv("REDIS_CACHE_TTL", "1800"))  # 30 min

_client = None
_init_done = False


def _get_client():
    """Lazy singleton. Connection fail ho to None return karta hai (no crash)."""
    global _client, _init_done
    if _init_done:
        return _client
    _init_done = True
    try:
        import redis  # pip install redis

        client = redis.Redis.from_url(REDIS_URL, decode_responses=True, socket_connect_timeout=2)
        client.ping()
        _client = client
        logger.info("[RedisCache] Connected: %s", REDIS_URL)
    except Exception as exc:
        logger.warning("[RedisCache] Unavailable (%s) — caching disabled.", exc)
        _client = None
    return _client


def cache_key(domain: str, query: str) -> str:
    return f"{domain}:search:{query.lower().strip()}"


def get_json(key: str) -> Optional[Any]:
    client = _get_client()
    if not client:
        return None
    try:
        raw = client.get(key)
        return json.loads(raw) if raw else None
    except Exception as exc:
        logger.debug("[RedisCache] get failed: %s", exc)
        return None


def set_json(key: str, value: Any, ttl: int = DEFAULT_TTL_SECONDS) -> None:
    client = _get_client()
    if not client:
        return
    try:
        client.setex(key, ttl, json.dumps(value, default=str))
    except Exception as exc:
        logger.debug("[RedisCache] set failed: %s", exc)


def delete(key: str) -> None:
    client = _get_client()
    if not client:
        return
    try:
        client.delete(key)
    except Exception as exc:
        logger.debug("[RedisCache] delete failed: %s", exc)