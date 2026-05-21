"""Unit tests for notification and sync services (Google Calendar & Discord Webhook)."""
# ruff: noqa: E402, I001

import sys
from datetime import UTC, datetime, timedelta
from pathlib import Path
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from fastapi.testclient import TestClient

SERVER_DIR = Path(__file__).resolve().parents[1] / "server"
sys.path.insert(0, str(SERVER_DIR))

import main
from app.services.google_calendar_service import google_calendar_service
from app.services.discord_service import discord_service
from app.models.db_models import User

app = main.app


@pytest.mark.asyncio
async def test_google_calendar_token_expiry_check():
    """Test that GoogleCalendarService correctly identifies expired/valid tokens and calls refresh if needed."""
    user = User(
        id="test-google-user",
        username="Test User",
        google_access_token="old-token",
        google_refresh_token="refresh-token",
        google_token_expires_at=datetime.now(UTC) - timedelta(minutes=1),  # Expired
    )
    db_mock = AsyncMock()

    with patch.object(
        google_calendar_service, "refresh_google_token", return_value="new-token"
    ) as mock_refresh:
        token = await google_calendar_service.get_valid_access_token(user, db_mock)
        assert token == "new-token"  # noqa: S105
        mock_refresh.assert_called_once_with(user, db_mock)


@pytest.mark.asyncio
async def test_google_calendar_token_valid_no_refresh():
    """Test that GoogleCalendarService returns existing access token if it's still valid."""
    user = User(
        id="test-google-user",
        username="Test User",
        google_access_token="valid-token",
        google_refresh_token="refresh-token",
        google_token_expires_at=datetime.now(UTC) + timedelta(hours=1),  # Valid
    )
    db_mock = AsyncMock()

    with patch.object(google_calendar_service, "refresh_google_token") as mock_refresh:
        token = await google_calendar_service.get_valid_access_token(user, db_mock)
        assert token == "valid-token"  # noqa: S105
        mock_refresh.assert_not_called()


@pytest.mark.asyncio
@patch("httpx.AsyncClient.post")
async def test_discord_service_notification_success(mock_post):
    """Test that DiscordService formats and sends notifications successfully."""
    # Mock successful HTTP post response
    mock_response = MagicMock()
    mock_response.status_code = 204
    mock_post.return_value = mock_response

    weekly_plan = {
        "week_number": 1,
        "theme": "Python Basics",
        "goals": ["Learn variables", "Learn loops"],
        "todos": [
            {
                "task": "Read book",
                "skill": "Python",
                "priority": "high",
                "estimated_hours": 2,
                "resources": ["https://python.org"],
            }
        ],
    }

    success = await discord_service.send_weekly_roadmap_notification(
        webhook_url="https://discord.com/api/webhooks/mock",
        roadmap_title="Python Career Path",
        weekly_plan=weekly_plan,
    )

    assert success is True
    mock_post.assert_called_once()
    # Verify the payload properties
    args, kwargs = mock_post.call_args
    payload = kwargs["json"]
    assert payload["username"] == "JobFit AI 코치"
    assert len(payload["embeds"]) == 1
    assert "Week 1" in payload["embeds"][0]["title"]
    assert "Python Basics" in payload["embeds"][0]["description"]


def test_profile_discord_webhook_persistence_in_demo_mode():
    """Test that a user can save and retrieve Discord Webhook URL in fallback demo mode."""
    headers = {"X-JobFit-Client-Session": "session-test-notifications"}
    webhook_url = "https://discord.com/api/webhooks/test"

    with TestClient(app) as client:
        # Save webhook
        put_response = client.put(
            "/api/v1/profile/me/discord",
            headers=headers,
            json={"discord_webhook_url": webhook_url},
        )
        assert put_response.status_code == 200
        assert put_response.json()["discord_webhook_url"] == webhook_url

        # Retrieve profile and verify webhook exists
        get_response = client.get("/api/v1/profile/me", headers=headers)
        assert get_response.status_code == 200
        assert get_response.json()["discord_webhook_url"] == webhook_url


def test_roadmap_notify_discord_unauthorized_if_no_webhook():
    """Test that /notify-discord returns 400 if Discord webhook is not set."""
    headers = {"X-JobFit-Client-Session": "session-no-webhook"}

    with TestClient(app) as client:
        # Mock a generated roadmap in memory store so we don't trigger AI generator
        from app.api.v1.endpoints.roadmap import roadmaps_store

        # Create a mock Agent Roadmap Object
        mock_roadmap = MagicMock()
        mock_roadmap.title = "Test Roadmap"
        mock_roadmap.weeks = []
        roadmaps_store["mock-roadmap-id"] = mock_roadmap

        response = client.post(
            "/api/v1/roadmap/mock-roadmap-id/notify-discord",
            headers=headers,
            json={"week_number": 1},
        )
        assert response.status_code == 400
        assert "디스코드 웹훅 URL이 설정되지 않았습니다" in response.json()["detail"]


@patch("app.services.discord_service.discord_service.send_weekly_roadmap_notification")
def test_roadmap_notify_discord_success_in_demo(mock_send_notification):
    """Test successful Discord notification delivery in demo mode with a pre-saved webhook."""
    headers = {"X-JobFit-Client-Session": "session-with-webhook"}
    webhook_url = "https://discord.com/api/webhooks/valid"
    mock_send_notification.return_value = True

    with TestClient(app) as client:
        # Pre-populate profile with a webhook
        client.put(
            "/api/v1/profile/me/discord",
            headers=headers,
            json={"discord_webhook_url": webhook_url},
        )

        # Pre-populate roadmap
        from app.api.v1.endpoints.roadmap import roadmaps_store

        mock_week = MagicMock()
        mock_week.week_number = 1
        mock_week.title = "Week 1 Focus"
        mock_week.learning_objectives = ["Objective 1"]
        mock_week.resources = ["Resource 1"]
        mock_week.focus_skills = ["Skill 1"]
        mock_week.estimated_hours = 3

        mock_roadmap = MagicMock()
        mock_roadmap.title = "Test Roadmap Title"
        mock_roadmap.weeks = [mock_week]
        roadmaps_store["mock-roadmap-id-2"] = mock_roadmap

        response = client.post(
            "/api/v1/roadmap/mock-roadmap-id-2/notify-discord",
            headers=headers,
            json={"week_number": 1},
        )
        assert response.status_code == 200
        assert response.json()["status"] == "success"
        mock_send_notification.assert_called_once()
        args, kwargs = mock_send_notification.call_args
        assert kwargs["webhook_url"] == webhook_url
        assert kwargs["roadmap_title"] == "Test Roadmap Title"
        assert kwargs["weekly_plan"]["week_number"] == 1
