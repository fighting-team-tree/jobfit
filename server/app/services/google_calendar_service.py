"""
Google Calendar Service

Handles interaction with the Google Calendar API.
Provides utility functions to sync roadmap learning plans to the user's Google Calendar.
"""

import asyncio
import logging
from datetime import UTC, datetime, timedelta

import httpx
from app.core.config import settings
from app.models.db_models import User
from sqlalchemy.ext.asyncio import AsyncSession

logger = logging.getLogger(__name__)


class GoogleCalendarService:
    """Service to interact with Google Calendar API using httpx."""

    TOKEN_URL = "https://oauth2.googleapis.com/token"  # noqa: S105
    CALENDAR_API_BASE = "https://www.googleapis.com/calendar/v3"

    async def get_valid_access_token(self, user: User, db: AsyncSession) -> str:
        """
        Get a valid Google access token.
        If the current token is expired or close to expiring (within 5 minutes),
        refresh it using the refresh token.
        """
        if not user.google_access_token:
            raise ValueError(
                "Google OAuth access token is missing. Please log in with Google first."
            )

        # Check expiration
        is_expired = False
        if user.google_token_expires_at:
            # Check if expired or expiring within 5 minutes
            now_utc = datetime.now(UTC)
            # Remove tzinfo if model datetime doesn't have it to avoid offset-naive/aware error
            expires_at = user.google_token_expires_at
            if expires_at.tzinfo is None:
                expires_at = expires_at.replace(tzinfo=UTC)

            if expires_at - now_utc < timedelta(minutes=5):
                is_expired = True
        else:
            is_expired = True

        if is_expired:
            logger.info(
                f"Google access token for user {user.id} is expired or expiring soon. Refreshing..."
            )
            return await self.refresh_google_token(user, db)

        return user.google_access_token

    async def refresh_google_token(self, user: User, db: AsyncSession) -> str:
        """
        Refresh the Google access token using the refresh token.
        """
        if not user.google_refresh_token:
            raise ValueError(
                "Google refresh token is missing. Please log in with Google again to grant offline access."
            )

        if not settings.GOOGLE_CLIENT_ID or not settings.GOOGLE_CLIENT_SECRET:
            raise ValueError("Google OAuth credentials are not configured in settings.")

        async with httpx.AsyncClient() as client:
            response = await client.post(
                self.TOKEN_URL,
                data={
                    "client_id": settings.GOOGLE_CLIENT_ID,
                    "client_secret": settings.GOOGLE_CLIENT_SECRET,
                    "refresh_token": user.google_refresh_token,
                    "grant_type": "refresh_token",
                },
                headers={"Content-Type": "application/x-www-form-urlencoded"},
            )

            if response.status_code != 200:
                error_detail = response.json().get("error_description", response.text)
                logger.error(f"Failed to refresh Google token: {error_detail}")
                raise ValueError(f"Failed to refresh Google token: {error_detail}")

            token_data = response.json()
            new_access_token = token_data.get("access_token")
            expires_in = token_data.get("expires_in", 3600)

            if not new_access_token:
                raise ValueError("Google OAuth response did not contain an access token.")

            # Update database
            user.google_access_token = new_access_token
            # Optional: Google might return a new refresh token, update it if present
            new_refresh_token = token_data.get("refresh_token")
            if new_refresh_token:
                user.google_refresh_token = new_refresh_token

            # Calculate and set new expiration time
            # Using timezone-naive datetime to store in SQLite/PostgreSQL consistently
            user.google_token_expires_at = datetime.now(UTC).replace(tzinfo=None) + timedelta(
                seconds=int(expires_in)
            )

            await db.commit()
            logger.info(f"Successfully refreshed Google access token for user {user.id}")
            return new_access_token

    async def clear_existing_jobfit_events(
        self, access_token: str, start_date: datetime.date
    ) -> None:
        """
        Find and delete existing Google Calendar events with prefix '[JobFit]'.
        Search window is start_date to start_date + 90 days.
        """
        time_min = f"{start_date.isoformat()}T00:00:00Z"
        time_max = f"{(start_date + timedelta(days=90)).isoformat()}T23:59:59Z"

        headers = {
            "Authorization": f"Bearer {access_token}",
            "Accept": "application/json",
        }

        async with httpx.AsyncClient(timeout=30.0) as client:
            # 1. List events
            list_url = f"{self.CALENDAR_API_BASE}/calendars/primary/events"
            params = {
                "timeMin": time_min,
                "timeMax": time_max,
                "q": "[JobFit]",
                "maxResults": 250,
            }

            response = await client.get(list_url, headers=headers, params=params)
            if response.status_code != 200:
                logger.error(f"Failed to list events for clearing: {response.text}")
                return

            events = response.json().get("items", [])
            if not events:
                logger.info("No existing [JobFit] events found to clear.")
                return

            # Filter events precisely to avoid false matches with 'q'
            jobfit_events = [e for e in events if e.get("summary", "").startswith("[JobFit]")]

            if not jobfit_events:
                logger.info("No events matching '[JobFit]' prefix found.")
                return

            logger.info(f"Clearing {len(jobfit_events)} existing [JobFit] events...")

            # 2. Delete events in parallel
            async def delete_event(event_id: str):
                delete_url = f"{self.CALENDAR_API_BASE}/calendars/primary/events/{event_id}"
                resp = await client.delete(delete_url, headers=headers)
                if resp.status_code not in (200, 204):
                    logger.error(f"Failed to delete event {event_id}: {resp.text}")

            await asyncio.gather(*(delete_event(e["id"]) for e in jobfit_events if "id" in e))
            logger.info("Successfully cleared existing [JobFit] events.")

    async def sync_roadmap_to_calendar(
        self,
        user: User,
        roadmap_title: str,
        weekly_plans: list[dict],
        start_date_str: str,
        db: AsyncSession,
    ) -> bool:
        """
        Sync roadmap's weekly plans to user's Google Calendar as all-day events.
        Start date must be in YYYY-MM-DD format.
        """
        access_token = await self.get_valid_access_token(user, db)

        # Parse starting date
        try:
            start_date = datetime.strptime(start_date_str, "%Y-%m-%d").date()
        except ValueError as e:
            logger.error(f"Invalid start date format: {start_date_str}")
            raise ValueError("Start date must be in YYYY-MM-DD format.") from e

        # Clear existing JobFit events to ensure idempotency
        try:
            await self.clear_existing_jobfit_events(access_token, start_date)
        except Exception as e:
            logger.warning(f"Error during clearing existing events (continuing sync): {e}")

        headers = {
            "Authorization": f"Bearer {access_token}",
            "Content-Type": "application/json",
        }

        async with httpx.AsyncClient(timeout=30.0) as client:
            events_to_create = []

            # Process weekly plans
            for week in weekly_plans:
                week_num = week.get("week_number", 1)
                week_theme = week.get("theme", "학습")
                week_goals = week.get("goals", [])
                todos = week.get("todos", [])

                # 1. Create a weekly overview event (Starts on Monday of that week)
                week_start_date = start_date + timedelta(weeks=week_num - 1)
                week_end_date = week_start_date + timedelta(days=7)

                goals_desc = "\n".join(f"- {goal}" for goal in week_goals)
                weekly_overview_body = {
                    "summary": f"[JobFit] Week {week_num}: {week_theme} 시작 🚀",
                    "description": f"이번 주 학습 목표:\n{goals_desc}\n\n꾸준히 학습하여 목표를 달성하세요!",
                    "start": {"date": week_start_date.isoformat()},
                    "end": {"date": week_end_date.isoformat()},
                    "reminders": {"useDefault": True},
                }
                events_to_create.append(weekly_overview_body)

                # 2. Distribute todos across the week (Monday to Friday, or daily)
                # Map todos up to 5 days of the week (0 to 4 offset days)
                for index, todo in enumerate(todos):
                    day_offset = index % 5  # Distribute across Mon-Fri
                    todo_date = week_start_date + timedelta(days=day_offset)
                    todo_end_date = todo_date + timedelta(days=1)

                    todo_task = todo.get("task", "")
                    todo_skill = todo.get("skill", "")
                    todo_priority = todo.get("priority", "medium").upper()
                    todo_hours = todo.get("estimated_hours", 2)
                    resources = todo.get("resources", [])

                    res_desc = "\n".join(f"- {res}" for res in resources if res)
                    todo_desc = (
                        f"🎯 역량분야: {todo_skill}\n"
                        f"⏱️ 예상 소요 시간: {todo_hours}시간\n"
                        f"🚨 우선순위: {todo_priority}\n\n"
                        f"📚 추천 학습 자료:\n{res_desc if res_desc else '추천 자료 없음'}"
                    )

                    todo_event_body = {
                        "summary": f"[JobFit] {todo_task}",
                        "description": todo_desc,
                        "start": {"date": todo_date.isoformat()},
                        "end": {"date": todo_end_date.isoformat()},
                        "reminders": {
                            "useDefault": False,
                            "overrides": [{"method": "popup", "minutes": 60}],
                        },
                    }
                    events_to_create.append(todo_event_body)

            # Parallel async creation of calendar events
            async def create_event(event_body: dict):
                create_url = f"{self.CALENDAR_API_BASE}/calendars/primary/events"
                resp = await client.post(create_url, headers=headers, json=event_body)
                if resp.status_code not in (200, 201):
                    logger.error(
                        f"Failed to create calendar event '{event_body['summary']}': {resp.text}"
                    )
                    # Don't fail the whole sync for a single event creation error
                return resp.status_code

            logger.info(f"Creating {len(events_to_create)} learning calendar events...")
            results = await asyncio.gather(
                *(create_event(e) for e in events_to_create), return_exceptions=True
            )

            success_count = sum(1 for r in results if isinstance(r, int) and r in (200, 201))
            logger.info(
                f"Successfully synced {success_count}/{len(events_to_create)} events to Google Calendar."
            )

            return not (success_count == 0 and events_to_create)


# Singleton instance
google_calendar_service = GoogleCalendarService()
