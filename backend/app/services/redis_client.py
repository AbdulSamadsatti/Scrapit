import json
import logging
import os
from contextlib import nullcontext
from typing import Any

import redis
from redis.exceptions import RedisError

logger = logging.getLogger(__name__)

REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379/0")
CACHE_TTL = int(os.getenv("REDIS_CACHE_TTL_SECONDS", "900"))

redis_client = redis.Redis.from_url(
    REDIS_URL,
    decode_responses=True,
    socket_timeout=2.0,
    socket_connect_timeout=2.0
)


def get_cache(key: str) -> Any | None:
    try:
        value = redis_client.get(key)
        if not value:
            return None
        return json.loads(value)
    except (RedisError, json.JSONDecodeError) as exc:
        logger.warning("[Redis] get_cache failed for %s: %s", key, exc)
        return None


def set_cache(key: str, value: Any, ttl: int = CACHE_TTL) -> None:
    try:
        redis_client.setex(key, ttl, json.dumps(value, default=str))
    except (RedisError, TypeError, ValueError) as exc:
        logger.warning("[Redis] set_cache failed for %s: %s", key, exc)


def delete_cache(key: str) -> None:
    try:
        redis_client.delete(key)
    except RedisError as exc:
        logger.warning("[Redis] delete_cache failed for %s: %s", key, exc)


def make_key(*parts: str) -> str:
    safe = [
        str(part).strip().lower().replace(" ", "_").replace(":", "_")
        for part in parts
    ]
    return ":".join(safe)


def redis_lock(key: str, timeout: int = 240, blocking_timeout: int = 5):
    try:
        # Ping to check if Redis is up before trying to acquire lock
        redis_client.ping()
        return redis_client.lock(key, timeout=timeout, blocking_timeout=blocking_timeout)
    except RedisError as exc:
        logger.warning("[Redis] lock failed for %s: %s", key, exc)
        return nullcontext()
