"""
GitHub 리포지토리 분석 서비스

공개 GitHub 리포지토리를 REST API로 분석합니다 (토큰 불필요).
사용자 프로필 URL도 지원합니다.
"""

import httpx
from app.core.config import settings


class GitHubService:
    """GitHub API 클라이언트 - 공개 리포지토리 분석용"""

    BASE_URL = "https://api.github.com"

    def __init__(self):
        self.headers = {
            "Accept": "application/vnd.github.v3+json",
            "User-Agent": "JobFit-AI",
        }
        # 토큰이 있으면 Rate Limit 5000/시간, 없으면 60/시간
        if settings.GITHUB_TOKEN:
            self.headers["Authorization"] = f"Bearer {settings.GITHUB_TOKEN}"

    def _parse_github_url(self, url: str) -> dict:
        """
        GitHub URL을 파싱합니다.

        반환값:
            {"type": "user", "username": "ashrate"} 또는
            {"type": "repo", "owner": "ashrate", "repo": "myproject"}
        """
        # URL 정리
        clean_url = url.replace("https://", "").replace("http://", "")
        clean_url = clean_url.split("?")[0].rstrip("/")

        # github.com/ 제거
        if clean_url.startswith("github.com/"):
            path = clean_url.replace("github.com/", "")
        else:
            raise ValueError(f"잘못된 GitHub URL: {url}")

        # 경로 분리
        parts = [p for p in path.split("/") if p]

        if len(parts) == 0:
            raise ValueError(f"잘못된 GitHub URL: {url}")
        elif len(parts) == 1:
            # 사용자 프로필: github.com/username
            username = parts[0]
            if username in [
                "settings",
                "notifications",
                "explore",
                "topics",
                "trending",
            ]:
                raise ValueError(f"잘못된 GitHub URL: {url}")
            return {"type": "user", "username": username}
        else:
            # 리포지토리: github.com/owner/repo
            owner = parts[0]
            repo = parts[1].replace(".git", "")
            return {"type": "repo", "owner": owner, "repo": repo}

    async def get_user_repos(self, username: str, limit: int = 10) -> list[dict]:
        """사용자의 공개 리포지토리 목록을 조회합니다."""
        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.get(
                f"{self.BASE_URL}/users/{username}/repos",
                headers=self.headers,
                params={"sort": "updated", "per_page": limit, "type": "owner"},
            )
            resp.raise_for_status()
            repos = resp.json()

            return [
                {
                    "name": r.get("name"),
                    "full_name": r.get("full_name"),
                    "description": r.get("description"),
                    "language": r.get("language"),
                    "stars": r.get("stargazers_count", 0),
                    "updated_at": r.get("updated_at"),
                }
                for r in repos
                if not r.get("fork")  # 포크 제외
            ]

    async def get_repo_info(self, owner: str, repo: str) -> dict:
        """리포지토리 메타데이터를 조회합니다."""
        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.get(f"{self.BASE_URL}/repos/{owner}/{repo}", headers=self.headers)
            resp.raise_for_status()
            data = resp.json()

            return {
                "name": data.get("name"),
                "description": data.get("description"),
                "stars": data.get("stargazers_count", 0),
                "forks": data.get("forks_count", 0),
                "topics": data.get("topics", []),
                "default_branch": data.get("default_branch", "main"),
            }

    async def get_languages(self, owner: str, repo: str) -> dict:
        """언어별 사용 비율을 조회합니다 (%)."""
        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.get(
                f"{self.BASE_URL}/repos/{owner}/{repo}/languages", headers=self.headers
            )
            resp.raise_for_status()

            lang_bytes = resp.json()
            total = sum(lang_bytes.values()) if lang_bytes else 1

            return {
                lang: round((bytes_count / total) * 100, 1)
                for lang, bytes_count in lang_bytes.items()
            }

    async def get_readme(self, owner: str, repo: str) -> str | None:
        """README 내용을 조회합니다."""
        async with httpx.AsyncClient(timeout=30.0) as client:
            try:
                resp = await client.get(
                    f"{self.BASE_URL}/repos/{owner}/{repo}/readme",
                    headers={
                        **self.headers,
                        "Accept": "application/vnd.github.raw+json",
                    },
                )
                resp.raise_for_status()
                return resp.text[:2000]
            except httpx.HTTPStatusError:
                return None

    async def get_dependency_files(self, owner: str, repo: str, branch: str) -> dict:
        """의존성 파일을 파싱합니다."""
        dependencies = {"python": [], "javascript": [], "other": []}

        async with httpx.AsyncClient(timeout=30.0) as client:
            # requirements.txt
            try:
                resp = await client.get(
                    f"https://raw.githubusercontent.com/{owner}/{repo}/{branch}/requirements.txt",
                    headers=self.headers,
                )
                if resp.status_code == 200:
                    lines = resp.text.strip().split("\n")
                    dependencies["python"] = [
                        line.split("==")[0].split(">=")[0].split("[")[0].strip()
                        for line in lines
                        if line.strip() and not line.startswith("#")
                    ][:20]
            except Exception:
                pass

            # package.json
            try:
                resp = await client.get(
                    f"https://raw.githubusercontent.com/{owner}/{repo}/{branch}/package.json",
                    headers=self.headers,
                )
                if resp.status_code == 200:
                    import json

                    pkg = json.loads(resp.text)
                    deps = list(pkg.get("dependencies", {}).keys())
                    dev_deps = list(pkg.get("devDependencies", {}).keys())
                    dependencies["javascript"] = (deps + dev_deps)[:20]
            except Exception:
                pass

        return dependencies

    async def analyze_single_repo(
        self,
        owner: str,
        repo: str,
        include_readme: bool = True,
        include_languages: bool = True,
        include_dependencies: bool = True,
    ) -> dict:
        """단일 리포지토리를 분석합니다."""
        repo_info = await self.get_repo_info(owner, repo)
        default_branch = repo_info.get("default_branch", "main")
        languages = await self.get_languages(owner, repo) if include_languages else {}
        readme = await self.get_readme(owner, repo) if include_readme else None
        dependencies = (
            await self.get_dependency_files(owner, repo, default_branch)
            if include_dependencies
            else {"python": [], "javascript": [], "other": []}
        )

        return {
            "repo": f"{owner}/{repo}",
            "description": repo_info.get("description"),
            "stars": repo_info.get("stars", 0),
            "languages": languages,
            "dependencies": dependencies,
            "readme_excerpt": readme[:500] if readme else None,
            "topics": repo_info.get("topics", []),
        }

    async def analyze_user_profile(
        self,
        username: str,
        include_languages: bool = True,
        include_dependencies: bool = True,
    ) -> dict:
        """
        사용자 프로필의 모든 공개 리포지토리를 분석합니다.
        """
        repos = await self.get_user_repos(username, limit=10)

        if not repos:
            return {
                "username": username,
                "total_repos": 0,
                "languages": {},
                "dependencies": {"python": [], "javascript": []},
                "topics": [],
                "repos_analyzed": [],
            }

        # 모든 리포 언어 합산
        all_languages = {}
        all_dependencies = {"python": set(), "javascript": set(), "other": set()}
        all_topics = set()
        repos_analyzed = []

        for repo_info in repos[:5]:  # 상위 5개만 상세 분석
            try:
                owner = username
                repo_name = repo_info["name"]

                repo_full = await self.get_repo_info(owner, repo_name)
                default_branch = repo_full.get("default_branch", "main")
                languages = await self.get_languages(owner, repo_name) if include_languages else {}
                deps = (
                    await self.get_dependency_files(owner, repo_name, default_branch)
                    if include_dependencies
                    else {"python": [], "javascript": [], "other": []}
                )

                # 언어 합산
                for lang, pct in languages.items():
                    all_languages[lang] = all_languages.get(lang, 0) + pct

                # 의존성 합산
                all_dependencies["python"].update(deps.get("python", []))
                all_dependencies["javascript"].update(deps.get("javascript", []))
                all_dependencies["other"].update(deps.get("other", []))

                # 토픽 합산
                all_topics.update(repo_full.get("topics", []))

                repos_analyzed.append(
                    {
                        "name": repo_name,
                        "language": repo_info.get("language"),
                        "stars": repo_info.get("stars", 0),
                    }
                )

            except Exception:
                continue

        # 언어 비율 정규화
        total_lang = sum(all_languages.values()) or 1
        normalized_languages = (
            {
                lang: round((val / total_lang) * 100, 1)
                for lang, val in sorted(all_languages.items(), key=lambda x: -x[1])
            }
            if include_languages
            else {}
        )

        return {
            "username": username,
            "total_repos": len(repos),
            "languages": normalized_languages,
            "dependencies": {
                "python": list(all_dependencies["python"]),
                "javascript": list(all_dependencies["javascript"]),
                "other": list(all_dependencies["other"]),
            },
            "topics": list(all_topics),
            "repos_analyzed": repos_analyzed,
        }

    async def analyze_repository(
        self, url: str, include_readme: bool = True, include_languages: bool = True
    ) -> dict:
        """
        GitHub URL을 분석합니다 (리포지토리 또는 사용자 프로필).
        """
        parsed = self._parse_github_url(url)

        if parsed["type"] == "repo":
            return await self.analyze_single_repo(
                parsed["owner"],
                parsed["repo"],
                include_readme=include_readme,
                include_languages=include_languages,
            )
        return await self.analyze_user_profile(
            parsed["username"], include_languages=include_languages
        )

    async def get_repo_tree(self, owner: str, repo: str, branch: str = "main") -> list[dict]:
        """Git Tree API로 리포지토리의 전체 파일 목록을 가져옵니다."""
        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.get(
                f"{self.BASE_URL}/repos/{owner}/{repo}/git/trees/{branch}?recursive=1",
                headers=self.headers,
            )
            if resp.status_code != 200:
                return []
            tree = resp.json().get("tree", [])
            return [item for item in tree if item.get("type") == "blob"]

    async def get_file_content(self, owner: str, repo: str, file_path: str) -> str | None:
        """단일 파일의 raw 텍스트 내용을 가져옵니다."""
        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.get(
                f"{self.BASE_URL}/repos/{owner}/{repo}/contents/{file_path}",
                headers={**self.headers, "Accept": "application/vnd.github.raw+json"},
            )
            if resp.status_code == 200:
                return resp.text
            return None

    async def get_key_source_files(
        self,
        owner: str,
        repo: str,
        branch: str = "main",
        max_files: int = 5,
        max_total_chars: int = 8000,
    ) -> list[dict]:
        """휴리스틱 스코어링을 통해 핵심 소스 파일들의 내용을 가져옵니다."""
        tree = await self.get_repo_tree(owner, repo, branch)
        if not tree:
            return []

        # 스코어링 로직
        scored_files = []
        for item in tree:
            path = item.get("path", "")
            size = item.get("size", 0)

            # 제외 필터
            if size > 100000 or size == 0:  # 100KB 초과 무시
                continue
            if any(
                x in path for x in ["node_modules/", "__pycache__/", ".git/", "dist/", "build/"]
            ):
                continue
            if any(
                path.endswith(ext)
                for ext in [".lock", ".min.js", ".map", ".svg", ".png", ".jpg", ".jpeg"]
            ):
                continue

            score = 0
            path_lower = path.lower()

            # 1. 진입점 (main.py, app.py, index.ts, server.ts 등)
            if any(
                path_lower.endswith(x)
                for x in ["main.py", "app.py", "index.ts", "index.js", "server.ts", "server.js"]
            ):
                score += 40
            # 2. 핵심 로직
            elif any(
                x in path_lower for x in ["services/", "controllers/", "hooks/", "utils/", "api/"]
            ):
                score += 30
            # 3. 모델/스키마
            elif any(x in path_lower for x in ["models/", "schemas/", "types/"]):
                score += 25
            # 4. 설정 파일
            elif any(x in path_lower for x in ["config", "settings"]):
                score += 20
            # 5. 소스 코드 여부 (일반)
            elif any(
                path_lower.endswith(ext)
                for ext in [".py", ".ts", ".tsx", ".js", ".jsx", ".java", ".go", ".rs"]
            ):
                score += 15

            if score > 0:
                scored_files.append({"path": path, "size": size, "score": score})

        # 스코어 순 정렬 후 상위 파일 선택
        scored_files.sort(key=lambda x: x["score"], reverse=True)
        top_files = scored_files[:max_files]

        results = []
        total_chars = 0

        for f in top_files:
            content = await self.get_file_content(owner, repo, f["path"])
            if content:
                # 글자 수 제한 체크
                if total_chars + len(content) > max_total_chars:
                    # 일부만 잘라서 추가하고 중단
                    remaining = max_total_chars - total_chars
                    if remaining > 500:
                        results.append(
                            {"path": f["path"], "content": content[:remaining] + "...(truncated)"}
                        )
                    break

                results.append({"path": f["path"], "content": content})
                total_chars += len(content)

        return results

    async def recommend_repos_for_review(
        self, jd_text: str, repos_analyzed: list[dict]
    ) -> list[dict]:
        """분석된 레포 목록에서 JD와의 기술 매칭도를 기반으로 상위 3개를 추천합니다."""
        if not repos_analyzed:
            return []

        jd_lower = jd_text.lower() if jd_text else ""
        recommendations = []

        for repo in repos_analyzed:
            score = 0
            reasons = []

            repo_lang = (repo.get("language") or "").lower()
            stars = repo.get("stars", 0)

            # 1. 언어 매칭
            if repo_lang and repo_lang in jd_lower:
                score += 40
                reasons.append(f"JD에 요구된 {repo.get('language')} 언어 사용")
            elif repo_lang:
                score += 10

            # 2. Stars
            if stars > 0:
                score += min(stars * 2, 20)
                reasons.append(f"Star {stars}개 보유")

            recommendations.append(
                {
                    "name": repo.get("name"),
                    "language": repo.get("language"),
                    "stars": stars,
                    "score": score,
                    "reason": " / ".join(reasons)
                    if reasons
                    else "포트폴리오 평가에 적합한 프로젝트",
                }
            )

        recommendations.sort(key=lambda x: x["score"], reverse=True)
        return recommendations[:3]


# 싱글톤 인스턴스
github_service = GitHubService()
