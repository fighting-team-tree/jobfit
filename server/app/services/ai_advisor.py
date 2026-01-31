import httpx
from typing import List, Dict, Any
from app.core.config import settings

class AIAdvisorService:
    def __init__(self):
        self.api_key = settings.OPENAI_API_KEY
        self.base_url = "https://api.openai.com/v1/chat/completions"

    async def analyze_gap_and_roadmap(self, resume_data: Dict[str, Any], job_description: str) -> Dict[str, Any]:
        """
        Compares resume with JD and generates a study roadmap.
        """
        prompt = f"""
        You are an expert career coach and technical recruiter.
        
        [Candidate Resume Data]
        {resume_data}
        
        [Job Description]
        {job_description}
        
        Task:
        1. Identify missing skills or experiences in the candidate's profile relative to the Job Description.
        2. Categorize these gaps into 'Critical', 'Important', and 'Nice to have'.
        3. Create a 4-week detailed learning roadmap to bridge these gaps.
        4. For each week, provide specific topics to study and 2-3 recommended course names or resource types (e.g., 'Coursera: Deep Learning Specialization').
        
        Format the output as JSON with the following structure:
        {{
            "missing_skills": [{{ "skill": "str", "priority": "str", "reason": "str" }}],
            "match_score": int (0-100),
            "roadmap": [
                {{
                    "week": 1,
                    "title": "str",
                    "focus": "str",
                    "topics": ["str"],
                    "resources": ["str"]
                }}
            ]
        }}
        """

        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        }

        payload = {
            "model": "gpt-4-turbo-preview",
            "messages": [{"role": "user", "content": prompt}],
            "response_format": { "type": "json_object" }
        }

        async with httpx.AsyncClient() as client:
            response = await client.post(self.base_url, headers=headers, json=payload, timeout=60.0)
            response.raise_for_status()
            result = response.json()
            
            import json
            return json.loads(result['choices'][0]['message']['content'])

ai_advisor = AIAdvisorService()
