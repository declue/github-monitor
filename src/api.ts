import axios from 'axios';
import type { TreeNode, RateLimitInfo } from './types';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

const api = axios.create({
  baseURL: API_BASE_URL,
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
  const headers = {
    ...(token && { 'X-GitHub-Token': token }),
    ...(githubApiUrl && { 'X-GitHub-API-URL': githubApiUrl }),
  };
  const response = await api.get<TreeNode[]>(`/api/repo-details/${owner}/${repo}`, { headers });
  return response.data;
};
