export interface TreeNode {
  id: string;
  name: string;
  type: string;
  status?: string;
  url?: string;
  children: TreeNode[];
  metadata: Record<string, any>;
  hasChildren?: boolean;  // Indicates if node has children to load
  isLoaded?: boolean;     // Indicates if children are already loaded
}

export interface RateLimitInfo {
  limit: number;
  remaining: number;
  reset: number;
  used: number;
}
