import httpx
from typing import List, Dict, Any, Optional
from config import settings


class GitHubClient:
    def __init__(self, token: Optional[str] = None, api_url: Optional[str] = None):
        self.token = token or settings.github_token
        self.base_url = api_url or settings.github_api_url or "https://api.github.com"
        self.headers = {
            "Authorization": f"token {self.token}",
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
        """Get all repositories for an organization or user"""
        repos = []
        page = 1
        per_page = 100

        # Try organization endpoint first
        try:
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
        except httpx.HTTPStatusError as e:
            # If org endpoint fails (404), try user endpoint
            if e.response.status_code == 404:
                page = 1
                while True:
                    response = await self.client.get(
                        f"{self.base_url}/users/{org}/repos",
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
            else:
                raise

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
        except httpx.HTTPStatusError as e:
            # Log the error for debugging
            print(f"Failed to get runners for {owner}/{repo}: {e.response.status_code} - {e.response.text}")
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

    async def get_notifications(self, all_notifications: bool = False, participating: bool = False,
                               since: Optional[str] = None, before: Optional[str] = None,
                               page: int = 1, per_page: int = 50) -> List[Dict[str, Any]]:
        """Get notifications for the authenticated user

        Args:
            all_notifications: If true, show notifications marked as read
            participating: If true, only shows notifications in which the user is directly participating
            since: Only show notifications updated after the given time (ISO 8601 format)
            before: Only show notifications updated before the given time (ISO 8601 format)
            page: Page number for pagination
            per_page: Number of items per page (max 100)
        """
        try:
            params = {
                "all": str(all_notifications).lower(),
                "participating": str(participating).lower(),
                "page": page,
                "per_page": min(per_page, 100)
            }

            if since:
                params["since"] = since
            if before:
                params["before"] = before

            response = await self.client.get(
                f"{self.base_url}/notifications",
                params=params
            )
            response.raise_for_status()
            return response.json()
        except httpx.HTTPStatusError:
            return []

    async def get_notifications_count(self) -> Dict[str, int]:
        """Get count of unread notifications"""
        try:
            # Get only unread notifications
            response = await self.client.get(
                f"{self.base_url}/notifications",
                params={"all": "false", "per_page": 1}
            )
            response.raise_for_status()

            # The total count is in the Link header
            link_header = response.headers.get("Link", "")
            total_count = 0

            # Parse Link header to get total count
            if link_header and 'rel="last"' in link_header:
                import re
                # Extract page number from last page link
                match = re.search(r'page=(\d+)>; rel="last"', link_header)
                if match:
                    last_page = int(match.group(1))
                    # Get the actual count from last page
                    last_response = await self.client.get(
                        f"{self.base_url}/notifications",
                        params={"all": "false", "page": last_page, "per_page": 100}
                    )
                    last_response.raise_for_status()
                    items_on_last_page = len(last_response.json())
                    total_count = (last_page - 1) * 100 + items_on_last_page
            else:
                # If no pagination, just count the items
                all_response = await self.client.get(
                    f"{self.base_url}/notifications",
                    params={"all": "false", "per_page": 100}
                )
                all_response.raise_for_status()
                total_count = len(all_response.json())

            return {"unread_count": total_count}
        except httpx.HTTPStatusError:
            return {"unread_count": 0}

    async def mark_notification_as_read(self, thread_id: str):
        """Mark a single notification as read"""
        try:
            response = await self.client.patch(
                f"{self.base_url}/notifications/threads/{thread_id}"
            )
            response.raise_for_status()
            return True
        except httpx.HTTPStatusError:
            return False

    async def mark_all_notifications_as_read(self):
        """Mark all notifications as read"""
        try:
            response = await self.client.put(
                f"{self.base_url}/notifications",
                json={"read": True}
            )
            response.raise_for_status()
            return True
        except httpx.HTTPStatusError:
            return False

    async def close(self):
        """Close the HTTP client"""
        await self.client.aclose()
