import httpx
import os
from typing import Optional

class NotificationService:
    def __init__(self):
        self.slack_webhook_url = os.getenv("SLACK_WEBHOOK_URL", "")
        self.discord_webhook_url = os.getenv("DISCORD_WEBHOOK_URL", "")

    async def send_slack(self, message: str):
        if not self.slack_webhook_url:
            return
        async with httpx.AsyncClient() as client:
            await client.post(self.slack_webhook_url, json={"text": message})

    async def send_discord(self, message: str):
        if not self.discord_webhook_url:
            return
        async with httpx.AsyncClient() as client:
            await client.post(self.discord_webhook_url, json={"content": message})

    async def notify_interview_reminder(self, company_name: str, job_title: str):
        message = f"📢 Interview Reminder: You have an interview with {company_name} for {job_title} in 1 hour!"
        await self.send_slack(message)
        await self.send_discord(message)

notification_service = NotificationService()
