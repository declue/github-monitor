import type { TreeNode } from '../types';
import type { SearchFilterState } from '../components/SearchFilter';

/**
 * Recursively filter tree nodes based on search criteria
 */
export const filterTreeNodes = (
  nodes: TreeNode[],
  filters: SearchFilterState
): TreeNode[] => {
  const { searchText, selectedTypes } = filters;

  // If no filters applied, return original data
  if (!searchText && selectedTypes.length === 0) {
    return nodes;
  }

  const filtered: TreeNode[] = [];

  for (const node of nodes) {
    // Check if this node matches the filters
    const matchesSearch = searchText
      ? matchesSearchText(node, searchText.toLowerCase())
      : true;

    const matchesType = selectedTypes.length > 0
      ? selectedTypes.includes(node.type)
      : true;

    // Filter children recursively
    const filteredChildren = node.children
      ? filterTreeNodes(node.children, filters)
      : [];

    // Include this node if:
    // 1. It matches the filters itself, OR
    // 2. Any of its children match
    if ((matchesSearch && matchesType) || filteredChildren.length > 0) {
      filtered.push({
        ...node,
        children: filteredChildren,
      });
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
