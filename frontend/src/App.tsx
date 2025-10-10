import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Box,
  Container,
  AppBar,
  Toolbar,
  Typography,
  CssBaseline,
  ThemeProvider,
  createTheme,
  Paper,
  CircularProgress,
  Alert,
  IconButton,
  Tooltip,
} from '@mui/material';
import { Refresh, GitHub, Settings as SettingsIcon } from '@mui/icons-material';
import { TreeView } from './components/TreeView';
import { RateLimitDisplay } from './components/RateLimitDisplay';
import { SettingsDialog } from './components/SettingsDialog';
import { SearchFilter, type SearchFilterState } from './components/SearchFilter';
import { ListView } from './components/ListView';
import { fetchTree, fetchRateLimit, fetchRepoDetails } from './api';
import type { TreeNode, RateLimitInfo } from './types';
import { loadSettings, saveSettings } from './utils/storage';
import { filterTreeNodes, countTreeNodes } from './utils/filterTree';

const darkTheme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#90caf9',
    },
    secondary: {
      main: '#f48fb1',
    },
    background: {
      default: '#0a1929',
      paper: '#1e293b',
    },
  },
  typography: {
    fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
  },
  components: {
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
        },
      },
    },
  },
});

function App() {
  const [treeData, setTreeData] = useState<TreeNode[]>([]);
  const [filteredTreeData, setFilteredTreeData] = useState<TreeNode[]>([]);
  const [rateLimit, setRateLimit] = useState<RateLimitInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [token, setToken] = useState('');
  const [orgs, setOrgs] = useState<string[]>([]);
  const [githubApiUrl, setGithubApiUrl] = useState('https://api.github.com');

  // Cache for repository details to avoid redundant API calls
  const repoDetailsCache = useRef<Map<string, TreeNode[]>>(new Map());

  const loadData = async () => {
    if (!token) {
      setError('Please configure your GitHub token in settings');
      setLoading(false);
      setSettingsOpen(true);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const [tree, rate] = await Promise.all([
        fetchTree(orgs, token, githubApiUrl),
        fetchRateLimit(token, githubApiUrl),
      ]);

      setTreeData(tree);
      setFilteredTreeData(tree); // Initialize filtered data
      setRateLimit(rate);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data');
      console.error('Error loading data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = useCallback(async (newFilters: SearchFilterState) => {
    const { searchText, selectedTypes } = newFilters;

    // If filters are applied and we need to search in lazy-loaded children (like runners, workflows, etc.)
    const needsDeepSearch = selectedTypes.length > 0 || searchText.trim().length > 0;

    if (needsDeepSearch) {
      // Auto-expand all repositories to load their children for filtering
      const expandedData = await expandAllRepositories(treeData);
      const filtered = filterTreeNodes(expandedData, newFilters);
      setFilteredTreeData(filtered);
    } else {
      // No filters, just show original data
      setFilteredTreeData(treeData);
    }
  }, [treeData]);

  const handleSaveSettings = (newToken: string, newOrgs: string[], newGithubApiUrl: string) => {
    setToken(newToken);
    setOrgs(newOrgs);
    setGithubApiUrl(newGithubApiUrl);
    saveSettings({ token: newToken, orgs: newOrgs, githubApiUrl: newGithubApiUrl });
    // Clear cache when settings change
    repoDetailsCache.current.clear();
  };

  const handleLoadChildren = useCallback(async (node: TreeNode): Promise<TreeNode[]> => {
    // Only handle repository nodes for lazy loading
    if (node.type !== 'repository') {
      return node.children || [];
    }

    const owner = node.metadata?.owner;
    const repo = node.name;

    if (!owner || !repo) {
      console.error('Missing owner or repo name for node:', node);
      return [];
    }

    const cacheKey = `${owner}/${repo}`;

    // Check cache first
    if (repoDetailsCache.current.has(cacheKey)) {
      return repoDetailsCache.current.get(cacheKey)!;
    }

    try {
      const children = await fetchRepoDetails(owner, repo, token, githubApiUrl);
      // Cache the result
      repoDetailsCache.current.set(cacheKey, children);
      return children;
    } catch (error) {
      console.error(`Failed to load details for ${owner}/${repo}:`, error);
      return [];
    }
  }, [token, githubApiUrl]);

  const expandAllRepositories = useCallback(async (nodes: TreeNode[]): Promise<TreeNode[]> => {
    const expandedNodes: TreeNode[] = [];

    for (const node of nodes) {
      if (node.type === 'repository' && !node.isLoaded && node.hasChildren) {
        // Load repository details
        const children = await handleLoadChildren(node);
        expandedNodes.push({
          ...node,
          children,
          isLoaded: true,
        });
      } else if (node.children && node.children.length > 0) {
        // Recursively expand children
        const expandedChildren = await expandAllRepositories(node.children);
        expandedNodes.push({
          ...node,
          children: expandedChildren,
        });
      } else {
        expandedNodes.push(node);
      }
    }

    return expandedNodes;
  }, [handleLoadChildren]);

  useEffect(() => {
    // Load settings from localStorage
    const settings = loadSettings();
    if (settings) {
      setToken(settings.token);
      setOrgs(settings.orgs);
      setGithubApiUrl(settings.githubApiUrl || 'https://api.github.com');
    } else {
      setLoading(false);
      setSettingsOpen(true);
    }
  }, []);

  useEffect(() => {
    if (token) {
      loadData();

      // Refresh rate limit every 30 seconds
      const interval = setInterval(() => {
        if (token) {
          fetchRateLimit(token, githubApiUrl).then(setRateLimit).catch(console.error);
        }
      }, 30000);

      return () => clearInterval(interval);
    }
  }, [token, orgs, githubApiUrl]);

  return (
    <ThemeProvider theme={darkTheme}>
      <CssBaseline />
      <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
        <AppBar position="static" elevation={0}>
          <Toolbar>
            <GitHub sx={{ mr: 2 }} />
            <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
              GitHub Repository Explorer
            </Typography>

            {rateLimit && <RateLimitDisplay rateLimit={rateLimit} />}

            <Tooltip title="Settings">
              <IconButton
                color="inherit"
                onClick={() => setSettingsOpen(true)}
                sx={{ ml: 2 }}
              >
                <SettingsIcon />
              </IconButton>
            </Tooltip>

            <Tooltip title="Refresh data">
              <IconButton
                color="inherit"
                onClick={loadData}
                disabled={loading || !token}
                sx={{ ml: 1 }}
              >
                <Refresh />
              </IconButton>
            </Tooltip>
          </Toolbar>
        </AppBar>

        <Container maxWidth={false} sx={{ mt: 4, mb: 4, flexGrow: 1, px: 3 }}>
          {loading && (
            <Box
              sx={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                minHeight: 400,
              }}
            >
              <CircularProgress />
            </Box>
          )}

          {error && (
            <Alert
              severity="error"
              sx={{ mb: 2 }}
              action={
                !token && (
                  <IconButton
                    color="inherit"
                    size="small"
                    onClick={() => setSettingsOpen(true)}
                  >
                    <SettingsIcon />
                  </IconButton>
                )
              }
            >
              {error}
            </Alert>
          )}

          {!loading && !error && treeData.length === 0 && (
            <Alert severity="info">
              No repositories found. Make sure your GitHub token is configured correctly.
            </Alert>
          )}

          {!loading && !error && treeData.length > 0 && (
            <>
              <SearchFilter onFilterChange={handleFilterChange} />

              <Box sx={{ display: 'flex', gap: 2, height: 'calc(100vh - 280px)' }}>
                {/* Left side: Tree View */}
                <Paper
                  elevation={2}
                  sx={{
                    flex: '0 0 40%',
                    p: 2,
                    overflow: 'auto',
                    bgcolor: 'background.paper',
                    borderRadius: 2,
                  }}
                >
                  <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="h6">
                      Tree View ({countTreeNodes(filteredTreeData)} items)
                    </Typography>
                  </Box>
                  <TreeView data={filteredTreeData} onLoadChildren={handleLoadChildren} />
                </Paper>

                {/* Right side: List View */}
                <Box sx={{ flex: '1 1 60%' }}>
                  <ListView data={treeData} filteredData={filteredTreeData} />
                </Box>
              </Box>
            </>
          )}
        </Container>

        <Box
          component="footer"
          sx={{
            py: 2,
            px: 2,
            mt: 'auto',
            backgroundColor: 'background.paper',
            textAlign: 'center',
          }}
        >
          <Typography variant="body2" color="text.secondary">
            GitHub Repository Explorer - Monitor your development status at a glance
          </Typography>
        </Box>
      </Box>

      <SettingsDialog
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        onSave={handleSaveSettings}
        currentToken={token}
        currentOrgs={orgs}
        currentGithubApiUrl={githubApiUrl}
      />
    </ThemeProvider>
  );
}

export default App;
