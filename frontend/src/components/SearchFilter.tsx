import { useState } from 'react';
import {
  Box,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  OutlinedInput,
  Chip,
  Paper,
  IconButton,
  Tooltip,
  CircularProgress,
} from '@mui/material';
import { Search as SearchIcon, Clear as ClearIcon } from '@mui/icons-material';
import type { SelectChangeEvent } from '@mui/material';

export interface SearchFilterState {
  searchText: string;
  selectedTypes: string[];
}

interface SearchFilterProps {
  onFilterChange: (filters: SearchFilterState) => Promise<void>;
}

const NODE_TYPES = [
  { value: 'workflow', label: 'Workflows' },
  { value: 'workflow_run', label: 'Workflow Runs' },
  { value: 'runner', label: 'Runners' },
  { value: 'branch', label: 'Branches' },
  { value: 'pull_request', label: 'Pull Requests' },
  { value: 'issue', label: 'Issues' },
];

export const SearchFilter: React.FC<SearchFilterProps> = ({ onFilterChange }) => {
  const [searchText, setSearchText] = useState('');
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const handleSearchChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    setSearchText(value);
    setLoading(true);
    try {
      await onFilterChange({ searchText: value, selectedTypes });
    } finally {
      setLoading(false);
    }
  };

  const handleTypeChange = async (event: SelectChangeEvent<string[]>) => {
    const value = event.target.value as string[];
    setSelectedTypes(value);
    setLoading(true);
    try {
      await onFilterChange({ searchText, selectedTypes: value });
    } finally {
      setLoading(false);
    }
  };

  const handleClear = async () => {
    setSearchText('');
    setSelectedTypes([]);
    setLoading(true);
    try {
      await onFilterChange({ searchText: '', selectedTypes: [] });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Paper elevation={2} sx={{ p: 2, mb: 3 }}>
      <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
        <TextField
          fullWidth
          label="Search"
          placeholder="Search by name, status, or metadata..."
          value={searchText}
          onChange={handleSearchChange}
          variant="outlined"
          size="small"
          disabled={loading}
          InputProps={{
            startAdornment: <SearchIcon sx={{ mr: 1, color: 'action.active' }} />,
          }}
          sx={{ flex: 2 }}
        />

        <FormControl size="small" sx={{ flex: 1, minWidth: 200 }} disabled={loading}>
          <InputLabel>Filter by Type</InputLabel>
          <Select
            multiple
            value={selectedTypes}
            onChange={handleTypeChange}
            input={<OutlinedInput label="Filter by Type" />}
            renderValue={(selected) => (
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                {selected.map((value) => {
                  const type = NODE_TYPES.find((t) => t.value === value);
                  return <Chip key={value} label={type?.label || value} size="small" />;
                })}
              </Box>
            )}
          >
            {NODE_TYPES.map((type) => (
              <MenuItem key={type.value} value={type.value}>
                {type.label}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        {loading ? (
          <CircularProgress size={24} />
        ) : (
          <Tooltip title="Clear filters">
            <IconButton
              onClick={handleClear}
              disabled={!searchText && selectedTypes.length === 0}
              color="primary"
            >
              <ClearIcon />
            </IconButton>
          </Tooltip>
        )}
      </Box>
    </Paper>
  );
};
