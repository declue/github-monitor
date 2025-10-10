import httpx
from typing import List, Dict, Any, Optional
from app.config import settings


class GitHubClient:
    def __init__(self, token: Optional[str] = None, api_url: Optional[str] = None):
        self.token = token or settings.github_token
        self.base_url = api_url or "https://api.github.com"
        self.headers = {
            "Authorization": f"Bearer {self.token}",
            "Accept": "application/vnd.github+json",
            "X-GitHub-Api-Version": "2022-11-28"
        }
        self.client = httpx.AsyncClient(headers=self.headers, timeout=30.0)

    async def get_rate_limit(self) -> Dict[str, Any]:
        """Get current GitHub API rate limit status"""
        response = await self.client.get(f"{self.base_url}/rate_limit")
        response.raise_for_status()
        return response.json()

    async def get_user_orgs(self) -> List[Dict[str, Any]]:
        """Get all organizations for the authenticated user"""
        response = await self.client.get(f"{self.base_url}/user/orgs")
        response.raise_for_status()
        return response.json()

    async def get_org_repos(self, org: str) -> List[Dict[str, Any]]:
        """Get all repositories for an organization"""
        repos = []
        page = 1
        per_page = 100

        while True:
            response = await self.client.get(
                f"{self.base_url}/orgs/{org}/repos",
                params={"page": page, "per_page": per_page, "sort": "updated"}
            )
            response.raise_for_status()
            data = response.json()

            if not data:
                break

            repos.extend(data)
            page += 1

            if len(data) < per_page:
                break

        return repos

    async def get_user_repos(self) -> List[Dict[str, Any]]:
        """Get all repositories for the authenticated user"""
        repos = []
        page = 1
        per_page = 100

        while True:
            response = await self.client.get(
                f"{self.base_url}/user/repos",
                params={"page": page, "per_page": per_page, "sort": "updated", "affiliation": "owner"}
            )
            response.raise_for_status()
            data = response.json()

            if not data:
                break

            repos.extend(data)
            page += 1

            if len(data) < per_page:
                break

        return repos

    async def get_workflows(self, owner: str, repo: str) -> List[Dict[str, Any]]:
        """Get all workflows for a repository"""
        try:
            response = await self.client.get(
                f"{self.base_url}/repos/{owner}/{repo}/actions/workflows"
            )
            response.raise_for_status()
            return response.json().get("workflows", [])
        except httpx.HTTPStatusError:
            return []

    async def get_workflow_runs(self, owner: str, repo: str, per_page: int = 10) -> List[Dict[str, Any]]:
        """Get recent workflow runs for a repository"""
        try:
            response = await self.client.get(
                f"{self.base_url}/repos/{owner}/{repo}/actions/runs",
                params={"per_page": per_page, "status": "completed"}
            )
            response.raise_for_status()
            return response.json().get("workflow_runs", [])
        except httpx.HTTPStatusError:
            return []

    async def get_runners(self, owner: str, repo: str) -> List[Dict[str, Any]]:
        """Get self-hosted runners for a repository"""
        try:
            response = await self.client.get(
                f"{self.base_url}/repos/{owner}/{repo}/actions/runners"
            )
            response.raise_for_status()
            return response.json().get("runners", [])
        except httpx.HTTPStatusError:
            return []

    async def get_branches(self, owner: str, repo: str) -> List[Dict[str, Any]]:
        """Get branches for a repository"""
        try:
            response = await self.client.get(
                f"{self.base_url}/repos/{owner}/{repo}/branches",
                params={"per_page": 100}
            )
            response.raise_for_status()
            return response.json()
        except httpx.HTTPStatusError:
            return []

    async def get_pull_requests(self, owner: str, repo: str) -> List[Dict[str, Any]]:
        """Get pull requests for a repository"""
        try:
            response = await self.client.get(
                f"{self.base_url}/repos/{owner}/{repo}/pulls",
                params={"state": "all", "per_page": 50, "sort": "updated"}
            )
            response.raise_for_status()
            return response.json()
        except httpx.HTTPStatusError:
            return []

    async def get_issues(self, owner: str, repo: str) -> List[Dict[str, Any]]:
        """Get issues for a repository (excluding PRs)"""
        try:
            response = await self.client.get(
                f"{self.base_url}/repos/{owner}/{repo}/issues",
                params={"state": "all", "per_page": 50, "sort": "updated"}
            )
            response.raise_for_status()
            # Filter out pull requests (they appear in issues endpoint too)
            issues = response.json()
            return [issue for issue in issues if "pull_request" not in issue]
        except httpx.HTTPStatusError:
            return []

    async def close(self):
        """Close the HTTP client"""
        await self.client.aclose()
