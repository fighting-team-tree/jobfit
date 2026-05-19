"""Embedding Service."""

import hashlib
from collections import OrderedDict
from time import monotonic

import numpy as np
from app.core.config import settings
from openai import AsyncOpenAI


class EmbeddingService:
    """Service for generating text embeddings using OpenAI-compatible API."""

    def __init__(self):
        provider = settings.LLM_PROVIDER

        if provider == "gemini":
            self.client = AsyncOpenAI(
                api_key=settings.GOOGLE_API_KEY,
                base_url="https://generativelanguage.googleapis.com/v1beta/openai/",
            )
            self.model = settings.EMBEDDING_MODEL or "gemini-embedding-001"
        else:  # openai
            self.client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)
            self.model = settings.EMBEDDING_MODEL or "text-embedding-3-small"

        # In-memory cache stores hashed keys only, with bounded TTL/LRU eviction.
        self._cache_ttl_seconds = 60 * 60
        self._cache_max_size = 512
        self._cache: OrderedDict[str, tuple[float, np.ndarray]] = OrderedDict()

    async def get_embeddings(self, texts: list[str], input_type: str = "query") -> np.ndarray:
        """
        Get embeddings for a list of texts.

        Args:
            texts: List of texts to embed
            input_type: "query" or "passage" (kept for API compatibility, not used by OpenAI SDK)

        Returns:
            numpy array of shape (len(texts), embedding_dim)
        """
        if not texts:
            return np.array([])

        # Check cache first
        cached_results = []
        uncached_texts = []
        uncached_indices = []

        for i, text in enumerate(texts):
            cache_key = self._cache_key(text)
            cached = self._get_cached(cache_key)
            if cached is not None:
                cached_results.append((i, cached))
            else:
                uncached_texts.append(text)
                uncached_indices.append(i)

        # Fetch uncached embeddings
        if uncached_texts:
            new_embeddings = await self._fetch_embeddings(uncached_texts, input_type)
            for idx, text, emb in zip(
                uncached_indices, uncached_texts, new_embeddings, strict=False
            ):
                self._set_cached(self._cache_key(text), emb)
                cached_results.append((idx, emb))

        # Sort by original index and return
        cached_results.sort(key=lambda x: x[0])
        return np.array([emb for _, emb in cached_results])

    async def _fetch_embeddings(self, texts: list[str], input_type: str) -> list[np.ndarray]:
        """Fetch embeddings using OpenAI SDK."""
        response = await self.client.embeddings.create(
            model=self.model,
            input=texts,
        )

        # Sort by index to maintain order (Gemini may return index=None)
        # enumerate 기반 폴백: index=None이면 원래 순서(i) 사용
        data = sorted(
            enumerate(response.data),
            key=lambda pair: pair[1].index if pair[1].index is not None else pair[0],
        )
        data = [item for _, item in data]
        return [np.array(d.embedding) for d in data]

    def cosine_similarity(self, a: np.ndarray, b: np.ndarray) -> np.ndarray:
        """
        Compute cosine similarity matrix between two sets of vectors.

        Args:
            a: numpy array of shape (n, dim)
            b: numpy array of shape (m, dim)

        Returns:
            numpy array of shape (n, m) with similarity scores
        """
        if len(a) == 0 or len(b) == 0:
            return np.array([])

        # Normalize vectors
        a_norm = a / np.linalg.norm(a, axis=1, keepdims=True)
        b_norm = b / np.linalg.norm(b, axis=1, keepdims=True)

        # Compute dot product
        return np.dot(a_norm, b_norm.T)

    def clear_cache(self):
        """Clear the embedding cache."""
        self._cache.clear()

    def _cache_key(self, text: str) -> str:
        """Return a non-reversible cache key so raw text/PII is not retained."""
        normalized = text.lower().strip()
        return hashlib.sha256(normalized.encode("utf-8")).hexdigest()

    def _get_cached(self, key: str) -> np.ndarray | None:
        cached = self._cache.get(key)
        if cached is None:
            return None

        expires_at, value = cached
        if expires_at <= monotonic():
            self._cache.pop(key, None)
            return None

        self._cache.move_to_end(key)
        return value

    def _set_cached(self, key: str, value: np.ndarray) -> None:
        self._cache[key] = (monotonic() + self._cache_ttl_seconds, value)
        self._cache.move_to_end(key)
        while len(self._cache) > self._cache_max_size:
            self._cache.popitem(last=False)


# Singleton instance
embedding_service = EmbeddingService()
