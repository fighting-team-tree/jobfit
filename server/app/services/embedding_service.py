"""
Embedding Service

Uses OpenAI SDK for text embedding (supports Gemini and OpenAI providers).
"""

import numpy as np
from openai import AsyncOpenAI

from app.core.config import settings


class EmbeddingService:
    """Service for generating text embeddings using OpenAI-compatible API."""

    def __init__(self):
        provider = settings.LLM_PROVIDER

        if provider == "gemini":
            self.client = AsyncOpenAI(
                api_key=settings.GOOGLE_API_KEY,
                base_url="https://generativelanguage.googleapis.com/v1beta/openai/",
            )
            self.model = settings.EMBEDDING_MODEL or "text-embedding-004"
        else:  # openai
            self.client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)
            self.model = settings.EMBEDDING_MODEL or "text-embedding-3-small"

        # Simple in-memory cache for embeddings
        self._cache: dict[str, np.ndarray] = {}

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
            normalized = text.lower().strip()
            if normalized in self._cache:
                cached_results.append((i, self._cache[normalized]))
            else:
                uncached_texts.append(text)
                uncached_indices.append(i)

        # Fetch uncached embeddings
        if uncached_texts:
            new_embeddings = await self._fetch_embeddings(uncached_texts, input_type)
            for idx, text, emb in zip(
                uncached_indices, uncached_texts, new_embeddings, strict=False
            ):
                normalized = text.lower().strip()
                self._cache[normalized] = emb
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

        # Sort by index to maintain order
        data = sorted(response.data, key=lambda x: x.index)
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


# Singleton instance
embedding_service = EmbeddingService()
