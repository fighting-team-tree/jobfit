"""Tests for bounded in-memory state and cache safety."""

from __future__ import annotations

import asyncio
import sys
from pathlib import Path

import numpy as np

SERVER_DIR = Path(__file__).resolve().parents[1] / "server"
sys.path.insert(0, str(SERVER_DIR))

from app.api.v1.endpoints.interview import (  # noqa: E402
    MAX_AUDIO_QUEUE_CHUNKS,
    _enqueue_audio_chunk,
    _enqueue_audio_stop,
)
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


def test_interview_audio_queue_drops_oldest_chunks_and_keeps_stop_sentinel():
    queue: asyncio.Queue[bytes | None] = asyncio.Queue(maxsize=MAX_AUDIO_QUEUE_CHUNKS)

    for index in range(MAX_AUDIO_QUEUE_CHUNKS + 5):
        assert _enqueue_audio_chunk(queue, f"chunk-{index}".encode())

    assert queue.qsize() == MAX_AUDIO_QUEUE_CHUNKS
    assert queue.get_nowait() == b"chunk-5"

    for index in range(5):
        _enqueue_audio_chunk(queue, f"tail-{index}".encode())

    assert queue.full()
    _enqueue_audio_stop(queue)
    assert queue.full()

    drained: list[bytes | None] = []
    while not queue.empty():
        drained.append(queue.get_nowait())

    assert drained[-1] is None
