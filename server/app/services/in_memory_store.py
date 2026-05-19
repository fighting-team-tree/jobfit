"""Small bounded TTL store for development-only in-process state."""

from __future__ import annotations

from collections import OrderedDict
from collections.abc import Callable, Iterator, MutableMapping
from dataclasses import dataclass
from time import monotonic


@dataclass
class _Entry[V]:
    value: V
    expires_at: float


class ExpiringStore[K, V](MutableMapping[K, V]):
    """Dictionary-like store with lazy TTL cleanup and max-size eviction."""

    def __init__(
        self,
        *,
        ttl_seconds: int,
        max_size: int = 1000,
        clock: Callable[[], float] = monotonic,
    ) -> None:
        self.ttl_seconds = ttl_seconds
        self.max_size = max_size
        self._clock = clock
        self._items: OrderedDict[K, _Entry[V]] = OrderedDict()

    def __getitem__(self, key: K) -> V:
        self._purge_expired()
        entry = self._items[key]
        self._items.move_to_end(key)
        return entry.value

    def __setitem__(self, key: K, value: V) -> None:
        self._purge_expired()
        self._items[key] = _Entry(value=value, expires_at=self._clock() + self.ttl_seconds)
        self._items.move_to_end(key)
        while len(self._items) > self.max_size:
            self._items.popitem(last=False)

    def __delitem__(self, key: K) -> None:
        del self._items[key]

    def __iter__(self) -> Iterator[K]:
        self._purge_expired()
        return iter(self._items)

    def __len__(self) -> int:
        self._purge_expired()
        return len(self._items)

    def __contains__(self, key: object) -> bool:
        self._purge_expired()
        return key in self._items

    def _purge_expired(self) -> None:
        now = self._clock()
        expired_keys = [key for key, entry in self._items.items() if entry.expires_at <= now]
        for key in expired_keys:
            self._items.pop(key, None)
