from pyloid_adapter.base_adapter import BaseAdapter
from pyloid_adapter.context import PyloidContext
from fastapi import FastAPI, HTTPException, Header, Request
from fastapi.middleware.cors import CORSMiddleware
from typing import List, Optional, Dict, Any
from datetime import datetime

# GitHub API imports
from github_client import GitHubClient
from models import TreeNode, RateLimitInfo
from config import settings
from config_manager import get_config_manager, AppConfig, WatchedRepo, EnabledRepo
from version import __version__, __app_name__, __description__

app = FastAPI(
    title=__app_name__,
    description=__description__,
    version=__version__
)

def start(host: str, port: int):
    import uvicorn
    uvicorn.run(app, host=host, port=port)

def setup_cors():
    app.add_middleware(
        CORSMiddleware,
        allow_origins=['*'],
        allow_credentials=True,
        allow_methods=['*'],
        allow_headers=['*'],
    )

adapter = BaseAdapter(start, setup_cors)

# Default GitHub client (uses env token if available)
default_github_client = GitHubClient() if settings.github_token else None

def get_github_client(token: str, api_url: Optional[str] = None) -> GitHubClient:
    """Create a GitHub client with the provided token and API URL"""
    return GitHubClient(token=token, api_url=api_url)

@app.on_event("shutdown")
async def shutdown_event():
    if default_github_client:
        await default_github_client.close()

# GitHub API Endpoints

@app.get("/api/rate-limit", response_model=RateLimitInfo)
async def get_rate_limit(
    x_github_token: Optional[str] = Header(None),
    x_github_api_url: Optional[str] = Header(None)
):
    """Get current GitHub API rate limit status"""
    import httpx

    try:
        token = x_github_token or (settings.github_token if settings.github_token else None)
        if not token:
            raise HTTPException(status_code=401, detail="GitHub token is required")

        api_url = x_github_api_url or "https://api.github.com"
        client = get_github_client(token, api_url)
        data = await client.get_rate_limit()
        await client.close()

        core_rate = data["resources"]["core"]
        return RateLimitInfo(
            limit=core_rate["limit"],
            remaining=core_rate["remaining"],
            reset=core_rate["reset"],
            used=core_rate["used"]
        )
    except HTTPException:
        raise
    except httpx.HTTPStatusError as e:
        if e.response.status_code == 401:
            raise HTTPException(status_code=401, detail="Invalid GitHub token")
        elif e.response.status_code == 403:
            raise HTTPException(status_code=403, detail="GitHub API rate limit exceeded")
        else:
            raise HTTPException(status_code=e.response.status_code, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/tree", response_model=List[TreeNode])
async def get_tree(
    orgs: Optional[str] = None,
    x_github_token: Optional[str] = Header(None),
    x_github_api_url: Optional[str] = Header(None)
):
    """Get the lightweight repository tree structure"""
    import httpx

    try:
        token = x_github_token or (settings.github_token if settings.github_token else None)
        if not token:
            raise HTTPException(status_code=401, detail="GitHub token is required")

        api_url = x_github_api_url or "https://api.github.com"
        client = get_github_client(token, api_url)
        tree_nodes = []

        # Parse orgs parameter
        org_list = [o.strip() for o in orgs.split(',')] if orgs else []

        # Get organizations or user repos
        if org_list:
            orgs_to_fetch = [{"login": org} for org in org_list]
        elif settings.github_org:
            orgs_to_fetch = [{"login": settings.github_org}]
        else:
            orgs_to_fetch = await client.get_user_orgs()
            # Also include personal repos
            personal_repos = await client.get_user_repos()
            if personal_repos:
                personal_node = await build_org_tree_lightweight(client, "Personal Repositories", personal_repos)
                tree_nodes.append(personal_node)

        # Build tree for each organization
        for org_data in orgs_to_fetch:
            org_login = org_data["login"]
            repos = await client.get_org_repos(org_login)
            org_node = await build_org_tree_lightweight(client, org_login, repos)
            tree_nodes.append(org_node)

        await client.close()
        return tree_nodes

    except HTTPException:
        raise
    except httpx.HTTPStatusError as e:
        if e.response.status_code == 401:
            raise HTTPException(status_code=401, detail="Invalid GitHub token")
        elif e.response.status_code == 403:
            raise HTTPException(status_code=403, detail="GitHub API rate limit exceeded")
        else:
            raise HTTPException(status_code=e.response.status_code, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

async def build_org_tree_lightweight(client: GitHubClient, org_name: str, repos: List[dict]) -> TreeNode:
    """Build lightweight tree structure for an organization"""
    org_node = TreeNode(
        id=f"org-{org_name}",
        name=org_name,
        type="organization",
        metadata={"repo_count": len(repos)},
        hasChildren=len(repos) > 0,
        isLoaded=True
    )

    for repo in repos:
        owner = repo["owner"]["login"]
        repo_name = repo["name"]

        repo_node = TreeNode(
            id=f"repo-{owner}-{repo_name}",
            name=repo_name,
            type="repository",
            url=repo["html_url"],
            metadata={
                "description": repo.get("description"),
                "private": repo.get("private", False),
                "language": repo.get("language"),
                "stars": repo.get("stargazers_count", 0),
                "updated_at": repo.get("updated_at"),
                "owner": owner
            },
            hasChildren=True,
            isLoaded=False
        )
        org_node.children.append(repo_node)

    return org_node

async def build_repo_details(client: GitHubClient, owner: str, repo_name: str) -> List[TreeNode]:
    """Build detailed children for a repository"""
    children = []

    # Get workflows
    workflows = await client.get_workflows(owner, repo_name)
    if workflows:
        workflows_node = TreeNode(
            id=f"workflows-{owner}-{repo_name}",
            name=f"Workflows ({len(workflows)})",
            type="workflows",
            hasChildren=len(workflows) > 0,
            isLoaded=True
        )
        for workflow in workflows[:20]:
            workflow_node = TreeNode(
                id=f"workflow-{workflow['id']}",
                name=workflow["name"],
                type="workflow",
                status=workflow.get("state"),
                url=workflow.get("html_url"),
                metadata={"path": workflow.get("path")},
                hasChildren=False,
                isLoaded=True
            )
            workflows_node.children.append(workflow_node)
        children.append(workflows_node)

    # Get workflow runs
    workflow_runs = await client.get_workflow_runs(owner, repo_name, per_page=10)
    if workflow_runs:
        runs_node = TreeNode(
            id=f"runs-{owner}-{repo_name}",
            name=f"Recent Runs ({len(workflow_runs)})",
            type="workflow_runs",
            hasChildren=len(workflow_runs) > 0,
            isLoaded=True
        )
        for run in workflow_runs[:10]:
            run_node = TreeNode(
                id=f"run-{run['id']}",
                name=f"{run['name']} #{run['run_number']}",
                type="workflow_run",
                status=run.get("conclusion", run.get("status")),
                url=run.get("html_url"),
                metadata={
                    "created_at": run.get("created_at"),
                    "updated_at": run.get("updated_at")
                },
                hasChildren=False,
                isLoaded=True
            )
            runs_node.children.append(run_node)
        children.append(runs_node)

    # Get runners
    runners = await client.get_runners(owner, repo_name)
    if runners:
        runners_node = TreeNode(
            id=f"runners-{owner}-{repo_name}",
            name=f"Runners ({len(runners)})",
            type="runners",
            hasChildren=len(runners) > 0,
            isLoaded=True
        )
        for runner in runners:
            runner_node = TreeNode(
                id=f"runner-{runner['id']}",
                name=runner["name"],
                type="runner",
                status=runner.get("status"),
                metadata={
                    "os": runner.get("os"),
                    "busy": runner.get("busy")
                },
                hasChildren=False,
                isLoaded=True
            )
            runners_node.children.append(runner_node)
        children.append(runners_node)

    # Get branches
    branches = await client.get_branches(owner, repo_name)
    if branches:
        branches_node = TreeNode(
            id=f"branches-{owner}-{repo_name}",
            name=f"Branches ({len(branches)})",
            type="branches",
            hasChildren=len(branches) > 0,
            isLoaded=True
        )
        for branch in branches[:20]:
            branch_node = TreeNode(
                id=f"branch-{owner}-{repo_name}-{branch['name']}",
                name=branch["name"],
                type="branch",
                metadata={"protected": branch.get("protected", False)},
                hasChildren=False,
                isLoaded=True
            )
            branches_node.children.append(branch_node)
        children.append(branches_node)

    # Get pull requests
    pull_requests = await client.get_pull_requests(owner, repo_name)
    if pull_requests:
        prs_node = TreeNode(
            id=f"prs-{owner}-{repo_name}",
            name=f"Pull Requests ({len(pull_requests)})",
            type="pull_requests",
            hasChildren=len(pull_requests) > 0,
            isLoaded=True
        )
        for pr in pull_requests[:20]:
            pr_node = TreeNode(
                id=f"pr-{pr['id']}",
                name=f"#{pr['number']} {pr['title']}",
                type="pull_request",
                status=pr.get("state"),
                url=pr.get("html_url"),
                metadata={
                    "created_at": pr.get("created_at"),
                    "updated_at": pr.get("updated_at"),
                    "draft": pr.get("draft", False)
                },
                hasChildren=False,
                isLoaded=True
            )
            prs_node.children.append(pr_node)
        children.append(prs_node)

    # Get issues
    issues = await client.get_issues(owner, repo_name)
    if issues:
        issues_node = TreeNode(
            id=f"issues-{owner}-{repo_name}",
            name=f"Issues ({len(issues)})",
            type="issues",
            hasChildren=len(issues) > 0,
            isLoaded=True
        )
        for issue in issues[:20]:
            issue_node = TreeNode(
                id=f"issue-{issue['id']}",
                name=f"#{issue['number']} {issue['title']}",
                type="issue",
                status=issue.get("state"),
                url=issue.get("html_url"),
                metadata={
                    "created_at": issue.get("created_at"),
                    "updated_at": issue.get("updated_at")
                },
                hasChildren=False,
                isLoaded=True
            )
            issues_node.children.append(issue_node)
        children.append(issues_node)

    return children

@app.get("/api/repo-details/{owner}/{repo}", response_model=List[TreeNode])
async def get_repo_details(
    owner: str,
    repo: str,
    x_github_token: Optional[str] = Header(None),
    x_github_api_url: Optional[str] = Header(None)
):
    """Get detailed information for a specific repository"""
    import httpx

    try:
        token = x_github_token or (settings.github_token if settings.github_token else None)
        if not token:
            raise HTTPException(status_code=401, detail="GitHub token is required")

        api_url = x_github_api_url or "https://api.github.com"
        client = get_github_client(token, api_url)

        # Build detailed children for this repository
        children = await build_repo_details(client, owner, repo)

        await client.close()
        return children

    except HTTPException:
        raise
    except httpx.HTTPStatusError as e:
        if e.response.status_code == 401:
            raise HTTPException(status_code=401, detail="Invalid GitHub token")
        elif e.response.status_code == 403:
            raise HTTPException(status_code=403, detail="GitHub API rate limit exceeded")
        else:
            raise HTTPException(status_code=e.response.status_code, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/")
async def root():
    """Root endpoint with basic API information"""
    return {
        "name": __app_name__,
        "version": __version__,
        "description": __description__,
        "status": "running",
        "docs_url": "/docs",
    }

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "version": __version__,
        "timestamp": datetime.utcnow().isoformat(),
        "service": __app_name__,
    }

@app.get("/api/version")
async def get_version():
    """Get API version information"""
    return {
        "version": __version__,
        "name": __app_name__,
        "description": __description__,
    }

# Pyloid specific endpoints
@app.get('/create_window')
async def create_window(request: Request):
    window_id = request.headers.get("X-Pyloid-Window-Id")

    if adapter.is_pyloid(window_id):
        print("pyloid request")
    else:
        print("not pyloid request")

    ctx: PyloidContext = adapter.get_context(window_id)

    win = ctx.pyloid.create_window(title='GitHub Repository')
    win.load_url('https://www.github.com')
    win.show_and_focus()


# Configuration Management Endpoints

@app.get("/api/config", response_model=AppConfig)
async def get_configuration():
    """Get current application configuration"""
    config_manager = get_config_manager()
    return config_manager.get_config()


from pydantic import BaseModel as PydanticBaseModel

class GitHubConfigUpdate(PydanticBaseModel):
    token: Optional[str] = None
    api_url: Optional[str] = None
    organization: Optional[str] = None

@app.post("/api/config/github")
async def update_github_config(config_update: GitHubConfigUpdate):
    """Update GitHub configuration"""
    try:
        config_manager = get_config_manager()

        print(f"Updating GitHub config: token={'***' if config_update.token else None}, api_url={config_update.api_url}, org={config_update.organization}")
        print(f"Config file path: {config_manager.config_file_path}")
        print(f"Config directory: {config_manager.config_directory}")

        if config_update.token is not None:
            config_manager.update_github_token(config_update.token)
        if config_update.api_url is not None:
            config_manager.update_github_api_url(config_update.api_url)
        if config_update.organization is not None:
            config_manager.update_github_organization(config_update.organization)

        # Reload settings to apply changes
        from config import load_settings
        global settings
        settings = load_settings()

        print("GitHub config updated successfully")
        return {"status": "updated", "config": config_manager.get_config().github}
    except Exception as e:
        print(f"Error updating GitHub config: {type(e).__name__}: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Failed to update configuration: {type(e).__name__}: {str(e)}")


@app.get("/api/config/watched-repos", response_model=List[WatchedRepo])
async def get_watched_repos():
    """Get list of watched repositories"""
    config_manager = get_config_manager()
    return config_manager.get_watched_repos()


@app.post("/api/config/watched-repos")
async def add_watched_repo(owner: str, repo: str, notifications: bool = True):
    """Add a repository to watch list"""
    config_manager = get_config_manager()
    config_manager.add_watched_repo(owner, repo, notifications)
    return {"status": "added", "repo": f"{owner}/{repo}"}


@app.delete("/api/config/watched-repos/{owner}/{repo}")
async def remove_watched_repo(owner: str, repo: str):
    """Remove a repository from watch list"""
    config_manager = get_config_manager()
    config_manager.remove_watched_repo(owner, repo)
    return {"status": "removed", "repo": f"{owner}/{repo}"}


@app.post("/api/config/ui")
async def update_ui_config(
    theme: Optional[str] = None,
    language: Optional[str] = None,
    window_size: Optional[Dict[str, int]] = None,
    window_position: Optional[Dict[str, int]] = None,
    notifications_refresh_interval: Optional[int] = None
):
    """Update UI configuration"""
    config_manager = get_config_manager()
    config = config_manager.get_config()

    if theme is not None:
        config.ui.theme = theme
    if language is not None:
        config.ui.language = language
    if window_size is not None:
        config.ui.window_size = window_size
    if window_position is not None:
        config.ui.window_position = window_position
    if notifications_refresh_interval is not None:
        config.notifications_refresh_interval = notifications_refresh_interval

    config_manager.save_config()
    return {"status": "updated", "config": config.ui, "notifications_refresh_interval": config.notifications_refresh_interval}


@app.post("/api/config/reset")
async def reset_configuration():
    """Reset configuration to defaults"""
    config_manager = get_config_manager()
    config_manager.reset_config()

    # Reload settings
    from config import load_settings
    global settings
    settings = load_settings()

    return {"status": "reset", "message": "Configuration reset to defaults"}


@app.post("/api/config/export")
async def export_configuration(export_path: str):
    """Export configuration to a file"""
    try:
        config_manager = get_config_manager()
        config_manager.export_config(export_path)
        return {"status": "exported", "path": export_path}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/config/import")
async def import_configuration(import_path: str):
    """Import configuration from a file"""
    try:
        config_manager = get_config_manager()
        config_manager.import_config(import_path)

        # Reload settings
        from config import load_settings
        global settings
        settings = load_settings()

        return {"status": "imported", "path": import_path}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/config/path")
async def get_config_path():
    """Get the configuration file path"""
    config_manager = get_config_manager()
    return {
        "config_file": str(config_manager.config_file_path),
        "config_directory": str(config_manager.config_directory)
    }


class EnabledReposUpdate(PydanticBaseModel):
    enabled_repos: List[Dict[str, Any]]


@app.get("/api/config/enabled-repos", response_model=List[EnabledRepo])
async def get_enabled_repos():
    """Get list of enabled/disabled repositories in TreeView"""
    config_manager = get_config_manager()
    return config_manager.get_enabled_repos()


@app.post("/api/config/enabled-repos")
async def update_enabled_repos(update: EnabledReposUpdate):
    """Update the enabled/disabled state of repositories in TreeView"""
    config_manager = get_config_manager()
    config_manager.update_enabled_repos(update.enabled_repos)
    return {"status": "updated", "enabled_repos": update.enabled_repos}


# Notifications API Endpoints

@app.get("/api/notifications")
async def get_notifications(
    all: bool = False,
    participating: bool = False,
    page: int = 1,
    per_page: int = 50,
    x_github_token: Optional[str] = Header(None),
    x_github_api_url: Optional[str] = Header(None)
):
    """Get notifications for the authenticated user"""
    import httpx

    try:
        token = x_github_token or (settings.github_token if settings.github_token else None)
        if not token:
            raise HTTPException(status_code=401, detail="GitHub token is required")

        api_url = x_github_api_url or "https://api.github.com"
        client = get_github_client(token, api_url)

        notifications = await client.get_notifications(
            all_notifications=all,
            participating=participating,
            page=page,
            per_page=per_page
        )

        # Also get the rate limit to update the UI
        rate_limit = await client.get_rate_limit()

        await client.close()

        return {
            "notifications": notifications,
            "pagination": {
                "page": page,
                "per_page": per_page,
                "has_more": len(notifications) == per_page
            },
            "rate_limit": rate_limit["resources"]["core"]
        }

    except HTTPException:
        raise
    except httpx.HTTPStatusError as e:
        if e.response.status_code == 401:
            raise HTTPException(status_code=401, detail="Invalid GitHub token")
        elif e.response.status_code == 403:
            raise HTTPException(status_code=403, detail="GitHub API rate limit exceeded")
        else:
            raise HTTPException(status_code=e.response.status_code, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/notifications/count")
async def get_notifications_count(
    x_github_token: Optional[str] = Header(None),
    x_github_api_url: Optional[str] = Header(None)
):
    """Get count of unread notifications"""
    import httpx

    try:
        token = x_github_token or (settings.github_token if settings.github_token else None)
        if not token:
            raise HTTPException(status_code=401, detail="GitHub token is required")

        api_url = x_github_api_url or "https://api.github.com"
        client = get_github_client(token, api_url)

        count_data = await client.get_notifications_count()

        # Also get the rate limit to update the UI
        rate_limit = await client.get_rate_limit()

        await client.close()

        return {
            **count_data,
            "rate_limit": rate_limit["resources"]["core"]
        }

    except HTTPException:
        raise
    except httpx.HTTPStatusError as e:
        if e.response.status_code == 401:
            raise HTTPException(status_code=401, detail="Invalid GitHub token")
        elif e.response.status_code == 403:
            raise HTTPException(status_code=403, detail="GitHub API rate limit exceeded")
        else:
            raise HTTPException(status_code=e.response.status_code, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.patch("/api/notifications/{thread_id}/read")
async def mark_notification_as_read(
    thread_id: str,
    x_github_token: Optional[str] = Header(None),
    x_github_api_url: Optional[str] = Header(None)
):
    """Mark a single notification as read"""
    import httpx

    try:
        token = x_github_token or (settings.github_token if settings.github_token else None)
        if not token:
            raise HTTPException(status_code=401, detail="GitHub token is required")

        api_url = x_github_api_url or "https://api.github.com"
        client = get_github_client(token, api_url)

        success = await client.mark_notification_as_read(thread_id)

        await client.close()

        if success:
            return {"status": "marked_as_read", "thread_id": thread_id}
        else:
            raise HTTPException(status_code=400, detail="Failed to mark notification as read")

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.put("/api/notifications/mark-all-read")
async def mark_all_notifications_as_read(
    x_github_token: Optional[str] = Header(None),
    x_github_api_url: Optional[str] = Header(None)
):
    """Mark all notifications as read"""
    import httpx

    try:
        token = x_github_token or (settings.github_token if settings.github_token else None)
        if not token:
            raise HTTPException(status_code=401, detail="GitHub token is required")

        api_url = x_github_api_url or "https://api.github.com"
        client = get_github_client(token, api_url)

        success = await client.mark_all_notifications_as_read()

        await client.close()

        if success:
            return {"status": "all_marked_as_read"}
        else:
            raise HTTPException(status_code=400, detail="Failed to mark all notifications as read")

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# Git Operations Endpoints

import subprocess
import os
from pathlib import Path

class GitStatusFile(PydanticBaseModel):
    path: str
    status: str  # 'modified', 'added', 'deleted', 'renamed', 'untracked'
    staged: bool

class GitStatus(PydanticBaseModel):
    files: List[GitStatusFile]
    branch: str
    ahead: int
    behind: int

class GitCommit(PydanticBaseModel):
    hash: str
    short_hash: str
    author: str
    email: str
    date: str
    message: str
    body: Optional[str] = None

class GitRepoInfo(PydanticBaseModel):
    path: str
    name: str
    branch: str
    remote_url: Optional[str] = None

def run_git_command(repo_path: str, *args) -> str:
    """Run a git command in the specified repository"""
    try:
        result = subprocess.run(
            ['git', '-C', repo_path, *args],
            capture_output=True,
            text=True,
            check=True
        )
        return result.stdout
    except subprocess.CalledProcessError as e:
        raise HTTPException(
            status_code=400,
            detail=f"Git command failed: {e.stderr}"
        )

@app.get("/api/git/repos", response_model=List[GitRepoInfo])
async def get_git_repos():
    """Get list of git repositories (from enabled repos in config)"""
    try:
        config_manager = get_config_manager()
        enabled_repos = config_manager.get_enabled_repos()

        # For now, return empty list as we need actual local paths
        # This would need to be enhanced to map GitHub repos to local paths
        return []
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/git/status")
async def get_git_status(repo_path: str) -> GitStatus:
    """Get git status for a repository"""
    try:
        # Validate repo_path exists and is a git repository
        if not os.path.exists(repo_path):
            raise HTTPException(status_code=404, detail="Repository path not found")

        if not os.path.exists(os.path.join(repo_path, '.git')):
            raise HTTPException(status_code=400, detail="Not a git repository")

        # Get branch name
        branch = run_git_command(repo_path, 'rev-parse', '--abbrev-ref', 'HEAD').strip()

        # Get ahead/behind counts
        ahead = 0
        behind = 0
        try:
            ahead_behind = run_git_command(repo_path, 'rev-list', '--left-right', '--count', f'{branch}...@{{u}}').strip()
            if ahead_behind:
                parts = ahead_behind.split('\t')
                ahead = int(parts[0]) if len(parts) > 0 else 0
                behind = int(parts[1]) if len(parts) > 1 else 0
        except:
            pass  # No remote tracking branch

        # Get status
        status_output = run_git_command(repo_path, 'status', '--porcelain')

        files = []
        for line in status_output.split('\n'):
            if not line:
                continue

            status_code = line[:2]
            file_path = line[3:]

            # Parse status code
            staged = False
            status_text = 'modified'

            if status_code[0] != ' ' and status_code[0] != '?':
                staged = True

            if status_code == '??':
                status_text = 'untracked'
            elif 'M' in status_code:
                status_text = 'modified'
            elif 'A' in status_code:
                status_text = 'added'
            elif 'D' in status_code:
                status_text = 'deleted'
            elif 'R' in status_code:
                status_text = 'renamed'

            files.append(GitStatusFile(
                path=file_path,
                status=status_text,
                staged=staged
            ))

        return GitStatus(
            files=files,
            branch=branch,
            ahead=ahead,
            behind=behind
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/git/log")
async def get_git_log(repo_path: str, limit: int = 50) -> List[GitCommit]:
    """Get git commit history"""
    try:
        if not os.path.exists(repo_path):
            raise HTTPException(status_code=404, detail="Repository path not found")

        # Get commits with custom format
        log_format = '%H%n%h%n%an%n%ae%n%ai%n%s%n%b%n--END--'
        log_output = run_git_command(repo_path, 'log', f'-{limit}', f'--pretty=format:{log_format}')

        commits = []
        commit_blocks = log_output.split('--END--\n')

        for block in commit_blocks:
            if not block.strip():
                continue

            lines = block.strip().split('\n')
            if len(lines) < 6:
                continue

            commit = GitCommit(
                hash=lines[0],
                short_hash=lines[1],
                author=lines[2],
                email=lines[3],
                date=lines[4],
                message=lines[5],
                body='\n'.join(lines[6:]) if len(lines) > 6 else None
            )
            commits.append(commit)

        return commits
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/git/diff")
async def get_git_diff(repo_path: str, file_path: Optional[str] = None, staged: bool = False):
    """Get git diff for files"""
    try:
        if not os.path.exists(repo_path):
            raise HTTPException(status_code=404, detail="Repository path not found")

        args = ['diff']
        if staged:
            args.append('--cached')
        if file_path:
            args.append('--')
            args.append(file_path)

        diff_output = run_git_command(repo_path, *args)

        return {
            "diff": diff_output,
            "file_path": file_path,
            "staged": staged
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/git/add")
async def git_add(repo_path: str, files: List[str]):
    """Stage files for commit"""
    try:
        if not os.path.exists(repo_path):
            raise HTTPException(status_code=404, detail="Repository path not found")

        for file in files:
            run_git_command(repo_path, 'add', file)

        return {"status": "success", "files": files}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/git/reset")
async def git_reset(repo_path: str, files: List[str]):
    """Unstage files"""
    try:
        if not os.path.exists(repo_path):
            raise HTTPException(status_code=404, detail="Repository path not found")

        for file in files:
            run_git_command(repo_path, 'reset', 'HEAD', file)

        return {"status": "success", "files": files}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

class CommitRequest(PydanticBaseModel):
    repo_path: str
    message: str
    description: Optional[str] = None

@app.post("/api/git/commit")
async def git_commit(request: CommitRequest):
    """Create a git commit"""
    try:
        if not os.path.exists(request.repo_path):
            raise HTTPException(status_code=404, detail="Repository path not found")

        # Combine message and description
        full_message = request.message
        if request.description:
            full_message += f"\n\n{request.description}"

        run_git_command(request.repo_path, 'commit', '-m', full_message)

        # Get the commit hash
        commit_hash = run_git_command(request.repo_path, 'rev-parse', 'HEAD').strip()

        return {
            "status": "success",
            "commit_hash": commit_hash,
            "message": request.message
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))