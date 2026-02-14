"""
Git Push Service

Handles GitHub operations for auto-pushing solutions.
Uses PyGithub for GitHub API interactions.
"""

from dataclasses import dataclass
from datetime import datetime

from github import Github, GithubException


@dataclass
class PushResult:
    """Result of a Git push operation."""

    success: bool
    commit_sha: str | None = None
    commit_url: str | None = None
    file_url: str | None = None
    error: str | None = None


class GitPushService:
    """
    Service for pushing files to GitHub repositories.

    Uses user-provided Personal Access Token for authentication.
    Token is NOT stored on server - passed per-request for security.
    """

    async def push_file(
        self,
        token: str,
        repo_full_name: str,
        file_path: str,
        content: str,
        commit_message: str,
        branch: str = "main",
    ) -> PushResult:
        """
        Push a file to a GitHub repository.

        Args:
            token: User's GitHub Personal Access Token
            repo_full_name: Repository in format "owner/repo"
            file_path: Path within the repository
            content: File content to push
            commit_message: Commit message
            branch: Target branch (default: main)

        Returns:
            PushResult with commit details or error
        """
        try:
            # Initialize GitHub client with user's token
            g = Github(token)

            # Get the repository
            repo = g.get_repo(repo_full_name)

            # Check if file exists
            try:
                existing_file = repo.get_contents(file_path, ref=branch)
                # Update existing file
                result = repo.update_file(
                    path=file_path,
                    message=commit_message,
                    content=content,
                    sha=existing_file.sha,
                    branch=branch,
                )
            except GithubException as e:
                if e.status == 404:
                    # Create new file
                    result = repo.create_file(
                        path=file_path, message=commit_message, content=content, branch=branch
                    )
                else:
                    raise

            commit = result["commit"]

            return PushResult(
                success=True,
                commit_sha=commit.sha,
                commit_url=commit.html_url,
                file_url=f"https://github.com/{repo_full_name}/blob/{branch}/{file_path}",
            )

        except GithubException as e:
            error_msg = e.data.get("message", str(e)) if hasattr(e, "data") else str(e)
            return PushResult(success=False, error=f"GitHub API error: {error_msg}")
        except Exception as e:
            return PushResult(success=False, error=f"Push failed: {str(e)}")

    async def push_solution(
        self,
        token: str,
        repo_full_name: str,
        week: int,
        problem_id: str,
        problem_title: str,
        solution_code: str,
        language: str = "python",
        branch: str = "main",
    ) -> PushResult:
        """
        Push a problem solution to the user's study repository.

        Creates a structured file path: solutions/week{N}/{problem_id}.{ext}

        Args:
            token: User's GitHub PAT
            repo_full_name: Repository in format "owner/repo"
            week: Week number
            problem_id: Problem identifier
            problem_title: Problem title for file header
            solution_code: The solution code
            language: Programming language
            branch: Target branch

        Returns:
            PushResult with commit details
        """
        # File extension mapping
        ext_map = {
            "python": "py",
            "javascript": "js",
            "typescript": "ts",
            "java": "java",
            "cpp": "cpp",
            "c": "c",
            "go": "go",
            "rust": "rs",
        }
        ext = ext_map.get(language.lower(), "txt")

        # Create file path
        file_path = f"solutions/week{week}/{problem_id}.{ext}"

        # Create file content with header
        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        header_comment = {
            "python": f'"""\n{problem_title}\nSolved: {timestamp}\n"""\n\n',
            "javascript": f"/**\n * {problem_title}\n * Solved: {timestamp}\n */\n\n",
            "typescript": f"/**\n * {problem_title}\n * Solved: {timestamp}\n */\n\n",
        }

        content = header_comment.get(
            language.lower(), f"# {problem_title}\n# Solved: {timestamp}\n\n"
        )
        content += solution_code

        commit_message = f"✅ Solve: {problem_title} (Week {week})"

        return await self.push_file(
            token=token,
            repo_full_name=repo_full_name,
            file_path=file_path,
            content=content,
            commit_message=commit_message,
            branch=branch,
        )

    async def push_problem(
        self,
        token: str,
        repo_full_name: str,
        week: int,
        problem_id: str,
        problem_title: str,
        problem_description: str,
        starter_code: str | None = None,
        branch: str = "main",
    ) -> PushResult:
        """
        Push a problem file to the user's study repository.

        Creates: problems/week{N}/{problem_id}.md

        Args:
            token: User's GitHub PAT
            repo_full_name: Repository
            week: Week number
            problem_id: Problem identifier
            problem_title: Problem title
            problem_description: Problem description in markdown
            starter_code: Optional starter code
            branch: Target branch

        Returns:
            PushResult with commit details
        """
        file_path = f"problems/week{week}/{problem_id}.md"

        content = f"# {problem_title}\n\n"
        content += problem_description

        if starter_code:
            content += "\n\n## Starter Code\n\n```python\n"
            content += starter_code
            content += "\n```\n"

        commit_message = f"📝 Add problem: {problem_title} (Week {week})"

        return await self.push_file(
            token=token,
            repo_full_name=repo_full_name,
            file_path=file_path,
            content=content,
            commit_message=commit_message,
            branch=branch,
        )

    async def validate_token(self, token: str) -> dict:
        """
        Validate a GitHub token and return user info.

        Args:
            token: GitHub Personal Access Token

        Returns:
            Dict with user info or error
        """
        try:
            g = Github(token)
            user = g.get_user()

            return {
                "valid": True,
                "username": user.login,
                "name": user.name,
                "avatar_url": user.avatar_url,
                "repos_count": user.public_repos + user.owned_private_repos,
            }
        except GithubException as e:
            return {
                "valid": False,
                "error": e.data.get("message", "Invalid token")
                if hasattr(e, "data")
                else "Invalid token",
            }
        except Exception as e:
            return {"valid": False, "error": str(e)}

    async def list_repos(self, token: str) -> dict:
        """
        List repositories accessible with the token.

        Args:
            token: GitHub PAT

        Returns:
            Dict with repositories or error
        """
        try:
            g = Github(token)
            user = g.get_user()

            repos = []
            for repo in user.get_repos(sort="updated")[:20]:
                repos.append(
                    {
                        "full_name": repo.full_name,
                        "name": repo.name,
                        "private": repo.private,
                        "default_branch": repo.default_branch,
                        "url": repo.html_url,
                    }
                )

            return {"success": True, "repos": repos}

        except Exception as e:
            return {"success": False, "error": str(e)}


# Singleton instance
git_push_service = GitPushService()
