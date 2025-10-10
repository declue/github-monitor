import type { TreeNode } from '../types';
import type { SearchFilterState } from '../components/SearchFilter';

/**
 * Recursively filter tree nodes based on search criteria
 * Only searches within enabled nodes
 */
export const filterTreeNodes = (
  nodes: TreeNode[],
  filters: SearchFilterState,
  parentMatched: boolean = false
): TreeNode[] => {
  const { searchText, selectedTypes } = filters;

  // If no filters applied, return original data
  if (!searchText && selectedTypes.length === 0) {
    return nodes;
  }

  const filtered: TreeNode[] = [];

  for (const node of nodes) {
    // For organizations, always show them (even if unchecked) so users can see and select repos
    // For other nodes (repos, workflows, etc.), skip if disabled
    const isOrganization = node.type === 'organization';
    if (!isOrganization && node.enabled === false) {
      continue;
    }

    // Check if this node matches the filters
    const matchesSearch = searchText
      ? matchesSearchText(node, searchText.toLowerCase())
      : true;

    const matchesType = selectedTypes.length > 0
      ? selectedTypes.includes(node.type)
      : true;

    const currentNodeMatches = matchesSearch && matchesType;

    // If parent matched, include all children without filtering
    // This is natural tree search behavior - when parent matches, show all descendants
    // But still respect the enabled status
    if (parentMatched) {
      filtered.push({
        ...node,
        children: node.children || [],
      });
      continue;
    }

    const isRepository = node.type === 'repository';

    // For repositories: if checked, show them even if no search match
    // For organizations: always show if they have enabled repos
    if (isRepository) {
      // If repo matches search OR it's just enabled and we want to show it
      if (currentNodeMatches) {
        // Repo matches - show all its children
        filtered.push({
          ...node,
          children: node.children || [],
        });
      } else if (searchText || selectedTypes.length > 0) {
        // There's a search but repo doesn't match - don't show it
        continue;
      } else {
        // No search filter - show enabled repo with its children
        filtered.push({
          ...node,
          children: node.children || [],
        });
      }
    } else {
      // For other nodes (org, workflows, runners, etc.)
      // Filter children recursively
      const filteredChildren = node.children
        ? filterTreeNodes(node.children, filters, currentNodeMatches)
        : [];

      // Include this node if:
      // 1. It matches the filters itself, OR
      // 2. Any of its children match (to show the path to matching children)
      if (currentNodeMatches || filteredChildren.length > 0) {
        filtered.push({
          ...node,
          children: filteredChildren,
        });
      }
    }
  }

  return filtered;
};

/**
 * Check if a node matches the search text
 */
const matchesSearchText = (node: TreeNode, searchText: string): boolean => {
  // Search in name
  if (node.name.toLowerCase().includes(searchText)) {
    return true;
  }

  // Search in type
  if (node.type.toLowerCase().includes(searchText)) {
    return true;
  }

  // Search in status
  if (node.status && node.status.toLowerCase().includes(searchText)) {
    return true;
  }

  // Search in metadata values
  if (node.metadata) {
    const metadataValues = Object.values(node.metadata);
    if (metadataValues.some((val) => String(val).toLowerCase().includes(searchText))) {
      return true;
    }
  }

  return false;
};

/**
 * Filter tree to only include enabled nodes
 * If a repo is disabled, exclude it and all its children
 * If an org is disabled, exclude it entirely
 */
export const filterEnabledNodes = (nodes: TreeNode[]): TreeNode[] => {
  const filtered: TreeNode[] = [];

  for (const node of nodes) {
    // Skip disabled nodes (org or repo level)
    if (node.enabled === false) {
      continue;
    }

    // If node is enabled, include it with its enabled children
    if (node.children && node.children.length > 0) {
      const enabledChildren = filterEnabledNodes(node.children);
      filtered.push({
        ...node,
        children: enabledChildren,
      });
    } else {
      filtered.push(node);
    }
  }

  return filtered;
};

/**
 * Count total nodes in tree (including children)
 */
export const countTreeNodes = (nodes: TreeNode[]): number => {
  let count = 0;

  for (const node of nodes) {
    count += 1;
    if (node.children && node.children.length > 0) {
      count += countTreeNodes(node.children);
    }
  }

  return count;
};
