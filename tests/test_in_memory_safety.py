"""Tests for bounded in-memory state and cache safety."""

from __future__ import annotations

import sys
from pathlib import Path

import numpy as np

SERVER_DIR = Path(__file__).resolve().parents[1] / "server"
sys.path.insert(0, str(SERVER_DIR))

from app.services.embedding_service import EmbeddingService  # noqa: E402
from app.services.in_memory_store import ExpiringStore  # noqa: E402


def test_expiring_store_removes_expired_entries_and_evicts_oldest():
    now = 1000.0

    def clock() -> float:
        return now

    store: ExpiringStore[str, str] = ExpiringStore(
        ttl_seconds=10,
        max_size=2,
        clock=clock,
    )

    store["a"] = "old"
    store["b"] = "kept"
    store["c"] = "new"

    assert "a" not in store
    assert list(store.keys()) == ["b", "c"]

    now = 1011.0
    assert "b" not in store
    assert len(store) == 0


def test_embedding_cache_uses_hashed_keys_and_ttl_lru(monkeypatch):
    service = EmbeddingService()
    service.clear_cache()
    service._cache_ttl_seconds = 10
    service._cache_max_size = 1

    now = 1000.0
    monkeypatch.setattr("app.services.embedding_service.monotonic", lambda: now)

    raw_text = "홍길동 email@example.com 010-1234-5678"
    vector = np.array([1.0, 2.0])
    service._set_cached(service._cache_key(raw_text), vector)

    assert raw_text not in service._cache
    assert service._get_cached(service._cache_key(raw_text)) is vector

    service._set_cached(service._cache_key("another text"), np.array([3.0]))
    assert service._get_cached(service._cache_key(raw_text)) is None

    service._set_cached(service._cache_key(raw_text), vector)
    now = 1011.0
    assert service._get_cached(service._cache_key(raw_text)) is None
