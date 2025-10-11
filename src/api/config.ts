/**
 * Configuration API client
 * Manages settings in home directory via backend API
 */

import { baseAPI } from 'pyloid-js';

// Get the server URL dynamically
const getApiBaseUrl = async () => {
  try {
    return await baseAPI.getServerUrl();
  } catch (error) {
    console.error('Failed to get server URL, using empty string:', error);
    return '';
  }
};

export interface AppConfig {
  github: {
    token?: string;
    api_url: string;
    organization?: string;
  };
  watched_repos: Array<{
    owner: string;
    repo: string;
    notifications: boolean;
  }>;
  ui: {
    theme: string;
    language: string;
    window_size?: {
      width: number;
      height: number;
    };
    window_position?: {
      x: number;
      y: number;
    };
  };
  auto_refresh_interval: number;
  max_repos_per_org: number;
}

/**
 * Get current configuration from backend
 */
export async function getConfiguration(): Promise<AppConfig> {
  try {
    const baseUrl = await getApiBaseUrl();
    const response = await fetch(`${baseUrl}/api/config`);
    if (!response.ok) {
      throw new Error('Failed to load configuration');
    }
    return await response.json();
  } catch (error) {
    console.error('Error loading configuration:', error);
    // Return default configuration
    return {
      github: {
        api_url: 'https://api.github.com',
      },
      watched_repos: [],
      ui: {
        theme: 'light',
        language: 'en',
      },
      auto_refresh_interval: 300,
      max_repos_per_org: 100,
    };
  }
}

/**
 * Alias for getConfiguration - used in some components
 */
export const getConfig = getConfiguration;

/**
 * Update GitHub configuration
 */
export async function updateGitHubConfig(
  token?: string,
  apiUrl?: string,
  organization?: string
): Promise<void> {
  const baseUrl = await getApiBaseUrl();
  const response = await fetch(`${baseUrl}/api/config/github`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      token,
      api_url: apiUrl,
      organization,
    }),
  });

  if (!response.ok) {
    throw new Error('Failed to update GitHub configuration');
  }
}

/**
 * Get watched repositories
 */
export async function getWatchedRepos() {
  const baseUrl = await getApiBaseUrl();
  const response = await fetch(`${baseUrl}/api/config/watched-repos`);
  if (!response.ok) {
    throw new Error('Failed to load watched repositories');
  }
  return await response.json();
}

/**
 * Add a repository to watch list
 */
export async function addWatchedRepo(owner: string, repo: string, notifications = true) {
  const baseUrl = await getApiBaseUrl();
  const response = await fetch(`${baseUrl}/api/config/watched-repos`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      owner,
      repo,
      notifications,
    }),
  });

  if (!response.ok) {
    throw new Error('Failed to add watched repository');
  }
}

/**
 * Remove a repository from watch list
 */
export async function removeWatchedRepo(owner: string, repo: string) {
  const baseUrl = await getApiBaseUrl();
  const response = await fetch(
    `${baseUrl}/api/config/watched-repos/${owner}/${repo}`,
    {
      method: 'DELETE',
    }
  );

  if (!response.ok) {
    throw new Error('Failed to remove watched repository');
  }
}

/**
 * Update UI configuration
 */
export async function updateUIConfig(config: {
  theme?: string;
  language?: string;
  window_size?: { width: number; height: number };
  window_position?: { x: number; y: number };
}) {
  const baseUrl = await getApiBaseUrl();
  const response = await fetch(`${baseUrl}/api/config/ui`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(config),
  });

  if (!response.ok) {
    throw new Error('Failed to update UI configuration');
  }
}

/**
 * Reset configuration to defaults
 */
export async function resetConfiguration() {
  const baseUrl = await getApiBaseUrl();
  const response = await fetch(`${baseUrl}/api/config/reset`, {
    method: 'POST',
  });

  if (!response.ok) {
    throw new Error('Failed to reset configuration');
  }
}

/**
 * Get configuration file path
 */
export async function getConfigPath(): Promise<{ config_file: string; config_directory: string }> {
  const baseUrl = await getApiBaseUrl();
  const response = await fetch(`${baseUrl}/api/config/path`);
  if (!response.ok) {
    throw new Error('Failed to get configuration path');
  }
  return await response.json();
}

/**
 * Get enabled/disabled repositories
 */
export async function getEnabledRepos(): Promise<Array<{ node_id: string; enabled: boolean }>> {
  const baseUrl = await getApiBaseUrl();
  const response = await fetch(`${baseUrl}/api/config/enabled-repos`);
  if (!response.ok) {
    throw new Error('Failed to get enabled repositories');
  }
  return await response.json();
}

/**
 * Update enabled/disabled repositories
 */
export async function updateEnabledRepos(enabledRepos: Array<{ node_id: string; enabled: boolean }>) {
  const baseUrl = await getApiBaseUrl();
  const response = await fetch(`${baseUrl}/api/config/enabled-repos`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ enabled_repos: enabledRepos }),
  });

  if (!response.ok) {
    throw new Error('Failed to update enabled repositories');
  }
}