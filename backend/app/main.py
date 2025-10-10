from fastapi import FastAPI, HTTPException, Header
from fastapi.middleware.cors import CORSMiddleware
from typing import List, Optional
from app.github_client import GitHubClient
from app.models import TreeNode, RateLimitInfo
from app.config import settings

app = FastAPI(title="GitHub Repository Explorer API")

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Default client (uses env token if available)
default_github_client = GitHubClient() if settings.github_token else None


def get_github_client(token: str) -> GitHubClient:
    """Create a GitHub client with the provided token"""
    return GitHubClient(token=token)


@app.on_event("shutdown")
async def shutdown_event():
    if default_github_client:
        await default_github_client.close()


@app.get("/api/rate-limit", response_model=RateLimitInfo)
async def get_rate_limit(x_github_token: Optional[str] = Header(None)):
    """Get current GitHub API rate limit status"""
    try:
        # Use header token if provided, otherwise use default
        token = x_github_token or (settings.github_token if settings.github_token else None)
        if not token:
            raise HTTPException(status_code=401, detail="GitHub token is required")

        client = get_github_client(token)
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
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/tree", response_model=List[TreeNode])
async def get_tree(
    orgs: Optional[str] = None,
    x_github_token: Optional[str] = Header(None)
):
    """Get the complete repository tree structure

    Args:
        orgs: Comma-separated list of organizations/users to filter
        x_github_token: GitHub personal access token (in header)
    """
    try:
        # Use header token if provided, otherwise use default
        token = x_github_token or (settings.github_token if settings.github_token else None)
        if not token:
            raise HTTPException(status_code=401, detail="GitHub token is required")

        client = get_github_client(token)
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
                personal_node = await build_org_tree(client, "Personal Repositories", personal_repos)
                tree_nodes.append(personal_node)

        # Build tree for each organization
        for org_data in orgs_to_fetch:
            org_login = org_data["login"]
            repos = await client.get_org_repos(org_login)
            org_node = await build_org_tree(client, org_login, repos)
            tree_nodes.append(org_node)

        await client.close()
        return tree_nodes

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


async def build_org_tree(client: GitHubClient, org_name: str, repos: List[dict]) -> TreeNode:
    """Build tree structure for an organization"""
    org_node = TreeNode(
        id=f"org-{org_name}",
        name=org_name,
        type="organization",
        metadata={"repo_count": len(repos)}
    )

    for repo in repos:
        repo_node = await build_repo_tree(client, repo)
        org_node.children.append(repo_node)

    return org_node


async def build_repo_tree(client: GitHubClient, repo: dict) -> TreeNode:
    """Build tree structure for a repository"""
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
            "updated_at": repo.get("updated_at")
        }
    )

    # Get workflows
    workflows = await client.get_workflows(owner, repo_name)
    if workflows:
        workflows_node = TreeNode(
            id=f"workflows-{owner}-{repo_name}",
            name=f"Workflows ({len(workflows)})",
            type="workflows"
        )
        for workflow in workflows[:20]:  # Limit to 20
            workflow_node = TreeNode(
                id=f"workflow-{workflow['id']}",
                name=workflow["name"],
                type="workflow",
                status=workflow.get("state"),
                url=workflow.get("html_url"),
                metadata={"path": workflow.get("path")}
            )
            workflows_node.children.append(workflow_node)
        repo_node.children.append(workflows_node)

    # Get workflow runs
    workflow_runs = await client.get_workflow_runs(owner, repo_name, per_page=10)
    if workflow_runs:
        runs_node = TreeNode(
            id=f"runs-{owner}-{repo_name}",
            name=f"Recent Runs ({len(workflow_runs)})",
            type="workflow_runs"
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
                }
            )
            runs_node.children.append(run_node)
        repo_node.children.append(runs_node)

    # Get runners
    runners = await client.get_runners(owner, repo_name)
    if runners:
        runners_node = TreeNode(
            id=f"runners-{owner}-{repo_name}",
            name=f"Runners ({len(runners)})",
            type="runners"
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
                }
            )
            runners_node.children.append(runner_node)
        repo_node.children.append(runners_node)

    # Get branches
    branches = await client.get_branches(owner, repo_name)
    if branches:
        branches_node = TreeNode(
            id=f"branches-{owner}-{repo_name}",
            name=f"Branches ({len(branches)})",
            type="branches"
        )
        for branch in branches[:20]:  # Limit to 20
            branch_node = TreeNode(
                id=f"branch-{owner}-{repo_name}-{branch['name']}",
                name=branch["name"],
                type="branch",
                metadata={"protected": branch.get("protected", False)}
            )
            branches_node.children.append(branch_node)
        repo_node.children.append(branches_node)

    # Get pull requests
    pull_requests = await client.get_pull_requests(owner, repo_name)
    if pull_requests:
        prs_node = TreeNode(
            id=f"prs-{owner}-{repo_name}",
            name=f"Pull Requests ({len(pull_requests)})",
            type="pull_requests"
        )
        for pr in pull_requests[:20]:  # Limit to 20
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
                }
            )
            prs_node.children.append(pr_node)
        repo_node.children.append(prs_node)

    # Get issues
    issues = await client.get_issues(owner, repo_name)
    if issues:
        issues_node = TreeNode(
            id=f"issues-{owner}-{repo_name}",
            name=f"Issues ({len(issues)})",
            type="issues"
        )
        for issue in issues[:20]:  # Limit to 20
            issue_node = TreeNode(
                id=f"issue-{issue['id']}",
                name=f"#{issue['number']} {issue['title']}",
                type="issue",
                status=issue.get("state"),
                url=issue.get("html_url"),
                metadata={
                    "created_at": issue.get("created_at"),
                    "updated_at": issue.get("updated_at")
                }
            )
            issues_node.children.append(issue_node)
        repo_node.children.append(issues_node)

    return repo_node


@app.get("/")
async def root():
    return {"message": "GitHub Repository Explorer API", "status": "running"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
