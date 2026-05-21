"""
Discord Notification Service

Handles sending formatted notifications to a user's Discord channel via Webhook.
"""

import logging

import httpx

logger = logging.getLogger(__name__)


class DiscordService:
    """Service to send notifications to Discord Webhook."""

    async def send_weekly_roadmap_notification(
        self,
        webhook_url: str,
        roadmap_title: str,
        weekly_plan: dict,
    ) -> bool:
        """
        Send a beautifully formatted weekly roadmap update to a user's Discord Webhook.
        """
        if not webhook_url:
            logger.warning("Discord webhook URL is empty, skipping notification.")
            return False

        week_num = weekly_plan.get("week_number", 1)
        theme = weekly_plan.get("theme", "학습 계획")
        goals = weekly_plan.get("goals", [])
        todos = weekly_plan.get("todos", [])

        # Create embed fields
        fields = []

        # 1. Goals Field
        if goals:
            goals_text = "\n".join(f"🎯 {goal}" for goal in goals)
            fields.append({"name": "🔑 이번 주 학습 목표", "value": goals_text, "inline": False})

        # 2. Todos Field
        if todos:
            todo_lines = []
            for todo in todos[:7]:  # Limit to 7 items to avoid long messages
                task = todo.get("task", "")
                priority = todo.get("priority", "medium").upper()
                hours = todo.get("estimated_hours", 2)
                skill = todo.get("skill", "")

                # Emoji based on priority
                priority_emoji = (
                    "🔴" if priority == "HIGH" else ("🟡" if priority == "MEDIUM" else "🟢")
                )
                todo_lines.append(
                    f"{priority_emoji} **{task}**\n   └ 분야: `{skill}` | 예상 시간: `{hours}시간`"
                )

            todos_text = "\n".join(todo_lines)
            fields.append({"name": "📝 세부 학습 과제", "value": todos_text, "inline": False})

        # 3. Resources Field (Collect from all todos)
        resource_links = []
        for todo in todos:
            resources = todo.get("resources", [])
            for res in resources:
                if res and res not in resource_links:
                    resource_links.append(res)

        if resource_links:
            # Format as clean markdown links if possible
            links_formatted = []
            for i, link in enumerate(resource_links[:5], 1):  # Limit to 5 resources
                if link.startswith("http"):
                    # Check if it has a nice title (e.g., youtube or docs)
                    title = "공식 문서"
                    if "youtube.com" in link or "youtu.be" in link:
                        title = "YouTube 가이드"
                    elif "github.com" in link:
                        title = "GitHub 실습"

                    links_formatted.append(f"[{i}. {title} 바로가기]({link})")
                else:
                    links_formatted.append(f"{i}. {link}")

            fields.append(
                {"name": "📚 추천 학습 자료", "value": "\n".join(links_formatted), "inline": False}
            )

        # Base embed structure
        embed = {
            "title": f"📅 [JobFit] Week {week_num} 학습 알림",
            "description": f"**주제: {theme}**\n\n오늘도 한 걸음 성장하는 하루를 보내세요! 💪",
            "color": 5814783,  # Discord Blurple (#5865F2)
            "fields": fields,
            "footer": {
                "text": f"JobFit AI 코더 • 로드맵: {roadmap_title}",
            },
        }

        payload = {
            "username": "JobFit AI 코치",
            "avatar_url": "https://img.icons8.com/color/344/artificial-intelligence.png",
            "embeds": [embed],
        }

        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.post(webhook_url, json=payload)
                if response.status_code not in (200, 204):
                    logger.error(f"Failed to send Discord webhook: {response.text}")
                    return False

                logger.info(f"Successfully sent Discord roadmap notification for Week {week_num}")
                return True
        except Exception as e:
            logger.error(f"Error sending Discord notification: {e}")
            return False


# Singleton instance
discord_service = DiscordService()
