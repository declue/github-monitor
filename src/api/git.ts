import { baseAPI } from 'pyloid-js';

const getApiBaseUrl = async () => {
  try {
    return await baseAPI.getServerUrl();
  } catch (error) {
    console.error('Failed to get server URL, using empty string:', error);
    return '';
  }
};

export interface GitStatusFile {
  path: string;
  status: 'modified' | 'added' | 'deleted' | 'renamed' | 'untracked';
  staged: boolean;
}

export interface GitStatus {
  files: GitStatusFile[];
  branch: string;
  ahead: number;
  behind: number;
}

export interface GitCommit {
  hash: string;
  short_hash: string;
  author: string;
  email: string;
  date: string;
  message: string;
  body?: string;
}

export interface GitRepoInfo {
  path: string;
  name: string;
  branch: string;
  remote_url?: string;
}

export interface GitDiff {
  diff: string;
  file_path?: string;
  staged: boolean;
}

export interface CommitRequest {
  repo_path: string;
  message: string;
  description?: string;
}

export interface CommitResponse {
  status: string;
  commit_hash: string;
  message: string;
}

/**
 * Get list of git repositories
 */
export async function fetchGitRepos(): Promise<GitRepoInfo[]> {
  const baseUrl = await getApiBaseUrl();
  const url = `${baseUrl}/api/git/repos`;

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch git repos: ${response.statusText}`);
  }

  return await response.json();
}

/**
 * Get git status for a repository
 */
export async function fetchGitStatus(repoPath: string): Promise<GitStatus> {
  const baseUrl = await getApiBaseUrl();
  const url = `${baseUrl}/api/git/status?repo_path=${encodeURIComponent(repoPath)}`;

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch git status: ${response.statusText}`);
  }

  return await response.json();
}

/**
 * Get git commit history
 */
export async function fetchGitLog(repoPath: string, limit: number = 50): Promise<GitCommit[]> {
  const baseUrl = await getApiBaseUrl();
  const url = `${baseUrl}/api/git/log?repo_path=${encodeURIComponent(repoPath)}&limit=${limit}`;

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch git log: ${response.statusText}`);
  }

  return await response.json();
}

/**
 * Get git diff for files
 */
export async function fetchGitDiff(repoPath: string, filePath?: string, staged: boolean = false): Promise<GitDiff> {
  const baseUrl = await getApiBaseUrl();
  let url = `${baseUrl}/api/git/diff?repo_path=${encodeURIComponent(repoPath)}&staged=${staged}`;
  if (filePath) {
    url += `&file_path=${encodeURIComponent(filePath)}`;
  }

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch git diff: ${response.statusText}`);
  }

  return await response.json();
}

/**
 * Stage files for commit
 */
export async function gitAdd(repoPath: string, files: string[]): Promise<{ status: string; files: string[] }> {
  const baseUrl = await getApiBaseUrl();
  const url = `${baseUrl}/api/git/add?repo_path=${encodeURIComponent(repoPath)}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ files }),
  });

  if (!response.ok) {
    throw new Error(`Failed to stage files: ${response.statusText}`);
  }

  return await response.json();
}

/**
 * Unstage files
 */
export async function gitReset(repoPath: string, files: string[]): Promise<{ status: string; files: string[] }> {
  const baseUrl = await getApiBaseUrl();
  const url = `${baseUrl}/api/git/reset?repo_path=${encodeURIComponent(repoPath)}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ files }),
  });

  if (!response.ok) {
    throw new Error(`Failed to unstage files: ${response.statusText}`);
  }

  return await response.json();
}

/**
 * Create a git commit
 */
export async function gitCommit(request: CommitRequest): Promise<CommitResponse> {
  const baseUrl = await getApiBaseUrl();
  const url = `${baseUrl}/api/git/commit`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: response.statusText }));
    throw new Error(`Failed to create commit: ${error.detail || response.statusText}`);
  }

  return await response.json();
}
