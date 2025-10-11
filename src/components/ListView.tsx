import { useEffect, useState, useMemo } from 'react';
import {
  Box,
  Paper,
  Typography,
  Chip,
  Link,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  TextField,
  InputAdornment,
  TableSortLabel,
  FormControl,
  Select,
  MenuItem,
  IconButton,
  Popover,
} from '@mui/material';
import { Search as SearchIcon, FilterList as FilterListIcon } from '@mui/icons-material';
import type { TreeNode as TreeNodeType } from '../types';

type Order = 'asc' | 'desc';
type OrderBy = 'path' | 'name' | 'type' | 'status' | 'updated_at';

interface ColumnFilters {
  path: string[];
  name: string[];
  type: string[];
  status: string[];
}

interface ListViewProps {
  data: TreeNodeType[];
  filteredData?: TreeNodeType[];
  selectedRepository?: TreeNodeType | null;
}

interface FlatNode {
  id: string;
  name: string;
  type: string;
  status?: string;
  url?: string;
  metadata: Record<string, any>;
  path: string; // Full path from root
  updated_at?: string; // Last updated timestamp
  created_at?: string; // Created timestamp
}

const getStatusColor = (status?: string) => {
  if (!status) return 'default';

  switch (status.toLowerCase()) {
    case 'success':
    case 'completed':
    case 'active':
    case 'open':
      return 'success';
    case 'failure':
    case 'failed':
    case 'cancelled':
      return 'error';
    case 'closed':
      return 'default';
    case 'in_progress':
    case 'queued':
    case 'pending':
      return 'warning';
    default:
      return 'info';
  }
};

const formatTimestamp = (timestamp?: string): string => {
  if (!timestamp) return '-';

  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  // Show relative time for recent items
  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;

  // Show formatted date for older items
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
  });
};

const flattenTree = (nodes: TreeNodeType[], parentPath = ''): FlatNode[] => {
  const result: FlatNode[] = [];

  // Container types that should be excluded from ListView
  const containerTypes = [
    'organization',
    'repository',
    'workflows',
    'workflow_runs',
    'runners',
    'branches',
    'pull_requests',
    'issues',
  ];

  for (const node of nodes) {
    const path = parentPath ? `${parentPath} / ${node.name}` : node.name;

    // Only show actual individual items (workflow, runner, issue, etc.)
    // Exclude organizations, repositories, and container nodes
    const shouldExclude = containerTypes.includes(node.type);

    if (!shouldExclude) {
      result.push({
        id: node.id,
        name: node.name,
        type: node.type,
        status: node.status,
        url: node.url,
        metadata: node.metadata,
        path,
        updated_at: node.metadata?.updated_at,
        created_at: node.metadata?.created_at,
      });
    }

    // Continue traversing children
    if (node.children && node.children.length > 0) {
      result.push(...flattenTree(node.children, path));
    }
  }

  return result;
};

export const ListView: React.FC<ListViewProps> = ({ data, filteredData, selectedRepository }) => {
  const [flatData, setFlatData] = useState<FlatNode[]>([]);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [searchText, setSearchText] = useState('');
  const [order, setOrder] = useState<Order>('asc');
  const [orderBy, setOrderBy] = useState<OrderBy>('path');
  const [columnFilters, setColumnFilters] = useState<ColumnFilters>({
    path: [],
    name: [],
    type: [],
    status: [],
  });
  const [filterAnchorEl, setFilterAnchorEl] = useState<{
    [key: string]: HTMLElement | null;
  }>({});

  useEffect(() => {
    // If a repository is selected, show only its children
    if (selectedRepository && selectedRepository.children && selectedRepository.children.length > 0) {
      console.log('ListView: Showing selected repository children:', selectedRepository.name, selectedRepository.children.length);
      const flattened = flattenTree(selectedRepository.children, selectedRepository.name);
      setFlatData(flattened);
    } else {
      // Otherwise show all data
      const dataToFlatten = filteredData || data;
      const flattened = flattenTree(dataToFlatten);
      setFlatData(flattened);
    }
    setPage(0); // Reset to first page when data changes
  }, [data, filteredData, selectedRepository]);

  // Extract unique values for each column
  const uniqueValues = useMemo(() => {
    return {
      path: Array.from(new Set(flatData.map((item) => item.path).filter(Boolean))).sort(),
      name: Array.from(new Set(flatData.map((item) => item.name).filter(Boolean))).sort(),
      type: Array.from(new Set(flatData.map((item) => item.type).filter(Boolean))).sort(),
      status: Array.from(
        new Set(flatData.map((item) => item.status).filter(Boolean))
      ).sort(),
    };
  }, [flatData]);

  const handleChangePage = (_event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchText(event.target.value);
    setPage(0);
  };

  const handleRequestSort = (property: OrderBy) => {
    const isAsc = orderBy === property && order === 'asc';
    setOrder(isAsc ? 'desc' : 'asc');
    setOrderBy(property);
    setPage(0);
  };

  const compareValues = (a: any, b: any, orderBy: OrderBy): number => {
    let aValue = a[orderBy];
    let bValue = b[orderBy];

    // Handle timestamp sorting
    if (orderBy === 'updated_at') {
      // Convert timestamps to numbers for comparison
      const aTime = aValue ? new Date(aValue).getTime() : 0;
      const bTime = bValue ? new Date(bValue).getTime() : 0;
      if (aTime < bTime) return -1;
      if (aTime > bTime) return 1;
      return 0;
    }

    // Handle empty values
    if (!aValue) aValue = '';
    if (!bValue) bValue = '';

    if (typeof aValue === 'string' && typeof bValue === 'string') {
      return aValue.localeCompare(bValue);
    }

    if (aValue < bValue) return -1;
    if (aValue > bValue) return 1;
    return 0;
  };

  const sortData = (data: FlatNode[], order: Order, orderBy: OrderBy): FlatNode[] => {
    return [...data].sort((a, b) => {
      const comparison = compareValues(a, b, orderBy);
      return order === 'asc' ? comparison : -comparison;
    });
  };

  const handleFilterClick = (event: React.MouseEvent<HTMLElement>, column: keyof ColumnFilters) => {
    setFilterAnchorEl((prev) => ({ ...prev, [column]: event.currentTarget }));
  };

  const handleFilterClose = (column: keyof ColumnFilters) => {
    setFilterAnchorEl((prev) => ({ ...prev, [column]: null }));
  };

  const handleFilterChange = (column: keyof ColumnFilters, values: string[]) => {
    setColumnFilters((prev) => ({ ...prev, [column]: values }));
    setPage(0);
  };

  const handleClearFilter = (column: keyof ColumnFilters) => {
    setColumnFilters((prev) => ({ ...prev, [column]: [] }));
    setPage(0);
  };

  // Apply column filters
  const columnFilteredData = useMemo(() => {
    return flatData.filter((item) => {
      // Check path filter
      if (columnFilters.path.length > 0 && !columnFilters.path.includes(item.path)) {
        return false;
      }
      // Check name filter
      if (columnFilters.name.length > 0 && !columnFilters.name.includes(item.name)) {
        return false;
      }
      // Check type filter
      if (columnFilters.type.length > 0 && !columnFilters.type.includes(item.type)) {
        return false;
      }
      // Check status filter
      if (
        columnFilters.status.length > 0 &&
        (!item.status || !columnFilters.status.includes(item.status))
      ) {
        return false;
      }
      return true;
    });
  }, [flatData, columnFilters]);

  // Filter by local search text (in addition to column filters)
  const localFilteredData = searchText
    ? columnFilteredData.filter(
        (item) =>
          item.name.toLowerCase().includes(searchText.toLowerCase()) ||
          item.type.toLowerCase().includes(searchText.toLowerCase()) ||
          item.path.toLowerCase().includes(searchText.toLowerCase()) ||
          (item.status && item.status.toLowerCase().includes(searchText.toLowerCase())) ||
          Object.values(item.metadata).some((val) =>
            String(val).toLowerCase().includes(searchText.toLowerCase())
          )
      )
    : columnFilteredData;

  // Sort data
  const sortedData = sortData(localFilteredData, order, orderBy);

  // Paginate sorted data
  const paginatedData = sortedData.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage
  );

  const renderColumnFilter = (column: keyof ColumnFilters, label: string) => {
    const open = Boolean(filterAnchorEl[column]);
    const hasActiveFilter = columnFilters[column].length > 0;

    return (
      <>
        <IconButton
          size="small"
          onClick={(e) => handleFilterClick(e, column)}
          color={hasActiveFilter ? 'primary' : 'default'}
          sx={{ ml: 0.5 }}
        >
          <FilterListIcon fontSize="small" />
        </IconButton>
        <Popover
          open={open}
          anchorEl={filterAnchorEl[column]}
          onClose={() => handleFilterClose(column)}
          anchorOrigin={{
            vertical: 'bottom',
            horizontal: 'left',
          }}
        >
          <Box sx={{ p: 2, minWidth: 200, maxWidth: 300 }}>
            <Typography variant="subtitle2" gutterBottom>
              Filter {label}
            </Typography>
            <FormControl fullWidth size="small" sx={{ mt: 1 }}>
              <Select
                multiple
                value={columnFilters[column]}
                onChange={(e) =>
                  handleFilterChange(column, e.target.value as string[])
                }
                renderValue={(selected) => `${selected.length} selected`}
                displayEmpty
              >
                {uniqueValues[column].length === 0 ? (
                  <MenuItem disabled>No values available</MenuItem>
                ) : (
                  uniqueValues[column].map((value) => {
                    const stringValue = String(value);
                    return (
                      <MenuItem key={stringValue} value={stringValue}>
                        <Box
                          component="span"
                          sx={{
                            display: 'inline-block',
                            width: 16,
                            height: 16,
                            mr: 1,
                            border: '1px solid',
                            borderColor: columnFilters[column].includes(stringValue)
                              ? 'primary.main'
                              : 'grey.400',
                            bgcolor: columnFilters[column].includes(stringValue)
                              ? 'primary.main'
                              : 'transparent',
                          }}
                        />
                        {stringValue}
                      </MenuItem>
                    );
                  })
                )}
              </Select>
            </FormControl>
            <Box sx={{ mt: 2, display: 'flex', gap: 1 }}>
              <Typography
                variant="caption"
                sx={{ cursor: 'pointer', color: 'primary.main' }}
                onClick={() => handleClearFilter(column)}
              >
                Clear
              </Typography>
              <Typography
                variant="caption"
                sx={{ cursor: 'pointer', color: 'primary.main', ml: 'auto' }}
                onClick={() => handleFilterClose(column)}
              >
                Close
              </Typography>
            </Box>
          </Box>
        </Popover>
      </>
    );
  };

  return (
    <Paper elevation={2} sx={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <Box sx={{ p: 1, borderBottom: 1, borderColor: 'divider', flexShrink: 0 }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 'medium', mb: 1 }}>
          {selectedRepository ? (
            <>
              List View - {selectedRepository.name} ({localFilteredData.length} items)
            </>
          ) : (
            <>
              List View ({localFilteredData.length} items)
            </>
          )}
        </Typography>
        <TextField
          fullWidth
          size="small"
          placeholder="Search in current view..."
          value={searchText}
          onChange={handleSearchChange}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
          }}
        />
      </Box>

      <TableContainer sx={{ flexGrow: 1, overflow: 'auto', minHeight: 0 }}>
        <Table stickyHeader size="small">
          <TableHead>
            <TableRow>
              <TableCell>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <TableSortLabel
                    active={orderBy === 'path'}
                    direction={orderBy === 'path' ? order : 'asc'}
                    onClick={() => handleRequestSort('path')}
                  >
                    Path
                  </TableSortLabel>
                  {renderColumnFilter('path', 'Path')}
                </Box>
              </TableCell>
              <TableCell>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <TableSortLabel
                    active={orderBy === 'name'}
                    direction={orderBy === 'name' ? order : 'asc'}
                    onClick={() => handleRequestSort('name')}
                  >
                    Name
                  </TableSortLabel>
                  {renderColumnFilter('name', 'Name')}
                </Box>
              </TableCell>
              <TableCell>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <TableSortLabel
                    active={orderBy === 'type'}
                    direction={orderBy === 'type' ? order : 'asc'}
                    onClick={() => handleRequestSort('type')}
                  >
                    Type
                  </TableSortLabel>
                  {renderColumnFilter('type', 'Type')}
                </Box>
              </TableCell>
              <TableCell>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <TableSortLabel
                    active={orderBy === 'status'}
                    direction={orderBy === 'status' ? order : 'asc'}
                    onClick={() => handleRequestSort('status')}
                  >
                    Status
                  </TableSortLabel>
                  {renderColumnFilter('status', 'Status')}
                </Box>
              </TableCell>
              <TableCell>
                <TableSortLabel
                  active={orderBy === 'updated_at'}
                  direction={orderBy === 'updated_at' ? order : 'desc'}
                  onClick={() => handleRequestSort('updated_at')}
                >
                  Last Updated
                </TableSortLabel>
              </TableCell>
              <TableCell>Metadata</TableCell>
              <TableCell>Link</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {paginatedData.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} align="center">
                  <Typography variant="body2" color="text.secondary" sx={{ py: 3 }}>
                    No items to display
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              paginatedData.map((item) => (
                <TableRow key={item.id} hover>
                  <TableCell>
                    <Typography variant="caption" color="text.secondary">
                      {item.path}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">{item.name}</Typography>
                  </TableCell>
                  <TableCell>
                    <Chip label={item.type} size="small" variant="outlined" />
                  </TableCell>
                  <TableCell>
                    {item.status && (
                      <Chip
                        label={item.status}
                        size="small"
                        color={getStatusColor(item.status) as any}
                      />
                    )}
                  </TableCell>
                  <TableCell>
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      title={item.updated_at || item.created_at || ''}
                    >
                      {formatTimestamp(item.updated_at || item.created_at)}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                      {item.metadata.language && (
                        <Chip
                          label={item.metadata.language}
                          size="small"
                          variant="outlined"
                        />
                      )}
                      {item.metadata.private && (
                        <Chip label="Private" size="small" color="warning" />
                      )}
                      {item.metadata.stars > 0 && (
                        <Chip label={`⭐ ${item.metadata.stars}`} size="small" />
                      )}
                    </Box>
                  </TableCell>
                  <TableCell>
                    {item.url && (
                      <Link
                        href={item.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        underline="hover"
                      >
                        View
                      </Link>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <TablePagination
        rowsPerPageOptions={[10, 25, 50, 100]}
        component="div"
        count={sortedData.length}
        rowsPerPage={rowsPerPage}
        page={page}
        onPageChange={handleChangePage}
        onRowsPerPageChange={handleChangeRowsPerPage}
        sx={{ flexShrink: 0, borderTop: 1, borderColor: 'divider' }}
      />
    </Paper>
  );
};
