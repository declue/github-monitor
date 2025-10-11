import axios from 'axios';
import type { TreeNode, RateLimitInfo } from './types';
import { baseAPI } from 'pyloid-js';
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

const rpcUrl = await baseAPI.getServerUrl();


const api = axios.create({
  baseURL: rpcUrl,
});

export const fetchTree = async (orgs?: string[], token?: string, githubApiUrl?: string): Promise<TreeNode[]> => {
  const params = orgs && orgs.length > 0 ? { orgs: orgs.join(',') } : {};
  const headers = {
    ...(token && { 'X-GitHub-Token': token }),
    ...(githubApiUrl && { 'X-GitHub-API-URL': githubApiUrl }),
  };
  const response = await api.get<TreeNode[]>('/api/tree', { params, headers });
  return response.data;
};

export const fetchRateLimit = async (token?: string, githubApiUrl?: string): Promise<RateLimitInfo> => {
  const headers = {
    ...(token && { 'X-GitHub-Token': token }),
    ...(githubApiUrl && { 'X-GitHub-API-URL': githubApiUrl }),
  };
  const response = await api.get<RateLimitInfo>('/api/rate-limit', { headers });
  return response.data;
};

export const fetchRepoDetails = async (
  owner: string,
  repo: string,
  token?: string,
  githubApiUrl?: string
): Promise<TreeNode[]> => {
  console.log(`fetchRepoDetails called: ${owner}/${repo}, token: ${token ? 'present' : 'missing'}`);

  const headers = {
    ...(token && { 'X-GitHub-Token': token }),
    ...(githubApiUrl && { 'X-GitHub-API-URL': githubApiUrl }),
  };

  console.log('Request headers:', headers);

  try {
    const response = await api.get<TreeNode[]>(`/api/repo-details/${owner}/${repo}`, { headers });
    console.log(`API response for ${owner}/${repo}:`, response.data);
    console.log(`Response length: ${response.data.length}`);

    if (!response.data || response.data.length === 0) {
      console.warn(`Empty response for ${owner}/${repo}`);
    }

    return response.data;
  } catch (error) {
    console.error(`API error for ${owner}/${repo}:`, error);
    // Return empty array on error instead of throwing
    return [];
  }
};

// Notifications API

export interface NotificationItem {
  id: string;
  repository: {
    id: number;
    name: string;
    full_name: string;
    owner: {
      login: string;
      avatar_url: string;
    };
  };
  subject: {
    title: string;
    url: string;
    latest_comment_url: string;
    type: string;
  };
  reason: string;
  unread: boolean;
  updated_at: string;
  last_read_at: string | null;
  url: string;
}

export interface NotificationsResponse {
  notifications: NotificationItem[];
  pagination: {
    page: number;
    per_page: number;
    has_more: boolean;
  };
  rate_limit: RateLimitInfo;
}

export interface NotificationsCountResponse {
  unread_count: number;
  rate_limit: RateLimitInfo;
}

export const fetchNotifications = async (
  token?: string,
  githubApiUrl?: string,
  page: number = 1,
  per_page: number = 50,
  all: boolean = false
): Promise<NotificationsResponse> => {
  const headers = {
    ...(token && { 'X-GitHub-Token': token }),
    ...(githubApiUrl && { 'X-GitHub-API-URL': githubApiUrl }),
  };
  const params = {
    page,
    per_page,
    all
  };
  const response = await api.get<NotificationsResponse>('/api/notifications', { headers, params });
  return response.data;
};

export const fetchNotificationsCount = async (
  token?: string,
  githubApiUrl?: string
): Promise<NotificationsCountResponse> => {
  const headers = {
    ...(token && { 'X-GitHub-Token': token }),
    ...(githubApiUrl && { 'X-GitHub-API-URL': githubApiUrl }),
  };
  const response = await api.get<NotificationsCountResponse>('/api/notifications/count', { headers });
  return response.data;
};

export const markNotificationAsRead = async (
  threadId: string,
  token?: string,
  githubApiUrl?: string
): Promise<void> => {
  const headers = {
    ...(token && { 'X-GitHub-Token': token }),
    ...(githubApiUrl && { 'X-GitHub-API-URL': githubApiUrl }),
  };
  await api.patch(`/api/notifications/${threadId}/read`, {}, { headers });
};

export const markAllNotificationsAsRead = async (
  token?: string,
  githubApiUrl?: string
): Promise<void> => {
  const headers = {
    ...(token && { 'X-GitHub-Token': token }),
    ...(githubApiUrl && { 'X-GitHub-API-URL': githubApiUrl }),
  };
  await api.put('/api/notifications/mark-all-read', {}, { headers });
};

// Export Git API functions
export * from './api/git';
