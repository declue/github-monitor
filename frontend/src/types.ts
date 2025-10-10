export interface TreeNode {
  id: string;
  name: string;
  type: string;
  status?: string;
  url?: string;
  children: TreeNode[];
  metadata: Record<string, any>;
}

export interface RateLimitInfo {
  limit: number;
  remaining: number;
  reset: number;
  used: number;
}
