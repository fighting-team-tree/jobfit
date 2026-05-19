"""LLM service safety regression tests."""

import sys
from pathlib import Path
from typing import Any

import pytest

SERVER_DIR = Path(__file__).resolve().parents[1] / "server"
sys.path.insert(0, str(SERVER_DIR))

from app.services.llm_service import llm_service  # noqa: E402


@pytest.mark.asyncio
async def test_parse_resume_masks_pii_before_llm(monkeypatch):
    captured: dict[str, Any] = {}

    async def fake_call_llm_json(prompt: str, *args, **kwargs):
        captured["prompt"] = prompt
        return {
            "skills": ["Python"],
            "experience": [],
            "education": [],
            "projects": [],
            "certifications": [],
        }

    monkeypatch.setattr(llm_service, "call_llm_json", fake_call_llm_json)

    result = await llm_service.parse_resume(
        "홍길동 이메일 hong@example.com 전화 010-1234-5678 Python"
    )

    assert result["skills"] == ["Python"]
    assert "hong@example.com" not in captured["prompt"]
    assert "010-1234-5678" not in captured["prompt"]
    assert "[EMAIL_REDACTED]" in captured["prompt"]
    assert "[PHONE_REDACTED]" in captured["prompt"]


@pytest.mark.asyncio
async def test_generate_interview_question_uses_public_call_method_and_masks_pii(monkeypatch):
    captured: dict[str, Any] = {}

    async def fake_call_llm(*args, **kwargs):
        captured["messages"] = kwargs["messages"]
        return "프로젝트에서 맡은 역할을 설명해주세요."

    monkeypatch.setattr(llm_service, "call_llm", fake_call_llm)

    question = await llm_service.generate_interview_question(
        profile={"contact": {"email": "hong@example.com", "phone": "010-1234-5678"}},
        jd_text="지원자는 hong@example.com으로 연락",
        conversation_history=[{"role": "candidate", "content": "제 전화는 010-1234-5678입니다."}],
    )

    prompt = captured["messages"][1]["content"]
    assert question == "프로젝트에서 맡은 역할을 설명해주세요."
    assert "hong@example.com" not in prompt
    assert "010-1234-5678" not in prompt
