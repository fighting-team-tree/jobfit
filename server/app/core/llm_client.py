"""
Multi-Provider LLM Client Factory

Centralizes OpenAI-compatible SDK client creation and default model mapping
for different providers (Gemini, Upstage, OpenAI).
"""

from typing import Any

from app.core.config import settings
from openai import AsyncOpenAI


class LLMClientFactory:
    """LLM 클라이언트 및 프로바이더별 설정을 제공하는 팩토리 클래스."""

    PROVIDERS: dict[str, dict[str, Any]] = {
        "gemini": {
            "api_key_name": "GOOGLE_API_KEY",
            "base_url": "https://generativelanguage.googleapis.com/v1beta/openai/",
            "parse_model": "gemini-3.1-flash-lite",
            "analysis_model": "gemini-3.1-flash-lite",
            "vision_model": "gemini-2.5-flash",
        },
        "upstage": {
            "api_key_name": "UPSTAGE_API_KEY",
            "base_url": "https://api.upstage.ai/v1",
            "parse_model": "solar-pro2",
            "analysis_model": "solar-pro3",
            "vision_model": "solar-doc-vlm",
        },
        "openai": {
            "api_key_name": "OPENAI_API_KEY",
            "base_url": None,
            "parse_model": "gpt-5.5-instant",
            "analysis_model": "gpt-5.5",
            "vision_model": "gpt-4o-mini",
        },
    }

    @classmethod
    def get_provider_info(cls, provider: str) -> dict[str, Any]:
        """제공자에 해당하는 설정을 반환. 없으면 기본값으로 openai 사용.

        Args:
            provider: LLM 제공자 명칭 (예: "gemini", "upstage", "openai")

        Returns:
            제공자 설정 사전 (api_key_name, base_url, parse_model, etc.)
        """
        prov = provider.lower() if provider else "openai"
        if prov not in cls.PROVIDERS:
            prov = "openai"
        return cls.PROVIDERS[prov]

    @classmethod
    def create_client(cls, provider: str) -> AsyncOpenAI:
        """제공자 설정에 따라 AsyncOpenAI 클라이언트를 생성합니다.

        Args:
            provider: LLM 제공자 명칭

        Returns:
            AsyncOpenAI 클라이언트 인스턴스
        """
        info = cls.get_provider_info(provider)
        api_key = getattr(settings, info["api_key_name"], "")

        return AsyncOpenAI(
            api_key=api_key,
            base_url=info["base_url"],
        )

    @classmethod
    def get_models(cls, provider: str) -> tuple[str, str, str]:
        """제공자 설정에 맞는 모델 튜플을 반환합니다.
        settings의 override 설정이 있으면 이를 우선 적용합니다.

        Args:
            provider: LLM 제공자 명칭

        Returns:
            (parse_model, analysis_model, vision_model) 튜플
        """
        info = cls.get_provider_info(provider)

        parse_model = settings.LLM_PARSE_MODEL or info["parse_model"]
        analysis_model = settings.LLM_ANALYSIS_MODEL or info["analysis_model"]
        vision_model = settings.LLM_VISION_MODEL or info["vision_model"]

        return parse_model, analysis_model, vision_model
